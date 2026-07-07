import { Test, TestingModule } from '@nestjs/testing';
import { FlyDomainService } from './fly-domain.service';
import { GameStateFigureType } from '../../application';

describe('FlyDomainService', () => {
  let service: FlyDomainService;
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlyDomainService],
    }).compile();

    service = module.get<FlyDomainService>(FlyDomainService);
    global.fetch = jest.fn();
  });

  describe('canAssignFly', () => {
    it('should return false if activeFlyCount >= 3', () => {
      const figure: GameStateFigureType = {
        id: 1,
        playerId: 'p1',
        position: 10,
        status: 'ACTIVE',
        hasPlagueFly: false,
        flyDebuffCount: 0,
      };
      expect(service.canAssignFly(3, figure)).toBe(false);
      expect(service.canAssignFly(4, figure)).toBe(false);
    });

    it('should return false if figure already has fly', () => {
      const figure: GameStateFigureType = {
        id: 1,
        playerId: 'p1',
        position: 10,
        status: 'ACTIVE',
        hasPlagueFly: true,
        flyDebuffCount: 0,
      };
      expect(service.canAssignFly(0, figure)).toBe(false);
    });

    it('should return false if figure is in home nest (position -1)', () => {
      const figure: GameStateFigureType = {
        id: 1,
        playerId: 'p1',
        position: -1,
        status: 'HOME',
        hasPlagueFly: false,
        flyDebuffCount: 0,
      };
      expect(service.canAssignFly(0, figure)).toBe(false);
    });

    it('should return false if figure status is GOAL', () => {
      const figure: GameStateFigureType = {
        id: 1,
        playerId: 'p1',
        position: 72,
        status: 'GOAL',
        hasPlagueFly: false,
        flyDebuffCount: 0,
      };
      expect(service.canAssignFly(0, figure)).toBe(false);
    });

    it('should return false if figure position is goal lane', () => {
      // Red goal lane starts at 52, size 5
      const figure: GameStateFigureType = {
        id: 1,
        playerId: 'p1',
        position: 54, // in lane
        status: 'ACTIVE',
        hasPlagueFly: false,
        flyDebuffCount: 0,
      };
      expect(service.canAssignFly(0, figure)).toBe(false);
    });

    it('should return true for eligible active figure', () => {
      const figure: GameStateFigureType = {
        id: 1,
        playerId: 'p1',
        position: 10,
        status: 'ACTIVE',
        hasPlagueFly: false,
        flyDebuffCount: 0,
      };
      expect(service.canAssignFly(1, figure)).toBe(true);
    });
  });

  describe('tryAssignFly', () => {
    it('should return true if API returns ok and assigned: true', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ assigned: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.tryAssignFly('g1', 'p1', 'f1');
      expect(result).toBe(true);
    });

    it('should return false if API returns ok: false', async () => {
      const mockResponse = {
        ok: false,
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.tryAssignFly('g1', 'p1', 'f1');
      expect(result).toBe(false);
    });

    it('should return true as fallback if fetch throws error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.tryAssignFly('g1', 'p1', 'f1');
      expect(result).toBe(true);
    });
  });

  describe('applyRoll', () => {
    it('should return API payload if API request is successful', async () => {
      const apiResponse = {
        originalValue: 5,
        modifiedValue: 3,
        debuffApplied: true,
        debuffValue: 2,
        flyRemoved: false,
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(apiResponse),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.applyRoll('g1', 'f1', 5);
      expect(result).toEqual(apiResponse);
    });

    it('should fallback locally if API request fails', async () => {
      const mockResponse = {
        ok: false,
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.applyRoll('g1', 'f1', 4);
      expect(result.originalValue).toBe(4);
      expect(result.debuffApplied).toBe(true);
      expect(result.modifiedValue).toBeLessThanOrEqual(4);
      expect(result.modifiedValue).toBeGreaterThanOrEqual(1);
    });
  });

  describe('resolveKick', () => {
    it('should return API payload if API request succeeds', async () => {
      const apiResponse = {
        bothFliesRemoved: false,
        flyTransferred: true,
        attackerFlyRemoved: false,
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(apiResponse),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.resolveKick('g1', 'f1', 'f2');
      expect(result).toEqual(apiResponse);
    });

    it('should return fallback if API request fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Offline'));

      const result = await service.resolveKick('g1', 'f1', 'f2');
      expect(result).toEqual({
        bothFliesRemoved: false,
        flyTransferred: false,
        attackerFlyRemoved: false,
      });
    });
  });

  describe('handleReachGoal', () => {
    it('should return API payload if API request succeeds', async () => {
      const apiResponse = { flyRemoved: false };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(apiResponse),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.handleReachGoal('g1', 'f1');
      expect(result).toEqual(apiResponse);
    });

    it('should return flyRemoved: true if API fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Offline'));

      const result = await service.handleReachGoal('g1', 'f1');
      expect(result).toEqual({ flyRemoved: true });
    });
  });

  describe('shouldRemoveFlyAfterDebuff', () => {
    it('should return true if debuffCount >= 3', () => {
      expect(service.shouldRemoveFlyAfterDebuff(3)).toBe(true);
      expect(service.shouldRemoveFlyAfterDebuff(4)).toBe(true);
    });

    it('should return false if debuffCount < 3', () => {
      expect(service.shouldRemoveFlyAfterDebuff(2)).toBe(false);
      expect(service.shouldRemoveFlyAfterDebuff(0)).toBe(false);
    });
  });
});
