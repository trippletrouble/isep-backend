import { ReconnectUseCase } from './reconnect.use-case';
import { SessionRepositoryPort } from '../../ports';
import { LeaveSessionUseCase } from './leave-session.use-case';
import { SessionNotFoundError, ParticipantNotFoundError } from './errors';

describe('ReconnectUseCase', () => {
  let useCase: ReconnectUseCase;
  let mockSessionRepo: jest.Mocked<SessionRepositoryPort>;
  let mockLeaveSessionUseCase: jest.Mocked<LeaveSessionUseCase>;

  beforeEach(() => {
    mockSessionRepo = {
      findSessionById: jest.fn(),
      findGameStateById: jest.fn(),
    } as any;

    mockLeaveSessionUseCase = {
      cancelReconnectTimeout: jest.fn(),
    } as any;

    useCase = new ReconnectUseCase(mockSessionRepo, mockLeaveSessionUseCase);
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
      status: 'IN_PROGRESS',
      participants: [{ userId: 'other-user' }],
    } as any;

    mockSessionRepo.findSessionById.mockResolvedValue(session);

    await expect(useCase.execute('session-id', 'user-id')).rejects.toThrow(
      ParticipantNotFoundError,
    );
  });

  it('should cancel active reconnect timeout if session status is IN_PROGRESS', async () => {
    const session = {
      id: 'session-id',
      status: 'IN_PROGRESS',
      participants: [{ userId: 'user-id' }],
    } as any;

    const gameState = { sessionId: 'session-id', status: 'IN_PROGRESS' } as any;

    mockSessionRepo.findSessionById.mockResolvedValue(session);
    mockSessionRepo.findGameStateById.mockResolvedValue(gameState);

    const result = await useCase.execute('session-id', 'user-id');

    expect(mockLeaveSessionUseCase.cancelReconnectTimeout).toHaveBeenCalledWith(
      'session-id',
      'user-id',
    );
    expect(result).toBe(gameState);
  });

  it('should NOT cancel active reconnect timeout if session status is WAITING', async () => {
    const session = {
      id: 'session-id',
      status: 'WAITING',
      participants: [{ userId: 'user-id' }],
    } as any;

    const gameState = { sessionId: 'session-id', status: 'WAITING' } as any;

    mockSessionRepo.findSessionById.mockResolvedValue(session);
    mockSessionRepo.findGameStateById.mockResolvedValue(gameState);

    const result = await useCase.execute('session-id', 'user-id');

    expect(mockLeaveSessionUseCase.cancelReconnectTimeout).not.toHaveBeenCalled();
    expect(result).toBe(gameState);
  });

  it('should throw SessionNotFoundError if findGameStateById returns null', async () => {
    const session = {
      id: 'session-id',
      status: 'IN_PROGRESS',
      participants: [{ userId: 'user-id' }],
    } as any;

    mockSessionRepo.findSessionById.mockResolvedValue(session);
    mockSessionRepo.findGameStateById.mockResolvedValue(null);

    await expect(useCase.execute('session-id', 'user-id')).rejects.toThrow(
      SessionNotFoundError,
    );
  });
});
