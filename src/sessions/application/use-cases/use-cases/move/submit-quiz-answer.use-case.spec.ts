import { SessionRepositoryPort, QuizServicePort } from '../../../../ports';
import { GameStateCacheService, SessionEventsService } from '../../../services';
import { GameStateType } from '../../types';
import { SubmitQuizAnswerUseCase } from './submit-quiz-answer.use-case';

describe('SubmitQuizAnswerUseCase', () => {
  let useCase: SubmitQuizAnswerUseCase;
  let sessionRepository: jest.Mocked<SessionRepositoryPort>;
  let quizService: jest.Mocked<QuizServicePort>;
  let cache: jest.Mocked<GameStateCacheService>;
  let sessionEvents: jest.Mocked<SessionEventsService>;

  const sessionId = 'session-123';
  const attackerId = 'attacker-1';
  const defenderId = 'defender-1';

  const pendingSession = {
    id: sessionId,
    status: 'QUIZ_PENDING',
    pendingQuizQuestionId: 'question-1',
    pendingQuizAttackerId: attackerId,
    pendingQuizDefenderId: defenderId,
    pendingQuizFigureId: 1,
    pendingQuizFromPos: 0,
    pendingQuizToPos: 3,
    pendingQuizDiceValue: 3,
  } as unknown as Awaited<
    ReturnType<SessionRepositoryPort['findByIdMinimal']>
  >;

  const gameStateBeforeResolve: GameStateType = {
    sessionId,
    status: 'QUIZ_PENDING',
    mode: 'CLASSIC',
    boardTheme: 'CLASSIC',
    players: [],
    figures: [
      { id: 1, playerId: attackerId, position: 0, status: 'ACTIVE' },
      { id: 2, playerId: defenderId, position: 3, status: 'ACTIVE' },
    ],
    currentPlayerId: attackerId,
    turnNumber: 1,
    lastDiceValue: 3,
    diceRolledThisTurn: true,
    consecutiveSixes: 0,
    activeRules: [],
    activeFlyCount: 0,
    winnerId: null,
    createdAt: '2026-06-28T12:00:00.000Z',
    lastUpdatedAt: '2026-06-28T12:00:00.000Z',
  };

  const updatedGameState: GameStateType = {
    ...gameStateBeforeResolve,
    status: 'IN_PROGRESS',
    currentPlayerId: defenderId,
    turnNumber: 2,
    figures: [
      { id: 1, playerId: attackerId, position: 3, status: 'ACTIVE' },
      { id: 2, playerId: defenderId, position: 0, status: 'HOME' },
    ],
  };

  beforeEach(() => {
    jest.useFakeTimers();

    sessionRepository = {
      findByIdMinimal: jest.fn().mockResolvedValue(pendingSession),
      findGameStateById: jest.fn(),
      applyMove: jest.fn().mockResolvedValue(undefined),
      clearPendingQuiz: jest.fn().mockResolvedValue(undefined),
      passTurn: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SessionRepositoryPort>;

    quizService = {
      getCorrectAnswerId: jest.fn().mockResolvedValue('answer-1'),
    } as unknown as jest.Mocked<QuizServicePort>;

    cache = {
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<GameStateCacheService>;

    sessionEvents = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<SessionEventsService>;

    useCase = new SubmitQuizAnswerUseCase(
      sessionRepository,
      quizService,
      cache,
      sessionEvents,
    );
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should emit quiz_answered without exposing the selected answer', async () => {
    const result = await useCase.execute(sessionId, attackerId, 'answer-1');

    expect(result).toEqual({ accepted: true, resolved: false });
    expect(sessionEvents.emit).toHaveBeenCalledWith(sessionId, 'quiz_answered', {
      questionId: 'question-1',
      playerId: attackerId,
      role: 'attacker',
    });

    const answeredEvent = sessionEvents.emit.mock.calls.find(
      ([, eventType]) => eventType === 'quiz_answered',
    );
    expect(answeredEvent?.[2]).not.toHaveProperty('answerId');
  });

  it('should emit quiz_resolved with winner, loser, and updated board state', async () => {
    sessionRepository.findGameStateById
      .mockResolvedValueOnce(gameStateBeforeResolve)
      .mockResolvedValueOnce(updatedGameState);

    await useCase.execute(sessionId, attackerId, 'answer-1');
    const result = await useCase.execute(sessionId, defenderId, 'answer-2');

    expect(result.resolved).toBe(true);
    expect(result.result).toEqual(
      expect.objectContaining({
        winnerId: attackerId,
        loserId: defenderId,
        gameState: updatedGameState,
      }),
    );
    expect(sessionEvents.emit).toHaveBeenCalledWith(
      sessionId,
      'quiz_resolved',
      expect.objectContaining({
        winnerId: attackerId,
        loserId: defenderId,
        gameState: updatedGameState,
      }),
    );
    expect(cache.set).toHaveBeenCalledWith(sessionId, updatedGameState);
  });
});
