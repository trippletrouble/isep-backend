import { LeaveSessionUseCase } from './leave-session.use-case';
import { SessionRepositoryPort } from '../../ports';
import { GameStateCacheService } from '../services/game-state-cache.service';
import { SessionNotFoundError, ParticipantNotFoundError } from './errors';

describe('LeaveSessionUseCase', () => {
  let useCase: LeaveSessionUseCase;
  let mockSessionRepo: jest.Mocked<SessionRepositoryPort>;
  let mockCache: jest.Mocked<GameStateCacheService>;

  beforeEach(() => {
    mockSessionRepo = {
      findSessionById: jest.fn(),
      removeParticipant: jest.fn(),
      deleteSession: jest.fn(),
      passTurn: jest.fn(),
      updateSessionById: jest.fn(),
      createSession: jest.fn(),
      findByIdMinimal: jest.fn(),
      findUserById: jest.fn(),
      findGameStateById: jest.fn(),
      updateAfterDiceRoll: jest.fn(),
      createParticipant: jest.fn(),
      findOpenPublicSessions: jest.fn(),
    } as any;

    mockCache = {
      invalidate: jest.fn().mockResolvedValue(undefined),
    } as any;

    useCase = new LeaveSessionUseCase(mockSessionRepo, mockCache);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should throw SessionNotFoundError if session is not found', async () => {
    mockSessionRepo.findSessionById.mockResolvedValue(null);

    await expect(useCase.execute('session-id', 'user-id')).rejects.toThrow(
      SessionNotFoundError,
    );
  });

  it('should throw ParticipantNotFoundError if participant is not in session', async () => {
    const session = {
      id: 'session-id',
      status: 'WAITING',
      participants: [],
    } as any;

    mockSessionRepo.findSessionById.mockResolvedValue(session);

    await expect(useCase.execute('session-id', 'user-id')).rejects.toThrow(
      ParticipantNotFoundError,
    );
  });

  describe('WAITING status', () => {
    it('should remove participant and delete session if no participants are left', async () => {
      const session = {
        id: 'session-id',
        status: 'WAITING',
        hostId: 'host-id',
        participants: [
          { userId: 'user-1', joinedAt: new Date() },
        ],
      } as any;

      mockSessionRepo.findSessionById.mockResolvedValue(session);

      await useCase.execute('session-id', 'user-1');

      expect(mockSessionRepo.removeParticipant).toHaveBeenCalledWith(
        'session-id',
        'user-1',
      );
      expect(mockSessionRepo.deleteSession).toHaveBeenCalledWith('session-id');
      expect(mockSessionRepo.updateSessionById).not.toHaveBeenCalled();
      expect(mockCache.invalidate).toHaveBeenCalledWith('session-id');
    });

    it('should remove participant and transfer host role to oldest remaining participant if host leaves', async () => {
      const joinDate1 = new Date('2026-06-11T10:00:00Z');
      const joinDate2 = new Date('2026-06-11T09:00:00Z'); // oldest
      const joinDate3 = new Date('2026-06-11T11:00:00Z');

      const session = {
        id: 'session-id',
        status: 'WAITING',
        hostId: 'host-id',
        participants: [
          { userId: 'host-id', joinedAt: joinDate1 },
          { userId: 'user-2', joinedAt: joinDate2 },
          { userId: 'user-3', joinedAt: joinDate3 },
        ],
      } as any;

      mockSessionRepo.findSessionById.mockResolvedValue(session);

      await useCase.execute('session-id', 'host-id');

      expect(mockSessionRepo.removeParticipant).toHaveBeenCalledWith(
        'session-id',
        'host-id',
      );
      expect(mockSessionRepo.deleteSession).not.toHaveBeenCalled();
      expect(mockSessionRepo.updateSessionById).toHaveBeenCalledWith(
        'session-id',
        { hostId: 'user-2' },
      );
      expect(mockCache.invalidate).toHaveBeenCalledWith('session-id');
    });

    it('should remove participant and NOT transfer host role if non-host leaves', async () => {
      const session = {
        id: 'session-id',
        status: 'WAITING',
        hostId: 'host-id',
        participants: [
          { userId: 'host-id', joinedAt: new Date() },
          { userId: 'user-2', joinedAt: new Date() },
        ],
      } as any;

      mockSessionRepo.findSessionById.mockResolvedValue(session);

      await useCase.execute('session-id', 'user-2');

      expect(mockSessionRepo.removeParticipant).toHaveBeenCalledWith(
        'session-id',
        'user-2',
      );
      expect(mockSessionRepo.deleteSession).not.toHaveBeenCalled();
      expect(mockSessionRepo.updateSessionById).not.toHaveBeenCalled();
      expect(mockCache.invalidate).toHaveBeenCalledWith('session-id');
    });
  });

  describe('IN_PROGRESS status', () => {
    it('should start a 60-second timer and not modify database immediately', async () => {
      const session = {
        id: 'session-id',
        status: 'IN_PROGRESS',
        hostId: 'host-id',
        participants: [
          { userId: 'host-id', joinedAt: new Date() },
          { userId: 'user-2', joinedAt: new Date() },
        ],
      } as any;

      mockSessionRepo.findSessionById.mockResolvedValue(session);

      await useCase.execute('session-id', 'user-2');

      // Database should not be modified immediately
      expect(mockSessionRepo.removeParticipant).not.toHaveBeenCalled();
      expect(mockSessionRepo.deleteSession).not.toHaveBeenCalled();
      expect(mockSessionRepo.updateSessionById).not.toHaveBeenCalled();
    });

    it('should clean up participant when timer fires, including turn passing and host transfer', async () => {
      const joinDate1 = new Date('2026-06-11T10:00:00Z');
      const joinDate2 = new Date('2026-06-11T09:00:00Z');

      const session = {
        id: 'session-id',
        status: 'IN_PROGRESS',
        hostId: 'host-id',
        participants: [
          { userId: 'host-id', joinedAt: joinDate1, isCurrentTurn: true },
          { userId: 'user-2', joinedAt: joinDate2, isCurrentTurn: false },
        ],
      } as any;

      mockSessionRepo.findSessionById.mockResolvedValue(session);

      await useCase.execute('session-id', 'host-id');

      // Fast forward time by 60 seconds
      await jest.advanceTimersByTimeAsync(60000);

      // Timeout execution triggers findSessionById again
      // We must mock the second call
      expect(mockSessionRepo.findSessionById).toHaveBeenCalledTimes(2);

      // Verify actions performed during cleanup
      expect(mockSessionRepo.passTurn).toHaveBeenCalledWith('session-id', 'host-id');
      expect(mockSessionRepo.removeParticipant).toHaveBeenCalledWith(
        'session-id',
        'host-id',
      );
      expect(mockSessionRepo.updateSessionById).toHaveBeenCalledWith(
        'session-id',
        { hostId: 'user-2' },
      );
      expect(mockSessionRepo.deleteSession).not.toHaveBeenCalled();
      expect(mockCache.invalidate).toHaveBeenCalledWith('session-id');
    });

    it('should delete session if no participants are left when timer fires', async () => {
      const session = {
        id: 'session-id',
        status: 'IN_PROGRESS',
        hostId: 'host-id',
        participants: [
          { userId: 'host-id', joinedAt: new Date() },
        ],
      } as any;

      mockSessionRepo.findSessionById.mockResolvedValue(session);

      await useCase.execute('session-id', 'host-id');

      await jest.advanceTimersByTimeAsync(60000);

      expect(mockSessionRepo.deleteSession).toHaveBeenCalledWith('session-id');
      expect(mockSessionRepo.removeParticipant).not.toHaveBeenCalled();
      expect(mockCache.invalidate).toHaveBeenCalledWith('session-id');
    });

    it('should NOT clean up participant if reconnect cancels the timeout', async () => {
      const session = {
        id: 'session-id',
        status: 'IN_PROGRESS',
        hostId: 'host-id',
        participants: [
          { userId: 'host-id', joinedAt: new Date() },
          { userId: 'user-2', joinedAt: new Date() },
        ],
      } as any;

      mockSessionRepo.findSessionById.mockResolvedValue(session);

      await useCase.execute('session-id', 'user-2');

      // Reconnect logic calls cancelReconnectTimeout
      useCase.cancelReconnectTimeout('session-id', 'user-2');

      await jest.advanceTimersByTimeAsync(60000);

      // Should only call findSessionById once (during execute, not cleanup)
      expect(mockSessionRepo.findSessionById).toHaveBeenCalledTimes(1);
      expect(mockSessionRepo.removeParticipant).not.toHaveBeenCalled();
      expect(mockSessionRepo.deleteSession).not.toHaveBeenCalled();
    });
  });
});
