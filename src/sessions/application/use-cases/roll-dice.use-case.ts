import { Inject, Injectable, Optional } from '@nestjs/common';
import { SessionRepositoryPort } from 'src/sessions/ports';
import { DiceClientPort } from 'src/sessions/ports/dice-client.port';
import { PossibleMoveCalculatorUseCase } from './possible-move-calculator.use-case';
import {
  DiceAlreadyRolledError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
} from './errors';
import { DiceRollResultType } from './types/dice-roll-result.type';
import { SessionEventsService } from '../services';

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
      diceRolledThisTurn: !turnForfeit,
      consecutiveSixes,
    });

    if (!hasMoves || turnForfeit) {
      await this.sessionRepository.passTurn(sessionId, playerId);
    }

    // Nach allen DB-Updates fetchen — damit currentPlayerId bereits den neuen Spieler enthält
    const updatedGameState =
      await this.sessionRepository.findGameStateById(sessionId);

    if (!updatedGameState) {
      throw new SessionNotFoundError();
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
      possibleMoves,
      hasMoves,
      rollAgain,
      consecutiveSixes,
      turnForfeit,
      gameState: updatedGameState,
    };
  }
}
