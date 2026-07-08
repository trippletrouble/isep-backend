import { GetHistoryUseCase } from './get-history.use-case';
import { SessionRepositoryPort } from '../../../../ports';
import { SessionNotFoundError } from '../../errors';
import { GameHistoryEventDto } from '../../../dtos';
import { Session } from '$gen/prisma-class/session';

describe('GetHistoryUseCase', () => {
  let useCase: GetHistoryUseCase;
  let mockSessionRepo: jest.Mocked<SessionRepositoryPort>;

  beforeEach(() => {
    mockSessionRepo = {
      findByIdMinimal: jest.fn(),
      findHistoryBySessionId: jest.fn(),
    } as unknown as jest.Mocked<SessionRepositoryPort>;

    useCase = new GetHistoryUseCase(mockSessionRepo);
  });

  it('should return chronological history when session exists', async () => {
    const mockSession = { id: 'session-1' } as Session;
    const mockHistory: GameHistoryEventDto[] = [
      {
        id: 1,
        sequenceNr: 1,
        sessionId: 'session-1',
        participantId: 'part-1',
        color: 'RED',
        actionType: 'MOVE',
        diceValue: 4,
        figureId: 1,
        fromPosition: 0,
        toPosition: 4,
        outcome: 'MOVED',
        createdAt: '2026-06-13T12:00:00.000Z',
      },
    ];

    mockSessionRepo.findByIdMinimal.mockResolvedValue(mockSession);
    mockSessionRepo.findHistoryBySessionId.mockResolvedValue(mockHistory);

    const result = await useCase.execute('session-1');

    expect(result).toBe(mockHistory);
    expect(mockSessionRepo.findByIdMinimal).toHaveBeenCalledWith('session-1');
    expect(mockSessionRepo.findHistoryBySessionId).toHaveBeenCalledWith('session-1');
  });

  it('should throw SessionNotFoundError when session does not exist', async () => {
    mockSessionRepo.findByIdMinimal.mockResolvedValue(null);

    await expect(useCase.execute('session-1')).rejects.toThrow(SessionNotFoundError);

    expect(mockSessionRepo.findByIdMinimal).toHaveBeenCalledWith('session-1');
    expect(mockSessionRepo.findHistoryBySessionId).not.toHaveBeenCalled();
  });
});
