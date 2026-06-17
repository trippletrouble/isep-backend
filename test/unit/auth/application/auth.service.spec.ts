import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/auth/application/auth.service';
import { UserRepositoryPort } from 'src/auth/ports/user-repository.port';
import { UserRole } from 'src/generated/prisma-client/enums';

const makeUser = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'user-1',
    keycloakSub: 'kc-1',
    username: 'immanuel',
    avatarUrl: null,
    role: UserRole.PLAYER,
    ...overrides,
  }) as any;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepositoryPort>;

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      findByKeycloakSub: jest.fn(),
      create: jest.fn(),
      findFinishedParticipationsByUserId: jest.fn(),
    } as unknown as jest.Mocked<UserRepositoryPort>;

    service = new AuthService(userRepository);
  });

  it('throws UnauthorizedException for incomplete OIDC profiles', async () => {
    await expect(
      service.findOrCreateUser({
        sub: '',
        username: 'immanuel',
        avatarUrl: null,
        role: UserRole.PLAYER,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns an existing user for a known Keycloak subject', async () => {
    const user = makeUser();
    userRepository.findByKeycloakSub.mockResolvedValue(user);

    await expect(
      service.findOrCreateUser({
        sub: 'kc-1',
        username: 'immanuel',
        avatarUrl: null,
        role: UserRole.PLAYER,
      }),
    ).resolves.toBe(user);

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('creates a user for a new Keycloak subject', async () => {
    const user = makeUser();
    userRepository.findByKeycloakSub.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(user);

    await expect(
      service.findOrCreateUser({
        sub: 'kc-1',
        username: 'immanuel',
        avatarUrl: undefined,
        role: UserRole.PLAYER,
      }),
    ).resolves.toBe(user);

    expect(userRepository.create).toHaveBeenCalledWith({
      keycloakSub: 'kc-1',
      username: 'immanuel',
      avatarUrl: null,
      role: UserRole.PLAYER,
    });
  });

  it('finds a user by Keycloak subject', async () => {
    const user = makeUser();
    userRepository.findByKeycloakSub.mockResolvedValue(user);

    await expect(service.findByKeycloakSub('kc-1')).resolves.toBe(user);
  });
});
