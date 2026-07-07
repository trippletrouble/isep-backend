import { MoveFigureUseCase } from './move-figure.use-case';
import { QuizServicePort, SessionRepositoryPort } from '../../../../ports';
import { PossibleMoveCalculatorUseCase } from './possible-move-calculator.use-case';
import { GameStateCacheService, SessionEventsService } from '../../../services';
import { GameStateFromPlayerType, GameStateType } from '../../types';
import { MoveFigureRequestDto } from '../../../dtos';
import {
  DiceNotRolledError,
  InvalidMoveError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
  QuizInProgressError,
} from '../../errors';
import { LudoEngine, MoveResult, FlyDomainService } from '../../../../domain';

describe('MoveFigureUseCase', () => {
  let useCase: MoveFigureUseCase;
  let mockSessionRepo: jest.Mocked<SessionRepositoryPort>;
  let mockQuizClient: jest.Mocked<QuizServicePort>;
  let mockMoveCalculator: jest.Mocked<PossibleMoveCalculatorUseCase>;
  let mockCache: jest.Mocked<GameStateCacheService>;
  let mockLudoEngine: jest.Mocked<LudoEngine>;
  let mockFlyDomainService: jest.Mocked<FlyDomainService>;
  let mockSessionEvents: jest.Mocked<SessionEventsService>;

  const userId = 'player-1';
  const sessionId = 'session-123';

  const mockPlayer: GameStateFromPlayerType = {
    id: userId,
    username: 'Nico',
    color: 'RED',
    type: 'HUMAN',
    isCurrentTurn: true,
    hasFinished: false,
    figuresInGoal: 0,
  } as unknown as GameStateFromPlayerType;

  const mockGameState: GameStateType = {
    sessionId,
    status: 'IN_PROGRESS',
    mode: 'CLASSIC',
    boardTheme: 'CLASSIC',
    players: [mockPlayer],
    figures: [{ id: 1, playerId: userId, position: 0, status: 'ACTIVE' }],
    currentPlayerId: userId,
    turnNumber: 1,
    lastDiceValue: 3,
    diceRolledThisTurn: true,
    consecutiveSixes: 0,
    activeRules: ['QUIZ_DUELL'],
    activeFlyCount: 0,
    winnerId: null,
    createdAt: '2026-06-15T12:00:00.000Z',
    lastUpdatedAt: '2026-06-15T12:00:00.000Z',
  };

  const updatedGameState: GameStateType = {
    ...mockGameState,
    figures: [{ id: 1, playerId: userId, position: 3, status: 'ACTIVE' }],
  };

  const validRequest: MoveFigureRequestDto = { figureId: 1, toPosition: 3 };

  const validMove = {
    figureId: 1,
    fromPosition: 0,
    toPosition: 3,
    capturesOpponent: false,
  };

  const mockMoveResult: MoveResult = {
    figureId: 1,
    fromPosition: 0,
    toPosition: 3,
    outcome: 'MOVED',
    capturedFigureId: null,
    rollAgain: false,
    turnForfeit: false,
  };

  beforeEach(() => {
    mockSessionRepo = {
      findGameStateById: jest.fn(),
      applyMove: jest.fn().mockResolvedValue(undefined),
      setPendingQuiz: jest.fn().mockResolvedValue(undefined),
      clearPendingQuiz: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SessionRepositoryPort>;

    mockQuizClient = {
      getRandomQuestion: jest.fn().mockResolvedValue({
        id: 'q-1',
        category: 'math',
        question: 'What is 2+2?',
        answerOptions: [
          { id: '1', text: '4' },
          { id: '2', text: '5' },
        ],
        correctAnswerId: '1',
        timeLimitSeconds: 15,
      }),
      getCorrectAnswerId: jest.fn().mockResolvedValue('1'),
    } as unknown as jest.Mocked<QuizServicePort>;

    mockMoveCalculator = {
      calculate: jest.fn().mockReturnValue([validMove]),
    } as unknown as jest.Mocked<PossibleMoveCalculatorUseCase>;

    mockCache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      invalidate: jest.fn(),
    } as unknown as jest.Mocked<GameStateCacheService>;

    mockLudoEngine = {
      applyMove: jest.fn().mockReturnValue(mockMoveResult),
    } as unknown as jest.Mocked<LudoEngine>;

    mockFlyDomainService = {
      resolveKick: jest.fn().mockResolvedValue({
        bothFliesRemoved: false,
        flyTransferred: false,
        attackerFlyRemoved: false,
      }),
      handleReachGoal: jest.fn().mockResolvedValue({
        flyRemoved: false,
      }),
    } as unknown as jest.Mocked<FlyDomainService>;

    mockSessionEvents = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<SessionEventsService>;

    const mockFlyDebuffCache = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(new Map()),
      invalidate: jest.fn(),
    } as any;

    useCase = new MoveFigureUseCase(
      mockSessionRepo,
      mockQuizClient,
      mockCache,
      mockLudoEngine,
      mockMoveCalculator,
      mockFlyDomainService,
      mockFlyDebuffCache,
      mockSessionEvents,
    );
  });

  it('should call cache.set with updated game state after successful applyMove', async () => {
    mockSessionRepo.findGameStateById
      .mockResolvedValueOnce(mockGameState)
      .mockResolvedValueOnce(updatedGameState);

    await useCase.execute(sessionId, userId, validRequest);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockSessionRepo.applyMove).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockCache.set).toHaveBeenCalledWith(sessionId, updatedGameState);
  });

  it('should not call cache.set when applyMove throws', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue(mockGameState);
    mockSessionRepo.applyMove.mockRejectedValue(new Error('DB error'));

    await expect(
      useCase.execute(sessionId, userId, validRequest),
    ).rejects.toThrow('DB error');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it('should throw SessionNotFoundError when session does not exist', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue(null);

    await expect(
      useCase.execute(sessionId, userId, validRequest),
    ).rejects.toThrow(SessionNotFoundError);
  });

  it('should throw InvalidSessionStatusError when session is not IN_PROGRESS', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue({
      ...mockGameState,
      status: 'WAITING',
    });

    await expect(
      useCase.execute(sessionId, userId, validRequest),
    ).rejects.toThrow(InvalidSessionStatusError);
  });

  it('should throw NotYourTurnError when player is not the current player', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue({
      ...mockGameState,
      currentPlayerId: 'other-player',
    });

    await expect(
      useCase.execute(sessionId, userId, validRequest),
    ).rejects.toThrow(NotYourTurnError);
  });

  it('should throw DiceNotRolledError when dice has not been rolled this turn', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue({
      ...mockGameState,
      diceRolledThisTurn: false,
    });

    await expect(
      useCase.execute(sessionId, userId, validRequest),
    ).rejects.toThrow(DiceNotRolledError);
  });

  it('should throw InvalidMoveError when the requested move is not in possible moves', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue(mockGameState);
    mockMoveCalculator.calculate.mockReturnValue([]);

    await expect(
      useCase.execute(sessionId, userId, validRequest),
    ).rejects.toThrow(InvalidMoveError);
  });

  it('should trigger quiz duel when the move captures an opponent figure', async () => {
    const oppUserId = 'opponent-player';
    const initialGameState: GameStateType = {
      ...mockGameState,
      figures: [
        { id: 1, playerId: userId, position: 0, status: 'ACTIVE' },
        { id: 2, playerId: oppUserId, position: 3, status: 'ACTIVE' },
      ],
    };
    const afterQuizGameState: GameStateType = {
      ...initialGameState,
      status: 'QUIZ_PENDING',
    };

    mockSessionRepo.findGameStateById
      .mockResolvedValueOnce(initialGameState)
      .mockResolvedValueOnce(afterQuizGameState);

    mockMoveCalculator.calculate.mockReturnValue([
      { figureId: 1, fromPosition: 0, toPosition: 3, capturesOpponent: true },
    ]);

    mockLudoEngine.applyMove.mockReturnValueOnce({
      figureId: 1,
      fromPosition: 0,
      toPosition: 3,
      outcome: 'CAPTURED',
      capturedFigureId: 2,
      rollAgain: true,
      turnForfeit: false,
    });

    const result = await useCase.execute(sessionId, userId, validRequest);

    expect(mockQuizClient.getRandomQuestion).toHaveBeenCalled();
    expect(mockSessionRepo.setPendingQuiz).toHaveBeenCalledWith(sessionId, {
      questionId: 'q-1',
      attackerId: userId,
      defenderId: oppUserId,
      figureId: 1,
      fromPosition: 0,
      toPosition: 3,
      diceValue: initialGameState.lastDiceValue,
    });
    expect(mockSessionRepo.applyMove).not.toHaveBeenCalled();
    expect(result.outcome).toBe('QUIZ_STARTED');
    expect(result.quiz).toEqual({
      questionId: 'q-1',
      question: 'What is 2+2?',
      answers: [
        { id: '1', text: '4' },
        { id: '2', text: '5' },
      ],
    });
    expect(mockSessionEvents.emit).toHaveBeenCalledWith(
      sessionId,
      'quiz_started',
      {
        questionId: 'q-1',
        question: 'What is 2+2?',
        answers: [
          { id: '1', text: '4' },
          { id: '2', text: '5' },
        ],
        attackerId: userId,
        defenderId: oppUserId,
        figureId: 1,
        fromPosition: 0,
        toPosition: 3,
        category: 'math',
        timeLimitSeconds: 15,
      },
    );
  });

  it('should throw QuizInProgressError when a move is attempted during QUIZ_PENDING', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue({
      ...mockGameState,
      status: 'QUIZ_PENDING',
    });

    await expect(
      useCase.execute(sessionId, userId, validRequest),
    ).rejects.toThrow(QuizInProgressError);
  });

  describe('Plague Fly integration', () => {
    it('should resolve kick and remove both flies when resolveKick returns bothFliesRemoved', async () => {
      const activeState: GameStateType = {
        ...mockGameState,
        activeRules: ['PLAGUE_FLY'],
        figures: [
          { id: 1, playerId: userId, position: 0, status: 'ACTIVE', hasPlagueFly: true },
          { id: 2, playerId: 'opp', position: 3, status: 'ACTIVE', hasPlagueFly: true },
        ] as any,
      };

      mockSessionRepo.findGameStateById
        .mockResolvedValueOnce(activeState)
        .mockResolvedValueOnce(updatedGameState);

      mockMoveCalculator.calculate.mockReturnValueOnce([
        { figureId: 1, fromPosition: 0, toPosition: 3, capturesOpponent: true },
      ]);

      mockFlyDomainService.resolveKick.mockResolvedValueOnce({
        bothFliesRemoved: true,
        flyTransferred: false,
        attackerFlyRemoved: false,
      });

      mockSessionRepo.setFigureHasPlagueFly = jest.fn().mockResolvedValue(undefined);

      await useCase.execute(sessionId, userId, validRequest);

      expect(mockFlyDomainService.resolveKick).toHaveBeenCalledWith(sessionId, '1', '2');
      expect(mockSessionRepo.setFigureHasPlagueFly).toHaveBeenCalledWith(sessionId, 1, false);
      expect(mockSessionRepo.setFigureHasPlagueFly).toHaveBeenCalledWith(sessionId, 2, false);
    });

    it('should resolve kick and transfer fly when resolveKick returns flyTransferred', async () => {
      const activeState: GameStateType = {
        ...mockGameState,
        activeRules: ['PLAGUE_FLY'],
        figures: [
          { id: 1, playerId: userId, position: 0, status: 'ACTIVE', hasPlagueFly: false },
          { id: 2, playerId: 'opp', position: 3, status: 'ACTIVE', hasPlagueFly: true },
        ] as any,
      };

      mockSessionRepo.findGameStateById
        .mockResolvedValueOnce(activeState)
        .mockResolvedValueOnce(updatedGameState);

      mockMoveCalculator.calculate.mockReturnValueOnce([
        { figureId: 1, fromPosition: 0, toPosition: 3, capturesOpponent: true },
      ]);

      mockFlyDomainService.resolveKick.mockResolvedValueOnce({
        bothFliesRemoved: false,
        flyTransferred: true,
        attackerFlyRemoved: false,
      });

      mockSessionRepo.setFigureHasPlagueFly = jest.fn().mockResolvedValue(undefined);

      await useCase.execute(sessionId, userId, validRequest);

      expect(mockFlyDomainService.resolveKick).toHaveBeenCalledWith(sessionId, '1', '2');
      expect(mockSessionRepo.setFigureHasPlagueFly).toHaveBeenCalledWith(sessionId, 2, false);
      expect(mockSessionRepo.setFigureHasPlagueFly).toHaveBeenCalledWith(sessionId, 1, true);
    });

    it('should remove fly when figure reaches the goal', async () => {
      const activeState: GameStateType = {
        ...mockGameState,
        activeRules: ['PLAGUE_FLY'],
        figures: [
          { id: 1, playerId: userId, position: 55, status: 'ACTIVE', hasPlagueFly: true },
        ] as any,
      };

      mockSessionRepo.findGameStateById
        .mockResolvedValueOnce(activeState)
        .mockResolvedValueOnce(updatedGameState);

      mockMoveCalculator.calculate.mockReturnValueOnce([
        { figureId: 1, fromPosition: 55, toPosition: 72, capturesOpponent: false },
      ]);

      mockFlyDomainService.handleReachGoal.mockResolvedValueOnce({ flyRemoved: true });
      mockSessionRepo.setFigureHasPlagueFly = jest.fn().mockResolvedValue(undefined);

      await useCase.execute(sessionId, userId, { figureId: 1, toPosition: 72 });

      expect(mockFlyDomainService.handleReachGoal).toHaveBeenCalledWith(sessionId, '1');
      expect(mockSessionRepo.setFigureHasPlagueFly).toHaveBeenCalledWith(sessionId, 1, false);
    });
  });
});
