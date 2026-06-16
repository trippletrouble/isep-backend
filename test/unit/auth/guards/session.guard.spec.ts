import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from 'src/auth/guards/session.guard';
import { AuthService } from 'src/auth/application/auth.service';

const makeContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as unknown as ExecutionContext;

describe('SessionGuard', () => {
  let guard: SessionGuard;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    authService = {
      findByKeycloakSub: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    guard = new SessionGuard(authService);
  });

  it('rejects requests without a session cookie', async () => {
    await expect(guard.canActivate(makeContext({ cookies: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects requests when the cookie does not match a user', async () => {
    authService.findByKeycloakSub.mockResolvedValue(null);

    await expect(
      guard.canActivate(makeContext({ cookies: { session: 'kc-1' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches the authenticated user to the request', async () => {
    const request: any = { cookies: { session: 'kc-1' } };
    const user = { id: 'user-1', keycloakSub: 'kc-1' } as any;
    authService.findByKeycloakSub.mockResolvedValue(user);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(request.user).toBe(user);
  });
});
