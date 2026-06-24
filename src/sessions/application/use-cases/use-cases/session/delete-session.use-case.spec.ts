import { DeleteSessionUseCase } from './delete-session.use-case';
import { SessionRepositoryPort } from '../../../../ports';
import { GameStateCacheService } from '../../../services';
import {
  InvalidSessionStatusError,
  NotHostError,
  SessionNotFoundError,
} from '../../errors';
import { Session } from '$gen/prisma-class/session';

describe('DeleteSessionUseCase', () => {
  let useCase: DeleteSessionUseCase;
  let mockSessionRepo: jest.Mocked<SessionRepositoryPort>;
  let mockCache: jest.Mocked<GameStateCacheService>;

  beforeEach(() => {
    mockSessionRepo = {
      findByIdMinimal: jest.fn(),
      deleteSessionById: jest.fn(),
    } as unknown as jest.Mocked<SessionRepositoryPort>;

    mockCache = {
      invalidate: jest.fn().mockResolvedValue(undefined),
    } as any;

    useCase = new DeleteSessionUseCase(mockSessionRepo, mockCache);
  });

  it('should successfully delete a session when status is WAITING and user is the host', async () => {
    const sessionId = 'session-123';
    const hostId = 'host-456';
    const mockSession = {
      id: sessionId,
      hostId: hostId,
      status: 'WAITING',
    } as Session;

    mockSessionRepo.findByIdMinimal.mockResolvedValue(mockSession);
    mockSessionRepo.deleteSessionById.mockResolvedValue(undefined);

    await expect(useCase.execute(sessionId, hostId)).resolves.not.toThrow();

    expect(mockSessionRepo.findByIdMinimal).toHaveBeenCalledWith(sessionId);
    expect(mockSessionRepo.deleteSessionById).toHaveBeenCalledWith(sessionId);
    expect(mockCache.invalidate).toHaveBeenCalledWith(sessionId);
  });

  it('should throw SessionNotFoundError when session does not exist', async () => {
    const sessionId = 'non-existent-session';
    const hostId = 'host-456';

    mockSessionRepo.findByIdMinimal.mockResolvedValue(null);

    await expect(useCase.execute(sessionId, hostId)).rejects.toThrow(
      SessionNotFoundError,
    );

    expect(mockSessionRepo.findByIdMinimal).toHaveBeenCalledWith(sessionId);
    expect(mockSessionRepo.deleteSessionById).not.toHaveBeenCalled();
  });

  it('should throw NotHostError when requester is not the host', async () => {
    const sessionId = 'session-123';
    const hostId = 'host-456';
    const requesterId = 'not-host-789';
    const mockSession = {
      id: sessionId,
      hostId: hostId,
      status: 'WAITING',
    } as Session;

    mockSessionRepo.findByIdMinimal.mockResolvedValue(mockSession);

    await expect(useCase.execute(sessionId, requesterId)).rejects.toThrow(
      NotHostError,
    );

    expect(mockSessionRepo.findByIdMinimal).toHaveBeenCalledWith(sessionId);
    expect(mockSessionRepo.deleteSessionById).not.toHaveBeenCalled();
  });

  it('should throw InvalidSessionStatusError when session is not in WAITING status', async () => {
    const sessionId = 'session-123';
    const hostId = 'host-456';
    const mockSession = {
      id: sessionId,
      hostId: hostId,
      status: 'IN_PROGRESS',
    } as Session;

    mockSessionRepo.findByIdMinimal.mockResolvedValue(mockSession);

    await expect(useCase.execute(sessionId, hostId)).rejects.toThrow(
      InvalidSessionStatusError,
    );

    expect(mockSessionRepo.findByIdMinimal).toHaveBeenCalledWith(sessionId);
    expect(mockSessionRepo.deleteSessionById).not.toHaveBeenCalled();
  });

  it('should not call cache.invalidate when deleteSessionById throws', async () => {
    const sessionId = 'session-123';
    const hostId = 'host-456';
    const mockSession = {
      id: sessionId,
      hostId: hostId,
      status: 'WAITING',
    } as Session;

    mockSessionRepo.findByIdMinimal.mockResolvedValue(mockSession);
    mockSessionRepo.deleteSessionById.mockRejectedValue(new Error('DB error'));

    await expect(useCase.execute(sessionId, hostId)).rejects.toThrow('DB error');

    expect(mockCache.invalidate).not.toHaveBeenCalled();
  });
});
