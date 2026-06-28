import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { SessionRepositoryPort, QuizServicePort } from '../../../../ports';
import { GameStateCacheService, SessionEventsService } from '../../../services';
import {
  NotInQuizError,
  NotQuizParticipantError,
  AlreadyAnsweredError,
  SessionNotFoundError,
} from '../../errors';
import { QuizResolvedPayload } from '../../types';

type PendingQuizAnswers = {
  attackerAnswer?: string;
  defenderAnswer?: string;
  timer?: ReturnType<typeof setTimeout>;
};

export type SubmitQuizAnswerResult = {
  accepted: boolean;
  resolved: boolean;
  result?: QuizResolvedPayload;
};

@Injectable()
export class SubmitQuizAnswerUseCase {
  private readonly logger = new Logger(SubmitQuizAnswerUseCase.name);
  private readonly pendingAnswers = new Map<string, PendingQuizAnswers>();

  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
    @Inject(QuizServicePort)
    private readonly quizService: QuizServicePort,
    private readonly cache: GameStateCacheService,
    @Optional()
    private readonly sessionEvents?: SessionEventsService,
  ) {}

  async execute(
    sessionId: string,
    userId: string,
    answerId: string,
  ): Promise<SubmitQuizAnswerResult> {
    const session = await this.sessionRepository.findByIdMinimal(sessionId);
    if (!session) {
      throw new SessionNotFoundError();
    }

    if (session.status !== 'QUIZ_PENDING') {
      throw new NotInQuizError();
    }

    const attackerId = session.pendingQuizAttackerId;
    const defenderId = session.pendingQuizDefenderId;

    if (!attackerId || !defenderId) {
      throw new NotInQuizError();
    }

    const isAttacker = userId === attackerId;
    const isDefender = userId === defenderId;

    if (!isAttacker && !isDefender) {
      throw new NotQuizParticipantError();
    }

    const pending = this.pendingAnswers.get(sessionId) ?? {};

    if (isAttacker && pending.attackerAnswer !== undefined) {
      throw new AlreadyAnsweredError();
    }
    if (isDefender && pending.defenderAnswer !== undefined) {
      throw new AlreadyAnsweredError();
    }

    if (isAttacker) {
      pending.attackerAnswer = answerId;
    } else {
      pending.defenderAnswer = answerId;
    }

    this.pendingAnswers.set(sessionId, pending);

    const bothAnswered =
      pending.attackerAnswer !== undefined &&
      pending.defenderAnswer !== undefined;

    if (bothAnswered) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      const result = await this.resolveQuiz(sessionId, session);
      return { accepted: true, resolved: true, result };
    }

    this.startQuizTimer(sessionId);

    return { accepted: true, resolved: false };
  }

  startQuizTimer(sessionId: string): void {
    const pending = this.pendingAnswers.get(sessionId) ?? {};
    if (!pending.timer) {
      pending.timer = setTimeout(() => {
        this.handleTimeout(sessionId).catch((err) => {
          this.logger.error(
            `Quiz timeout resolution failed for session ${sessionId}`,
            err,
          );
        });
      }, 15_000);
      this.pendingAnswers.set(sessionId, pending);
    }
  }

  private async handleTimeout(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findByIdMinimal(sessionId);
    if (!session || session.status !== 'QUIZ_PENDING') {
      this.pendingAnswers.delete(sessionId);
      return;
    }

    await this.resolveQuiz(sessionId, session);
  }

  private async resolveQuiz(
    sessionId: string,
    session: {
      pendingQuizQuestionId: string | null;
      pendingQuizAttackerId: string | null;
      pendingQuizDefenderId: string | null;
      pendingQuizFigureId: number | null;
      pendingQuizFromPos: number | null;
      pendingQuizToPos: number | null;
      pendingQuizDiceValue: number | null;
    },
  ): Promise<QuizResolvedPayload> {
    const pending = this.pendingAnswers.get(sessionId) ?? {};
    this.pendingAnswers.delete(sessionId);

    const questionId = session.pendingQuizQuestionId!;
    const attackerId = session.pendingQuizAttackerId!;
    const defenderId = session.pendingQuizDefenderId!;
    const figureId = session.pendingQuizFigureId!;
    const fromPosition = session.pendingQuizFromPos!;
    const toPosition = session.pendingQuizToPos!;
    const diceValue = session.pendingQuizDiceValue!;

    const correctAnswerId =
      await this.quizService.getCorrectAnswerId(questionId);

    const attackerAnswered = pending.attackerAnswer !== undefined;
    const defenderAnswered = pending.defenderAnswer !== undefined;
    const attackerCorrect =
      attackerAnswered && pending.attackerAnswer === correctAnswerId;
    const defenderCorrect =
      defenderAnswered && pending.defenderAnswer === correctAnswerId;

    let attackerWins: boolean;

    if (!attackerAnswered && !defenderAnswered) {
      // Neither answered → tie → defender wins
      attackerWins = false;
    } else if (!attackerAnswered) {
      // Attacker didn't answer → attacker loses
      attackerWins = false;
    } else if (!defenderAnswered) {
      // Defender didn't answer → defender loses
      attackerWins = true;
    } else if (attackerCorrect && !defenderCorrect) {
      attackerWins = true;
    } else {
      // Both correct, both wrong, or only defender correct → defender wins
      attackerWins = false;
    }

    const winnerId = attackerWins ? attackerId : defenderId;
    const loserId = attackerWins ? defenderId : attackerId;

    const gameState = await this.sessionRepository.findGameStateById(sessionId);
    const defenderFigure = gameState?.figures.find(
      (f) => f.playerId === defenderId && f.position === toPosition,
    );

    if (attackerWins) {
      await this.sessionRepository.applyMove({
        sessionId,
        userId: attackerId,
        figureId,
        fromPosition,
        toPosition,
        diceValue,
        capturedFigureId: defenderFigure?.id ?? null,
        outcome: 'CAPTURED',
        rollAgain: false,
        turnForfeit: false,
      });
    } else if (defenderFigure) {
      // Defender wins: send attacker's figure home
      await this.sessionRepository.applyMove({
        sessionId,
        userId: defenderId,
        figureId: defenderFigure.id,
        fromPosition: toPosition,
        toPosition,
        diceValue,
        capturedFigureId: figureId,
        outcome: 'CAPTURED',
        rollAgain: false,
        turnForfeit: false,
      });
    }

    await this.sessionRepository.clearPendingQuiz(sessionId);

    // Pass turn to next player after quiz resolution
    await this.sessionRepository.passTurn(sessionId, attackerId);

    const updatedGameState =
      await this.sessionRepository.findGameStateById(sessionId);

    if (updatedGameState) {
      this.cache.set(sessionId, updatedGameState).catch(() => {});
    }

    const result: QuizResolvedPayload = {
      winnerId,
      loserId,
      attackerId,
      defenderId,
      attackerCorrect,
      defenderCorrect,
      correctAnswerId: correctAnswerId ?? '',
      captureExecuted: attackerWins,
      figureId,
      toPosition,
    };

    this.sessionEvents?.emit(sessionId, 'quiz_resolved', result);

    if (updatedGameState) {
      this.sessionEvents?.emit(sessionId, 'game_state', updatedGameState);
      this.sessionEvents?.emit(sessionId, 'turn_changed', {
        currentPlayerId: updatedGameState.currentPlayerId,
        turnNumber: updatedGameState.turnNumber,
      });
    }

    return result;
  }
}
