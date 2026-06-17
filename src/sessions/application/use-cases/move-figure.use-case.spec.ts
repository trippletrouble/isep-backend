import { MoveFigureUseCase } from './move-figure.use-case';
import { SessionRepositoryPort } from '../../ports/session.repository.port';
import { PossibleMoveCalculatorUseCase } from './possible-move-calculator.use-case';
import { GameStateCacheService } from '../services/game-state-cache.service';
import { GameStateType } from './types/game-state.type';
import { MoveFigureRequestDto } from '../dtos/move-figure-request.dto';
import {
  DiceNotRolledError,
  InvalidMoveError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
} from './errors';

describe('MoveFigureUseCase', () => {
  let useCase: MoveFigureUseCase;
  let mockSessionRepo: jest.Mocked<SessionRepositoryPort>;
  let mockMoveCalculator: jest.Mocked<PossibleMoveCalculatorUseCase>;
  let mockCache: jest.Mocked<GameStateCacheService>;

  const userId = 'player-1';
  const sessionId = 'session-123';

  const mockGameState: GameStateType = {
    sessionId,
    status: 'IN_PROGRESS',
    mode: 'CLASSIC',
    boardTheme: 'CLASSIC',
    players: [{ id: userId, name: 'Nico' } as any],
    figures: [
      { id: 1, playerId: userId, position: 0, status: 'ACTIVE' } as any,
    ],
    currentPlayerId: userId,
    turnNumber: 1,
    lastDiceValue: 3,
    diceRolledThisTurn: true,
    consecutiveSixes: 0,
    activeRules: [],
    winnerId: null,
    createdAt: '2026-06-15T12:00:00.000Z',
    lastUpdatedAt: '2026-06-15T12:00:00.000Z',
  };

  const updatedGameState: GameStateType = {
    ...mockGameState,
    figures: [{ id: 1, playerId: userId, position: 3, status: 'ACTIVE' } as any],
  };

  const validRequest: MoveFigureRequestDto = { figureId: 1, toPosition: 3 };

  const validMove = {
    figureId: 1,
    fromPosition: 0,
    toPosition: 3,
    capturesOpponent: false,
  };

  beforeEach(() => {
    mockSessionRepo = {
      findGameStateById: jest.fn(),
      applyMove: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SessionRepositoryPort>;

    mockMoveCalculator = {
      calculate: jest.fn().mockReturnValue([validMove]),
    } as unknown as jest.Mocked<PossibleMoveCalculatorUseCase>;

    mockCache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      invalidate: jest.fn(),
    } as unknown as jest.Mocked<GameStateCacheService>;

    useCase = new MoveFigureUseCase(mockSessionRepo, mockMoveCalculator, mockCache);
  });

  it('should call cache.set with updated game state after successful applyMove', async () => {
    mockSessionRepo.findGameStateById
      .mockResolvedValueOnce(mockGameState)
      .mockResolvedValueOnce(updatedGameState);

    await useCase.execute(sessionId, userId, validRequest);

    expect(mockSessionRepo.applyMove).toHaveBeenCalled();
    expect(mockCache.set).toHaveBeenCalledWith(sessionId, updatedGameState);
  });

  it('should not call cache.set when applyMove throws', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue(mockGameState);
    mockSessionRepo.applyMove.mockRejectedValue(new Error('DB error'));

    await expect(useCase.execute(sessionId, userId, validRequest)).rejects.toThrow('DB error');

    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it('should throw SessionNotFoundError when session does not exist', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue(null);

    await expect(useCase.execute(sessionId, userId, validRequest)).rejects.toThrow(
      SessionNotFoundError,
    );
  });

  it('should throw InvalidSessionStatusError when session is not IN_PROGRESS', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue({
      ...mockGameState,
      status: 'WAITING',
    });

    await expect(useCase.execute(sessionId, userId, validRequest)).rejects.toThrow(
      InvalidSessionStatusError,
    );
  });

  it('should throw NotYourTurnError when player is not the current player', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue({
      ...mockGameState,
      currentPlayerId: 'other-player',
    });

    await expect(useCase.execute(sessionId, userId, validRequest)).rejects.toThrow(
      NotYourTurnError,
    );
  });

  it('should throw DiceNotRolledError when dice has not been rolled this turn', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue({
      ...mockGameState,
      diceRolledThisTurn: false,
    });

    await expect(useCase.execute(sessionId, userId, validRequest)).rejects.toThrow(
      DiceNotRolledError,
    );
  });

  it('should throw InvalidMoveError when the requested move is not in possible moves', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue(mockGameState);
    mockMoveCalculator.calculate.mockReturnValue([]);

    await expect(useCase.execute(sessionId, userId, validRequest)).rejects.toThrow(
      InvalidMoveError,
    );
  });
});
