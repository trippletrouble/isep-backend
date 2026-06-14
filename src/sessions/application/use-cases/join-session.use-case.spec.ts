import { JoinSessionUseCase } from './join-session.use-case';
import { SessionRepositoryPort } from '../../ports';
import { SessionWithParticipants } from './types';
import {
  SessionNotFoundError,
  InvalidSessionStatusError,
  LobbyFullError,
  ColorAlreadyTakenError,
  InvalidInviteTokenError,
} from './errors';
import { GameStateType } from './types/game-state.type';
import {
  PlayerColor,
  GameStatus,
  GameMode,
  BoardTheme,
} from '../../../generated/prisma-client/enums';

const makeSession = (overrides: any = {}): SessionWithParticipants => ({
  id: 'session-1',
  status: GameStatus.WAITING,
  numberOfPlayers: 4,
  isPrivate: false,
  inviteToken: ***ENTFERNT***
  participants: [],
  ...overrides,
});

const makeGameState = (sessionId = 'session-1'): GameStateType => ({
  sessionId,
  status: GameStatus.WAITING,
  mode: GameMode.CLASSIC,
  boardTheme: BoardTheme.CLASSIC,
  players: [],
  figures: [],
  currentPlayerId: null,
  turnNumber: 0,
  lastDiceValue: null,
  diceRolledThisTurn: false,
  consecutiveSixes: 0,
  activeRules: [],
  winnerId: null,
  createdAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
});

describe('JoinSessionUseCase', () => {
  let useCase: JoinSessionUseCase;
  let repo: jest.Mocked<SessionRepositoryPort>;

  beforeEach(() => {
    repo = {
      findSessionById: jest.fn(),
      findGameStateById: jest.fn(),
      createParticipant: jest.fn(),
    } as unknown as jest.Mocked<SessionRepositoryPort>;

    useCase = new JoinSessionUseCase(repo);
  });

  it('joins a public session without preferred color and auto-assigns RED', async () => {
    repo.findSessionById.mockResolvedValue(makeSession());
    const gameState = makeGameState();
    repo.findGameStateById.mockResolvedValue(gameState);
    repo.createParticipant.mockResolvedValue({} as any);

    const result = await useCase.execute('session-1', 'user-1');

    expect(repo.createParticipant).toHaveBeenCalledTimes(1);
    const dto = repo.createParticipant.mock.calls[0][0];
    expect(dto.color).toBe(PlayerColor.RED);
    expect(dto.userId).toBe('user-1');
    expect(result).toBe(gameState);
  });

  it('joins a public session with a preferred color', async () => {
    repo.findSessionById.mockResolvedValue(makeSession());
    repo.findGameStateById.mockResolvedValue(makeGameState());
    repo.createParticipant.mockResolvedValue({} as any);

    await useCase.execute('session-1', 'user-1', PlayerColor.BLUE);

    const dto = repo.createParticipant.mock.calls[0][0];
    expect(dto.color).toBe(PlayerColor.BLUE);
  });

  it('throws SessionNotFoundError when session does not exist', async () => {
    repo.findSessionById.mockResolvedValue(null);

    await expect(useCase.execute('missing', 'user-1')).rejects.toBeInstanceOf(
      SessionNotFoundError,
    );
  });

  it('throws InvalidSessionStatusError when session is not WAITING', async () => {
    repo.findSessionById.mockResolvedValue(
      makeSession({ status: 'IN_PROGRESS' }),
    );

    await expect(useCase.execute('session-1', 'user-1')).rejects.toBeInstanceOf(
      InvalidSessionStatusError,
    );
  });

  it('throws LobbyFullError when session is at capacity', async () => {
    repo.findSessionById.mockResolvedValue(
      makeSession({
        numberOfPlayers: 2,
        participants: [
          { userId: 'u1', color: PlayerColor.RED },
          { userId: 'u2', color: PlayerColor.BLUE },
        ],
      }),
    );

    await expect(useCase.execute('session-1', 'user-3')).rejects.toBeInstanceOf(
      LobbyFullError,
    );
  });

  it('throws ColorAlreadyTakenError when preferred color is taken', async () => {
    repo.findSessionById.mockResolvedValue(
      makeSession({
        participants: [{ userId: 'u1', color: PlayerColor.RED }],
      }),
    );

    await expect(
      useCase.execute('session-1', 'user-2', PlayerColor.RED),
    ).rejects.toBeInstanceOf(ColorAlreadyTakenError);
  });

  it('throws InvalidInviteTokenError when joining a private session without token', async () => {
    repo.findSessionById.mockResolvedValue(
      makeSession({ isPrivate: true, inviteToken: 'secret' }),
    );

    await expect(useCase.execute('session-1', 'user-1')).rejects.toBeInstanceOf(
      InvalidInviteTokenError,
    );
  });

  it('throws InvalidInviteTokenError when invite token is wrong', async () => {
    repo.findSessionById.mockResolvedValue(
      makeSession({ isPrivate: true, inviteToken: 'secret' }),
    );

    await expect(
      useCase.execute('session-1', 'user-1', undefined, 'wrong-token'),
    ).rejects.toBeInstanceOf(InvalidInviteTokenError);
  });

  it('joins a private session with correct invite token', async () => {
    repo.findSessionById.mockResolvedValue(
      makeSession({ isPrivate: true, inviteToken: 'secret' }),
    );
    repo.findGameStateById.mockResolvedValue(makeGameState());
    repo.createParticipant.mockResolvedValue({} as any);

    const result = await useCase.execute(
      'session-1',
      'user-1',
      undefined,
      'secret',
    );

    expect(repo.createParticipant).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('returns current game state idempotently when player is already a participant', async () => {
    repo.findSessionById.mockResolvedValue(
      makeSession({
        participants: [{ userId: 'user-1', color: PlayerColor.RED }],
      }),
    );
    const gameState = makeGameState();
    repo.findGameStateById.mockResolvedValue(gameState);

    const result = await useCase.execute('session-1', 'user-1');

    expect(repo.createParticipant).not.toHaveBeenCalled();
    expect(result).toBe(gameState);
  });

  it('auto-assigns next available color when some are taken', async () => {
    repo.findSessionById.mockResolvedValue(
      makeSession({
        participants: [
          { userId: 'u1', color: PlayerColor.RED },
          { userId: 'u2', color: PlayerColor.BLUE },
        ],
      }),
    );
    repo.findGameStateById.mockResolvedValue(makeGameState());
    repo.createParticipant.mockResolvedValue({} as any);

    await useCase.execute('session-1', 'user-3');

    const dto = repo.createParticipant.mock.calls[0][0];
    expect(dto.color).toBe(PlayerColor.GREEN);
  });
});
