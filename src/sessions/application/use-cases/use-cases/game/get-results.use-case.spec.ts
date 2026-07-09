import { GetResultsUseCase } from './get-results.use-case';
import { SessionRepositoryPort } from '../../../../ports';
import { SessionNotFoundError, InvalidSessionStatusError } from '../../errors';
import { SessionWithParticipants } from '../../types';
import { PlayerColor } from '$gen/prisma-client/client';

describe('GetResultsUseCase', () => {
  let useCase: GetResultsUseCase;
  let mockSessionRepo: jest.Mocked<SessionRepositoryPort>;

  beforeEach(() => {
    mockSessionRepo = {
      findSessionById: jest.fn(),
    } as unknown as jest.Mocked<SessionRepositoryPort>;

    useCase = new GetResultsUseCase(mockSessionRepo);
  });

  it('should throw SessionNotFoundError if session does not exist', async () => {
    mockSessionRepo.findSessionById.mockResolvedValue(null);

    await expect(useCase.execute('invalid-id')).rejects.toThrow(
      SessionNotFoundError,
    );
  });

  it('should throw InvalidSessionStatusError if session status is not FINISHED', async () => {
    const session = {
      id: 'session-id',
      status: 'IN_PROGRESS',
      participants: [],
    } as unknown as SessionWithParticipants;

    mockSessionRepo.findSessionById.mockResolvedValue(session);

    await expect(useCase.execute('session-id')).rejects.toThrow(
      InvalidSessionStatusError,
    );
  });

  it('should return sorted placement results, filtering out participants without placement', async () => {
    const session = {
      id: 'session-id',
      status: 'FINISHED',
      participants: [
        {
          userId: 'user-2',
          placement: 2,
          color: PlayerColor.BLUE,
          figuresInGoal: 3,
          figuresCaptured: 1,
          user: { username: 'user-2-name' },
        },
        {
          userId: 'user-3',
          placement: null,
          color: PlayerColor.GREEN,
          figuresInGoal: 1,
          figuresCaptured: 0,
          user: { username: 'user-3-name' },
        },
        {
          userId: 'user-1',
          placement: 1,
          color: PlayerColor.RED,
          figuresInGoal: 4,
          figuresCaptured: 5,
          user: { username: 'user-1-name' },
        },
      ],
    } as unknown as SessionWithParticipants;

    mockSessionRepo.findSessionById.mockResolvedValue(session);

    const result = await useCase.execute('session-id');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      placement: 1,
      userId: 'user-1',
      username: 'user-1-name',
      color: PlayerColor.RED,
      figuresInGoal: 4,
      figuresCaptured: 5,
    });
    expect(result[1]).toEqual({
      placement: 2,
      userId: 'user-2',
      username: 'user-2-name',
      color: PlayerColor.BLUE,
      figuresInGoal: 3,
      figuresCaptured: 1,
    });
  });
});
