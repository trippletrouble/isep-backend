import { GenerateInviteUseCase } from './generate-invite.use-case';
import { SessionRepositoryPort } from '../../../../ports';
import { ConfigService } from '@nestjs/config';
import {
  SessionNotFoundError,
  InvalidSessionStatusError,
  OnlyHostCanInviteError,
} from '../../errors';
import { GameStatus } from '..prisma-clientenums';
import { SessionWithParticipants } from '../../types';

const makeSession = (overrides: any = {}): SessionWithParticipants => ({
  id: 'session-1',
  status: GameStatus.WAITING,
  numberOfPlayers: 4,
  isPrivate: true,
  inviteToken: ***ENTFERNT***
  inviteTokenExpiresAt: ***ENTFERNT***
  hostId: 'host-1',
  participants: [],
  ...overrides,
});

describe('GenerateInviteUseCase', () => {
  let useCase: GenerateInviteUseCase;
  let repo: jest.Mocked<SessionRepositoryPort>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    repo = {
      findSessionById: jest.fn(),
      updateSessionInvite: jest.fn(),
    } as unknown as jest.Mocked<SessionRepositoryPort>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    useCase = new GenerateInviteUseCase(repo, configService);
  });

  it('generates an invite token and URL successfully as host', async () => {
    configService.get.mockReturnValue('https://ludo.com');
    const session = makeSession();
    repo.findSessionById.mockResolvedValue(session);
    repo.updateSessionInvite.mockResolvedValue(undefined);

    const result = await useCase.execute('session-1', 'host-1');

    expect(repo.findSessionById).toHaveBeenCalledWith('session-1');
    expect(repo.updateSessionInvite).toHaveBeenCalledTimes(1);
    const [calledSessionId, calledToken, calledExpiresAt] = repo.updateSessionInvite.mock.calls[0];
    
    expect(calledSessionId).toBe('session-1');
    expect(calledToken).toBeDefined();
    expect(calledToken).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i); // UUID format
    expect(calledExpiresAt).toBeInstanceOf(Date);
    
    // Check that expiresAt is set to ~24 hours in the future
    const diffMs = calledExpiresAt.getTime() - Date.now();
    const diffHours = diffMs / (1000 * 60 * 60);
    expect(diffHours).toBeCloseTo(24, 0.1);

    expect(result.inviteToken).toBe(calledToken);
    expect(result.inviteUrl).toBe('https://ludo.com/sessions/session-1/join?token=' + calledToken);
    expect(result.expiresAt).toBe(calledExpiresAt);
  });

  it('defaults the baseUrl to http://localhost:3000 if FRONTEND_URL config is missing', async () => {
    configService.get.mockReturnValue(undefined);
    const session = makeSession();
    repo.findSessionById.mockResolvedValue(session);
    repo.updateSessionInvite.mockResolvedValue(undefined);

    const result = await useCase.execute('session-1', 'host-1');

    expect(result.inviteUrl).toContain('http://localhost:3000/sessions/session-1/join?token=');
  });

  it('throws SessionNotFoundError if session does not exist', async () => {
    repo.findSessionById.mockResolvedValue(null);

    await expect(useCase.execute('missing-session', 'host-1')).rejects.toBeInstanceOf(
      SessionNotFoundError,
    );
  });

  it('throws InvalidSessionStatusError if session is not in WAITING status', async () => {
    repo.findSessionById.mockResolvedValue(
      makeSession({ status: GameStatus.IN_PROGRESS }),
    );

    await expect(useCase.execute('session-1', 'host-1')).rejects.toBeInstanceOf(
      InvalidSessionStatusError,
    );
  });

  it('throws OnlyHostCanInviteError if user is not the host of the session', async () => {
    repo.findSessionById.mockResolvedValue(makeSession());

    await expect(useCase.execute('session-1', 'not-host')).rejects.toBeInstanceOf(
      OnlyHostCanInviteError,
    );
  });
});
