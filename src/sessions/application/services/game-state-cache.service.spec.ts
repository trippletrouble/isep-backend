import { GameStateCacheService } from './game-state-cache.service';
import Redis from 'ioredis';
import { GameStateType } from '../use-cases/types/game-state.type';

describe('GameStateCacheService', () => {
  let service: GameStateCacheService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    service = new GameStateCacheService(mockRedis);
  });

  describe('get', () => {
    it('should return parsed GameStateType on cache hit', async () => {
      const mockState: GameStateType = {
        sessionId: 'session-123',
        status: 'IN_PROGRESS',
        mode: 'CLASSIC',
        boardTheme: 'CLASSIC',
        players: [],
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

      mockRedis.get.mockResolvedValue(JSON.stringify(mockState));

      const result = await service.get('session-123');

      expect(result).toEqual(mockState);
      expect(mockRedis.get).toHaveBeenCalledWith('session:session-123:state');
    });

    it('should return null on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('session-123');

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('session:session-123:state');
    });

    it('should return null and log warning when Redis throws error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis is down'));

      const result = await service.get('session-123');

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('session:session-123:state');
    });
  });

  describe('set', () => {
    it('should store serialized JSON with correct key and TTL', async () => {
      const mockState: GameStateType = {
        sessionId: 'session-123',
        status: 'IN_PROGRESS',
        mode: 'CLASSIC',
        boardTheme: 'CLASSIC',
        players: [],
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

      mockRedis.set.mockResolvedValue('OK');

      await service.set('session-123', mockState);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'session:session-123:state',
        JSON.stringify(mockState),
        'EX',
        1800,
      );
    });

    it('should swallow Redis errors gracefully', async () => {
      const mockState = {} as GameStateType;
      mockRedis.set.mockRejectedValue(new Error('Redis write failed'));

      await expect(service.set('session-123', mockState)).resolves.not.toThrow();
    });
  });

  describe('invalidate', () => {
    it('should delete the correct key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.invalidate('session-123');

      expect(mockRedis.del).toHaveBeenCalledWith('session:session-123:state');
    });

    it('should swallow Redis del errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis delete failed'));

      await expect(service.invalidate('session-123')).resolves.not.toThrow();
    });
  });
});
