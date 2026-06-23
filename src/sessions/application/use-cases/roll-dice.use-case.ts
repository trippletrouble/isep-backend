import { Inject, Injectable, Optional } from '@nestjs/common';
import { SessionRepositoryPort } from 'src/sessions/ports';
import { DiceClientPort } from 'src/sessions/ports/dice-client.port';
import { LudoEngine } from '../../domain';
import { GameStateCacheService } from '../services/game-state-cache.service';
import {
  DiceAlreadyRolledError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
} from './errors';
import { DiceRollResultType } from './types/dice-roll-result.type';
import { SessionEventsService } from '../services';
import { PossibleMoveCalculatorUseCase } from './possible-move-calculator.use-case';

@Injectable()
export class RollDiceUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
    @Inject(DiceClientPort)
    private readonly diceClient: DiceClientPort,
    private readonly possibleMoveCalculator: PossibleMoveCalculatorUseCase,
    @Optional()
    private readonly sessionEvents?: SessionEventsService,
    private readonly cache: GameStateCacheService,
    private readonly ludoEngine: LudoEngine,
  ) {}

  async execute(
    sessionId: string,
    playerId: string,
  ): Promise<DiceRollResultType> {
    const gameState = await this.sessionRepository.findGameStateById(sessionId);

    if (!gameState) {
      throw new SessionNotFoundError();
    }

    if (gameState.status !== 'IN_PROGRESS') {
      throw new InvalidSessionStatusError();
    }

    if (gameState.currentPlayerId !== playerId) {
      throw new NotYourTurnError();
    }

    if (gameState.diceRolledThisTurn) {
      throw new DiceAlreadyRolledError();
    }

    const value = await this.diceClient.roll();
    const result = this.ludoEngine.handleRoll(gameState, value);

    const consecutiveSixes = value === 6 ? gameState.consecutiveSixes + 1 : 0;
    const possibleMoves = this.possibleMoveCalculator.calculate(
      gameState,
      playerId,
      value,
    );
    const hasMoves = possibleMoves.length > 0;
    const turnForfeit = consecutiveSixes >= 3;
    const rollAgain = value === 6 && !turnForfeit && hasMoves;

    await this.sessionRepository.updateAfterDiceRoll(sessionId, {
      lastDiceValue: value,
      diceRolledThisTurn: !result.turnForfeit,
      consecutiveSixes: result.consecutiveSixes,
    });

    if (!result.hasMoves || result.turnForfeit) {
      await this.sessionRepository.passTurn(sessionId, playerId);
    }

    // Nach allen DB-Updates fetchen — damit currentPlayerId bereits den neuen Spieler enthält
    const updatedGameState =
      await this.sessionRepository.findGameStateById(sessionId);

    if (!updatedGameState) {
      throw new SessionNotFoundError();
    }

    this.cache.set(sessionId, updatedGameState).catch(() => {});

    this.sessionEvents?.emit(sessionId, 'dice_rolled', {
      value,
      playerId,
      hasMoves: result.hasMoves,
      rollAgain: result.rollAgain,
      consecutiveSixes: result.consecutiveSixes,
      turnForfeit: result.turnForfeit,
    });

    if (!result.hasMoves || result.turnForfeit) {
      this.sessionEvents?.emit(sessionId, 'turn_changed', {
        currentPlayerId: updatedGameState.currentPlayerId,
        turnNumber: updatedGameState.turnNumber,
      });
    }

    if (!hasMoves || turnForfeit) {
      this.sessionEvents?.emit(sessionId, 'turn_changed', {
        currentPlayerId: updatedGameState.currentPlayerId,
        turnNumber: updatedGameState.turnNumber,
      });
    }

    return {
      value,
      playerId,
      possibleMoves: result.possibleMoves,
      hasMoves: result.hasMoves,
      rollAgain: result.rollAgain,
      consecutiveSixes: result.consecutiveSixes,
      turnForfeit: result.turnForfeit,
      gameState: updatedGameState,
    };
  }
}
