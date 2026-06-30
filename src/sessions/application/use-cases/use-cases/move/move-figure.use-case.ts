import { MoveFigureRequestDto } from '../../../dtos';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { SessionRepositoryPort, QuizServicePort } from '../../../../ports';
import { SubmitQuizAnswerUseCase } from './submit-quiz-answer.use-case';
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
  QuizInProgressError,
} from '../../errors';
import { MoveFigureResultType } from '../../types';
import { SessionEventsService } from '../../../services';
import { MoveOutcomeType } from '@common';
import { FlyDomainService } from '../../../../domain';
import { FlyDebuffCacheService } from '../../../services';

@Injectable()
export class MoveFigureUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
    @Inject(QuizServicePort)
    private readonly quizClient: QuizServicePort,
    private readonly cache: GameStateCacheService,
    private readonly ludoEngine: LudoEngine,
    private readonly possibleMoveCalculator: PossibleMoveCalculatorUseCase,
    private readonly flyDomainService: FlyDomainService,
    private readonly flyDebuffCache: FlyDebuffCacheService,
    @Optional()
    private readonly sessionEvents?: SessionEventsService,
    @Optional()
    private readonly submitQuizAnswerUseCase?: SubmitQuizAnswerUseCase,
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

    if (gameState.status === 'QUIZ_PENDING') {
      throw new QuizInProgressError();
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

    const flyDebuffMap = await this.flyDebuffCache.get(sessionId);

    const possibleMoves = this.possibleMoveCalculator.calculate(
      gameState,
      userId,
      gameState.lastDiceValue,
      flyDebuffMap,
    );

    const selectedMove = possibleMoves.find(
      (move) =>
        move.figureId === request.figureId &&
        move.toPosition === request.toPosition,
    );

    if (!selectedMove) {
      throw new InvalidMoveError();
    }

    let capturedFigureId: number | null = null;
    if (selectedMove.capturesOpponent) {
      const oppFigure = gameState.figures.find(
        (f) => f.playerId !== userId && f.position === selectedMove.toPosition,
      );
      if (oppFigure) capturedFigureId = oppFigure.id;
    }

    let outcome: MoveOutcomeType = 'MOVED';
    if (selectedMove.capturesOpponent) {
      outcome = 'CAPTURED';
    } else if (isFinalGoalPosition(selectedMove.toPosition)) {
      const ownFigures = gameState.figures.filter((f) => f.playerId === userId);
      const allInGoal = ownFigures.every((f) =>
        f.id === request.figureId ? true : isFinalGoalPosition(f.position),
      );
      outcome = allInGoal ? 'GAME_WON' : 'GOAL';
    }

    const rollAgain =
      outcome !== 'GAME_WON' &&
      (selectedMove.capturesOpponent ||
        (gameState.lastDiceValue === 6 &&
          gameState.activeRules.includes('THROW_AGAIN_ON_6')));

    const result: MoveResult = {
      figureId: selectedMove.figureId,
      fromPosition: selectedMove.fromPosition,
      toPosition: selectedMove.toPosition,
      outcome,
      capturedFigureId,
      rollAgain,
      turnForfeit: false,
    };

    // [Main] Quiz-Flow bei Capture
    if (result.capturedFigureId !== null) {
      const question = await this.quizClient.getRandomQuestion();
      if (!question) {
        throw new Error('Failed to fetch quiz question');
      }
      const defenderFigure = gameState.figures.find(
        (f) => f.id === result.capturedFigureId,
      );
      if (!defenderFigure) {
        throw new Error('Defender figure not found');
      }
      const defenderId = defenderFigure.playerId;
      await this.sessionRepository.setPendingQuiz(sessionId, {
        questionId: question.id,
        attackerId: userId,
        defenderId,
        figureId: result.figureId,
        fromPosition: result.fromPosition,
        toPosition: result.toPosition,
        diceValue: gameState.lastDiceValue,
      });
      this.submitQuizAnswerUseCase?.startQuizTimer(sessionId);
      const updatedGameState =
        await this.sessionRepository.findGameStateById(sessionId);
      if (!updatedGameState) {
        throw new SessionNotFoundError();
      }
      this.cache.set(sessionId, updatedGameState).catch(() => {});
      this.sessionEvents?.emit(sessionId, 'quiz_started', {
        questionId: question.id,
        question: question.question,
        answers: question.answerOptions,
        attackerId: userId,
        defenderId,
        figureId: result.figureId,
        fromPosition: result.fromPosition,
        toPosition: result.toPosition,
        category: question.category,
        timeLimitSeconds: question.timeLimitSeconds,
      });
      this.sessionEvents?.emit(sessionId, 'game_state', updatedGameState);
      return {
        ...result,
        outcome: 'QUIZ_STARTED',
        plagueFlyTransferred: false,
        gameState: updatedGameState,
        quiz: {
          questionId: question.id,
          question: question.question,
          answers: question.answerOptions,
        },
      };
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

    await this.flyDebuffCache.invalidate(sessionId);

    let plagueFlyTransferred = false;

    if (
      gameState.activeRules.includes('PLAGUE_FLY') &&
      result.capturedFigureId !== null
    ) {
      const attackerFigure = gameState.figures.find(
        (f) => f.id === result.figureId,
      )!;
      const victimFigure = gameState.figures.find(
        (f) => f.id === result.capturedFigureId,
      )!;
      const kickResult = this.flyDomainService.resolveKick(
        attackerFigure,
        victimFigure,
      );

      if (kickResult.bothRemoved) {
        await this.sessionRepository.setFigureHasPlagueFly(
          sessionId,
          attackerFigure.id,
          false,
        );
        await this.sessionRepository.setFigureHasPlagueFly(
          sessionId,
          victimFigure.id,
          false,
        );
      } else if (kickResult.transferToAttacker) {
        await this.sessionRepository.setFigureHasPlagueFly(
          sessionId,
          victimFigure.id,
          false,
        );
        await this.sessionRepository.setFigureHasPlagueFly(
          sessionId,
          attackerFigure.id,
          true,
        );
        plagueFlyTransferred = true;
      } else if (kickResult.attackerLosesFly) {
        await this.sessionRepository.setFigureHasPlagueFly(
          sessionId,
          attackerFigure.id,
          false,
        );
      }
    }

    if (
      gameState.activeRules.includes('PLAGUE_FLY') &&
      isFinalGoalPosition(result.toPosition)
    ) {
      const movingFigure = gameState.figures.find(
        (f) => f.id === result.figureId,
      );
      if (movingFigure?.hasPlagueFly) {
        await this.sessionRepository.setFigureHasPlagueFly(
          sessionId,
          result.figureId,
          false,
        );
      }
    }

    const updatedGameState =
      await this.sessionRepository.findGameStateById(sessionId);
    if (!updatedGameState) throw new SessionNotFoundError();

    this.cache.set(sessionId, updatedGameState).catch(() => {});

    this.sessionEvents?.emit(sessionId, 'move_executed', {
      outcome: result.outcome,
      figureId: result.figureId,
      fromPosition: result.fromPosition,
      toPosition: result.toPosition,
    });

    if (plagueFlyTransferred && result.capturedFigureId !== null) {
      const attackerFigure = gameState.figures.find(
        (f) => f.id === result.figureId,
      )!;
      const victimFigure = gameState.figures.find(
        (f) => f.id === result.capturedFigureId,
      )!;
      this.sessionEvents?.emit(sessionId, 'plague_fly_transferred', {
        fromFigureId: victimFigure.id,
        toFigureId: attackerFigure.id,
        fromPlayerId: victimFigure.playerId,
        toPlayerId: attackerFigure.playerId,
        activeFlyCount: updatedGameState.activeFlyCount,
      });
    }

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
      plagueFlyTransferred,
      gameState: updatedGameState,
    };
  }

  private determineOutcome(
    ownFigures: { id: number; position: number; status: string }[],
    movedFigureId: number,
    toPosition: number,
    capturesOpponent: boolean,
  ): MoveOutcomeType {
    if (capturesOpponent) return 'CAPTURED';
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
