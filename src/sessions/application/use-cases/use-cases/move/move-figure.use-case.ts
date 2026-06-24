import { MoveFigureRequestDto } from '../../../dtos';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { SessionRepositoryPort } from '../../../../ports';
import { PossibleMoveCalculatorUseCase } from './possible-move-calculator.use-case';
import {
  LudoEngine,
  MoveResult,
  isFinalGoalPosition,
} from '../../../../domain';
import { GameStateCacheService } from '../../../services';
import {
  DiceNotRolledError,
  InvalidMoveError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
} from '../../errors';
import { MoveFigureResultType } from '../../types';
import { SessionEventsService } from '../../../services';
import { MoveOutcomeType } from '@common';

@Injectable()
export class MoveFigureUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly cache: GameStateCacheService,
    private readonly ludoEngine: LudoEngine,
    private readonly possibleMoveCalculator: PossibleMoveCalculatorUseCase,
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

    const possibleMoves = this.possibleMoveCalculator.calculate(
      gameState,
      userId,
      gameState.lastDiceValue,
    );
    const selectedMove = possibleMoves.find(
      (move) =>
        move.figureId === request.figureId &&
        move.toPosition === request.toPosition,
    );

    if (!selectedMove) {
      throw new InvalidMoveError();
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

    // Alle Clients mit vollem GameState versorgen — Figurenpositionen, diceRolledThisTurn etc.
    this.sessionEvents?.emit(sessionId, 'game_state', updatedGameState);

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

  private determineOutcome(
    ownFigures: { id: number; position: number; status: string }[],
    movedFigureId: number,
    toPosition: number,
    capturesOpponent: boolean,
  ): MoveOutcomeType {
    if (capturesOpponent) {
      return 'CAPTURED';
    }
    if (isFinalGoalPosition(toPosition)) {
      const allFiguresInGoal = ownFigures.every((figure) =>
        figure.id !== movedFigureId
          ? isFinalGoalPosition(figure.position) || figure.status === 'GOAL'
          : true,
      );

      return allFiguresInGoal ? 'GAME_WON' : 'GOAL';
    }

    return 'MOVED';
  }
}
