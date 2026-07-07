import { Test, TestingModule } from '@nestjs/testing';
import { FlyDomainService } from './fly-domain.service';
import { GameStateFigureType } from '../../application';
import { PrismaService } from '../../../prisma';

describe('FlyDomainService', () => {
  let service: FlyDomainService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      figure: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlyDomainService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<FlyDomainService>(FlyDomainService);
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
    });

    it('should return false if figure already has a fly', () => {
      const figure: GameStateFigureType = {
        id: 1,
        playerId: 'p1',
        position: 10,
        status: 'ACTIVE',
        hasPlagueFly: true,
        flyDebuffCount: 0,
      };
      expect(service.canAssignFly(1, figure)).toBe(false);
    });

    it('should return false if figure is in home position (-1)', () => {
      const figure: GameStateFigureType = {
        id: 1,
        playerId: 'p1',
        position: -1,
        status: 'HOME',
        hasPlagueFly: false,
        flyDebuffCount: 0,
      };
      expect(service.canAssignFly(1, figure)).toBe(false);
    });

    it('should return false if figure is in final goal target', () => {
      const figure: GameStateFigureType = {
        id: 1,
        playerId: 'p1',
        position: 75,
        status: 'GOAL',
        hasPlagueFly: false,
        flyDebuffCount: 0,
      };
      expect(service.canAssignFly(1, figure)).toBe(false);
    });

    it('should return false if figure is in the goal lane', () => {
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
    it('should always return true', async () => {
      const result = await service.tryAssignFly('g1', 'p1', 'f1');
      expect(result).toBe(true);
    });
  });

  describe('applyRoll', () => {
    it('should calculate local debuff and return flyRemoved as false', async () => {
      const result = await service.applyRoll('g1', 'f1', 5);
      expect(result.originalValue).toBe(5);
      expect(result.debuffApplied).toBe(true);
      expect(result.modifiedValue).toBeLessThanOrEqual(5);
      expect(result.modifiedValue).toBeGreaterThanOrEqual(1);
      expect(result.flyRemoved).toBe(false);
    });
  });

  describe('resolveKick', () => {
    it('should return bothFliesRemoved if both figures have a fly', async () => {
      mockPrisma.figure.findUnique
        .mockResolvedValueOnce({ id: 1, hasPlagueFly: true })
        .mockResolvedValueOnce({ id: 2, hasPlagueFly: true });

      const result = await service.resolveKick('g1', '1', '2');
      expect(result).toEqual({
        bothFliesRemoved: true,
        flyTransferred: false,
        attackerFlyRemoved: false,
      });
    });

    it('should return flyTransferred if attacker has no fly but victim has a fly', async () => {
      mockPrisma.figure.findUnique
        .mockResolvedValueOnce({ id: 1, hasPlagueFly: false })
        .mockResolvedValueOnce({ id: 2, hasPlagueFly: true });

      const result = await service.resolveKick('g1', '1', '2');
      expect(result).toEqual({
        bothFliesRemoved: false,
        flyTransferred: true,
        attackerFlyRemoved: false,
      });
    });

    it('should return attackerFlyRemoved if attacker has fly but victim has no fly', async () => {
      mockPrisma.figure.findUnique
        .mockResolvedValueOnce({ id: 1, hasPlagueFly: true })
        .mockResolvedValueOnce({ id: 2, hasPlagueFly: false });

      const result = await service.resolveKick('g1', '1', '2');
      expect(result).toEqual({
        bothFliesRemoved: false,
        flyTransferred: false,
        attackerFlyRemoved: true,
      });
    });
  });

  describe('handleReachGoal', () => {
    it('should return flyRemoved: true', async () => {
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
