import { Inject, Injectable, Optional } from '@nestjs/common';
import { MoveFigureRequestDto } from '../dtos/move-figure-request.dto';
import { SessionRepositoryPort } from '../../ports';
import {
  FINAL_GOAL_POSITION,
  PossibleMoveCalculatorUseCase,
  isFinalGoalPosition,
} from './possible-move-calculator.use-case';
import {
  DiceNotRolledError,
  InvalidMoveError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
} from './errors';
import {
  MoveFigureResultType,
  MoveOutcomeType,
} from './types/move-figure-result.type';
import { SessionEventsService } from '../services';

@Injectable()
export class MoveFigureUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly possibleMoveCalculator: PossibleMoveCalculatorUseCase,
    @Optional()
    private readonly sessionEvents?: SessionEventsService,
  ) { }

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

    const capturedFigure = selectedMove.capturesOpponent
      ? gameState.figures.find(
        (figure) =>
          figure.playerId !== userId &&
          figure.position === selectedMove.toPosition,
      )
      : undefined;
    const outcome = this.determineOutcome(
      gameState.figures.filter((figure) => figure.playerId === userId),
      selectedMove.figureId,
      selectedMove.toPosition,
      Boolean(capturedFigure),
    );
    const turnForfeit = gameState.consecutiveSixes >= 3;
    const rollAgain =
      gameState.lastDiceValue === 6 && !turnForfeit && outcome !== 'GAME_WON';

    await this.sessionRepository.applyMove({
      sessionId,
      userId,
      figureId: selectedMove.figureId,
      fromPosition: selectedMove.fromPosition,
      toPosition: selectedMove.toPosition,
      diceValue: gameState.lastDiceValue,
      capturedFigureId: capturedFigure?.id ?? null,
      outcome,
      rollAgain,
      turnForfeit,
    });

    const updatedGameState =
      await this.sessionRepository.findGameStateById(sessionId);

    if (!updatedGameState) {
      throw new SessionNotFoundError();
    }

    this.sessionEvents?.emit(sessionId, 'move_executed', {
      outcome,
      figureId: selectedMove.figureId,
      fromPosition: selectedMove.fromPosition,
      toPosition: selectedMove.toPosition,
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

    if (outcome === 'GAME_WON') {
      this.sessionEvents?.emit(sessionId, 'game_ended', {
        winnerId: updatedGameState.winnerId,
        finishedAt: updatedGameState.lastUpdatedAt,
      });
    }

    return {
      figureId: selectedMove.figureId,
      fromPosition: selectedMove.fromPosition,
      toPosition: selectedMove.toPosition,
      outcome,
      capturedFigureId: capturedFigure?.id ?? null,
      rollAgain,
      turnForfeit,
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
