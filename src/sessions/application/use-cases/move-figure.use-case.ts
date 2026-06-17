import { MoveFigureRequestDto } from '../dtos';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { LudoEngine, MoveResult } from '../../domain';
import { GameStateCacheService } from '../services/game-state-cache.service';
import {
  DiceNotRolledError,
  InvalidMoveError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
} from './errors';
import { MoveFigureResultType } from './types/move-figure-result.type';
import { SessionEventsService } from '../services';

@Injectable()
export class MoveFigureUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly cache: GameStateCacheService,
    private readonly ludoEngine: LudoEngine,
    @Optional()
    private readonly sessionEvents?: SessionEventsService,
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

    let result: MoveResult;
    try {
      result = this.ludoEngine.applyMove(
        gameState,
        request.figureId,
        gameState.lastDiceValue,
      );
    } catch {
      throw new InvalidMoveError();
    }
    if (result.toPosition !== request.toPosition) {
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

    this.cache.set(sessionId, updatedGameState).catch(() => {});

    this.sessionEvents?.emit(sessionId, 'move_executed', {
      outcome: result.outcome,
      figureId: result.figureId,
      fromPosition: result.fromPosition,
      toPosition: result.toPosition,
    });

    if (
      updatedGameState.currentPlayerId !== gameState.currentPlayerId ||
      updatedGameState.turnNumber !== gameState.turnNumber
    ) {
      this.sessionEvents?.emit(sessionId, 'turn_changed', {
        currentPlayerId: updatedGameState.currentPlayerId,
        turnNumber: updatedGameState.turnNumber,
      });
    }

    if (result.outcome === 'GAME_WON') {
      this.sessionEvents?.emit(sessionId, 'game_ended', {
        winnerId: updatedGameState.winnerId,
        finishedAt: updatedGameState.lastUpdatedAt,
      });
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
