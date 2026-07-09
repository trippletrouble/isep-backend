/* eslint-disable @typescript-eslint/unbound-method */
import { GetSessionPlayersUseCase } from './get-session-players.use-case';
import { SessionRepositoryPort } from '../../../../ports';
import { SessionNotFoundError } from '../../errors';
import { PlayerColor, PlayerType } from '../../../../../generated/prisma-client/client';
import { SessionWithParticipants } from '../../types';

describe('GetSessionPlayersUseCase', () => {
  let useCase: GetSessionPlayersUseCase;
  let sessionRepoMock: jest.Mocked<SessionRepositoryPort>;

  beforeEach(() => {
    sessionRepoMock = {
      findSessionById: jest.fn(),
    } as unknown as jest.Mocked<SessionRepositoryPort>;

    useCase = new GetSessionPlayersUseCase(sessionRepoMock);
  });

  it('should return an array of PlayerResponseDto for all participants of an existing session', async () => {
    const mockSessionId = 'session-123';
    const mockDate = new Date();
    const mockSession: SessionWithParticipants = {
      id: mockSessionId,
      status: 'WAITING',
      mode: 'CLASSIC',
      boardTheme: 'CLASSIC',
      numberOfPlayers: 4,
      isPrivate: false,
      inviteToken: ***ENTFERNT***
      turnTimeLimitSeconds: null,
      additionalRules: [],
      hostId: 'user-host',
      currentPlayerId: null,
      turnNumber: 0,
      lastDiceValue: null,
      diceRolledThisTurn: false,
      consecutiveSixes: 0,
      winnerId: null,
      replayLogRef: null,
      startedAt: null,
      finishedAt: null,
      durationSeconds: null,
      createdAt: mockDate,
      updatedAt: mockDate,
      participants: [
        {
          id: 'participant-1',
          sessionId: mockSessionId,
          userId: 'user-1',
          color: PlayerColor.RED,
          type: PlayerType.HUMAN,
          isBot: false,
          isCurrentTurn: true,
          hasFinished: false,
          figuresInGoal: 0,
          placement: null,
          figuresCaptured: 0,
          joinedAt: mockDate,
          updatedAt: mockDate,
          user: { username: 'user-1' },
        },
        {
          id: 'participant-2',
          sessionId: mockSessionId,
          userId: 'user-2',
          color: PlayerColor.BLUE,
          type: PlayerType.HUMAN,
          isBot: true,
          isCurrentTurn: false,
          hasFinished: false,
          figuresInGoal: 1,
          placement: null,
          figuresCaptured: 2,
          joinedAt: mockDate,
          updatedAt: mockDate,
          user: { username: 'user-2' },
        },
      ],
    };

    sessionRepoMock.findSessionById.mockResolvedValue(mockSession);

    const result = await useCase.execute(mockSessionId);

    expect(sessionRepoMock.findSessionById).toHaveBeenCalledWith(mockSessionId);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'participant-1',
      sessionId: mockSessionId,
      userId: 'user-1',
      color: PlayerColor.RED,
      type: PlayerType.HUMAN,
      isBot: false,
      isCurrentTurn: true,
      hasFinished: false,
      figuresInGoal: 0,
      figuresCaptured: 0,
      placement: null,
      joinedAt: mockDate,
    });
    expect(result[1]).toEqual({
      id: 'participant-2',
      sessionId: mockSessionId,
      userId: 'user-2',
      color: PlayerColor.BLUE,
      type: PlayerType.HUMAN,
      isBot: true,
      isCurrentTurn: false,
      hasFinished: false,
      figuresInGoal: 1,
      figuresCaptured: 2,
      placement: null,
      joinedAt: mockDate,
    });
  });

  it('should return an empty array when session has no participants', async () => {
    const mockSessionId = 'session-123';
    const mockDate = new Date();
    const mockSession: SessionWithParticipants = {
      id: mockSessionId,
      status: 'WAITING',
      mode: 'CLASSIC',
      boardTheme: 'CLASSIC',
      numberOfPlayers: 4,
      isPrivate: false,
      inviteToken: ***ENTFERNT***
      turnTimeLimitSeconds: null,
      additionalRules: [],
      hostId: 'user-host',
      currentPlayerId: null,
      turnNumber: 0,
      lastDiceValue: null,
      diceRolledThisTurn: false,
      consecutiveSixes: 0,
      winnerId: null,
      replayLogRef: null,
      startedAt: null,
      finishedAt: null,
      durationSeconds: null,
      createdAt: mockDate,
      updatedAt: mockDate,
      participants: [],
    };

    sessionRepoMock.findSessionById.mockResolvedValue(mockSession);

    const result = await useCase.execute(mockSessionId);

    expect(sessionRepoMock.findSessionById).toHaveBeenCalledWith(mockSessionId);
    expect(result).toEqual([]);
  });

  it('should throw SessionNotFoundError when session does not exist', async () => {
    const mockSessionId = 'session-nonexistent';
    sessionRepoMock.findSessionById.mockResolvedValue(null);

    await expect(useCase.execute(mockSessionId)).rejects.toThrow(
      SessionNotFoundError,
    );
    expect(sessionRepoMock.findSessionById).toHaveBeenCalledWith(mockSessionId);
  });
});
