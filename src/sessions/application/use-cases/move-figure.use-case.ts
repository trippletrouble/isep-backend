import { Inject, Injectable } from '@nestjs/common';
import { MoveFigureRequestDto } from '../dtos/move-figure-request.dto';
import { SessionRepositoryPort } from '../../ports';
import { LudoEngine } from '../../domain';
import {
  DiceNotRolledError,
  InvalidMoveError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
} from './errors';
import {
  MoveFigureResultType,
} from './types/move-figure-result.type';

@Injectable()
export class MoveFigureUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly ludoEngine: LudoEngine,
  ) {}

  async execute(
    sessionId: string,
    userId: string,
    request: MoveFigureRequestDto,
  ): Promise<MoveFigureResultType> {
    const gameState = await this.sessionRepository.findGameStateById(sessionId);
    if (!gameState) {
      throw new SessionNotFoundError();
    }

    if (gameState.status !== 'IN_PROGRESS') {
      throw new InvalidSessionStatusError();
    }

    if (gameState.currentPlayerId !== userId) {
      throw new NotYourTurnError();
    }

    if (!gameState.diceRolledThisTurn || gameState.lastDiceValue === null) {
      throw new DiceNotRolledError();
    }

    let result;
    try {
      result = this.ludoEngine.applyMove(
        gameState,
        request.figureId,
        gameState.lastDiceValue,
      );
      if (result.toPosition !== request.toPosition) {
        throw new InvalidMoveError();
      }
    } catch (error) {
      throw new InvalidMoveError();
    }

    await this.sessionRepository.applyMove({
      sessionId,
      userId,
      figureId: result.figureId,
      fromPosition: result.fromPosition,
      toPosition: result.toPosition,
      diceValue: gameState.lastDiceValue,
      capturedFigureId: result.capturedFigureId,
      outcome: result.outcome,
      rollAgain: result.rollAgain,
      turnForfeit: result.turnForfeit,
    });

    const updatedGameState =
      await this.sessionRepository.findGameStateById(sessionId);

    if (!updatedGameState) {
      throw new SessionNotFoundError();
    }

    return {
      figureId: result.figureId,
      fromPosition: result.fromPosition,
      toPosition: result.toPosition,
      outcome: result.outcome,
      capturedFigureId: result.capturedFigureId,
      rollAgain: result.rollAgain,
      turnForfeit: result.turnForfeit,
      gameState: updatedGameState,
    };
  }
}
