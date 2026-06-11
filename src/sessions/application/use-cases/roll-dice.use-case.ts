import { Injectable, Inject } from '@nestjs/common';
import { SessionRepositoryPort } from 'src/sessions/ports';
import { DiceClientPort } from 'src/sessions/ports/dice-client.port';
import { PossibleMoveCalculatorUseCase } from './possible-move-calculator.use-case';
import { NotYourTurnError } from './errors/not-your-turn.error';
import { DiceAlreadyRolledError } from './errors/dice-already-rolled.error';
import { DiceRollResultType } from './types/dice-roll-result.type';
import { SessionNotFoundError } from './errors';
import { InvalidSessionStatusError } from './errors';
@Injectable()
export class RollDiceUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
    @Inject(DiceClientPort)
    private readonly diceClient: DiceClientPort,
    private readonly possibleMoveCalculator: PossibleMoveCalculatorUseCase,
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
    if (consecutiveSixes === 6) {
      await this.sessionRepository.updateAfterDiceRoll(sessionId, {
        lastDiceValue: value,
        diceRolledThisTurn: false,
        consecutiveSixes,
      });
    } else {
      await this.sessionRepository.updateAfterDiceRoll(sessionId, {
        lastDiceValue: value,
        diceRolledThisTurn: true,
        consecutiveSixes,
      });
    }

    if (!hasMoves || turnForfeit) {
      await this.sessionRepository.passTurn(sessionId, playerId);
    }

    const updatedGameState =
      await this.sessionRepository.findGameStateById(sessionId);

    if (!updatedGameState) {
      throw new SessionNotFoundError();
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
