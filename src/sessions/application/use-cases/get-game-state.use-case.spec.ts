import { GetGameStateUseCase } from './get-game-state.use-case';
import { SessionRepositoryPort } from '../../ports/session.repository.port';
import { GameStateCacheService } from '../services/game-state-cache.service';
import { User } from 'src/generated/prisma-class/user';
import { GameStateType } from './types/game-state.type';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('GetGameStateUseCase', () => {
  let useCase: GetGameStateUseCase;
  let mockSessionRepository: jest.Mocked<SessionRepositoryPort>;
  let mockCache: jest.Mocked<GameStateCacheService>;

  const mockUser = { id: 'user-1' } as User;
  const mockState: GameStateType = {
    sessionId: 'session-123',
    status: 'IN_PROGRESS',
    mode: 'CLASSIC',
    boardTheme: 'CLASSIC',
    players: [{ id: 'user-1', name: 'Nico' } as any],
    figures: [],
    currentPlayerId: 'user-1',
    turnNumber: 1,
    lastDiceValue: 6,
    diceRolledThisTurn: true,
    consecutiveSixes: 1,
    activeRules: [],
    winnerId: null,
    createdAt: '2026-06-15T12:00:00.000Z',
    lastUpdatedAt: '2026-06-15T12:05:00.000Z',
  };

  beforeEach(() => {
    mockSessionRepository = {
      findGameStateById: jest.fn(),
    } as unknown as jest.Mocked<SessionRepositoryPort>;

    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      invalidate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<GameStateCacheService>;

    useCase = new GetGameStateUseCase(mockSessionRepository, mockCache);
  });

  it('should return cached state on cache hit and bypass database', async () => {
    mockCache.get.mockResolvedValue(mockState);

    const result = await useCase.execute(mockUser, 'session-123');

    expect(result).toEqual(mockState);
    expect(mockCache.get).toHaveBeenCalledWith('session-123');
    expect(mockSessionRepository.findGameStateById).not.toHaveBeenCalled();
  });

  it('should query database, populate cache, and return state on cache miss', async () => {
    mockCache.get.mockResolvedValue(null);
    mockSessionRepository.findGameStateById.mockResolvedValue(mockState);
    mockCache.set.mockResolvedValue(undefined);

    const result = await useCase.execute(mockUser, 'session-123');

    expect(result).toEqual(mockState);
    expect(mockCache.get).toHaveBeenCalledWith('session-123');
    expect(mockSessionRepository.findGameStateById).toHaveBeenCalledWith('session-123');
    expect(mockCache.set).toHaveBeenCalledWith('session-123', mockState);
  });

  it('should throw NotFoundException if session is not found in database on cache miss', async () => {
    mockCache.get.mockResolvedValue(null);
    mockSessionRepository.findGameStateById.mockResolvedValue(null);

    await expect(useCase.execute(mockUser, 'session-123')).rejects.toThrow(
      NotFoundException,
    );

    expect(mockCache.get).toHaveBeenCalledWith('session-123');
    expect(mockSessionRepository.findGameStateById).toHaveBeenCalledWith('session-123');
    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it('should fall back to database when cache.get returns null due to Redis error', async () => {
    mockCache.get.mockResolvedValue(null);
    mockSessionRepository.findGameStateById.mockResolvedValue(mockState);

    const result = await useCase.execute(mockUser, 'session-123');

    expect(result).toEqual(mockState);
    expect(mockSessionRepository.findGameStateById).toHaveBeenCalledWith('session-123');
  });

  it('should throw ForbiddenException if user is not part of the game (cache hit)', async () => {
    const stateNoUser = { ...mockState, players: [] };
    mockCache.get.mockResolvedValue(stateNoUser);

    await expect(useCase.execute(mockUser, 'session-123')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException if user is not part of the game (cache miss)', async () => {
    const stateNoUser = { ...mockState, players: [] };
    mockCache.get.mockResolvedValue(null);
    mockSessionRepository.findGameStateById.mockResolvedValue(stateNoUser);

    await expect(useCase.execute(mockUser, 'session-123')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
