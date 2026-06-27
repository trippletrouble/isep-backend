import { UnauthorizedException } from '@nestjs/common';

jest.mock('src/common/config/app.config', () => ({
  appConfig: { node_env: 'test', after_login_redirect_url: '/' },
}));

import { AuthController } from 'src/auth/adapters/api/auth.controller';
import { AuthService } from 'src/auth/application/auth.service';
import { appConfig } from 'src/common/config/app.config';
import { UserRole } from 'src/generated/prisma-client/enums';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    appConfig.node_env = 'test';

    authService = {
      findByKeycloakSub: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    controller = new AuthController(authService);
  });

  it('delegates oauth login handling to the passport guard', () => {
    expect(controller.login()).toBeUndefined();
  });

  it('sets a session cookie and redirects after the OIDC callback', () => {
    const req = { user: { keycloakSub: 'kc-1' } } as any;
    const res = {
      cookie: jest.fn(),
      redirect: jest.fn(),
    } as any;

    controller.callback(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'session',
      'kc-1',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60,
      }),
    );
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('sets secure session cookies in production', () => {
    appConfig.node_env = 'production';
    const req = { user: { keycloakSub: 'kc-1' } } as any;
    const res = {
      cookie: jest.fn(),
      redirect: jest.fn(),
    } as any;

    controller.callback(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'session',
      'kc-1',
      expect.objectContaining({ secure: true }),
    );
  });

  it('rejects session lookup without a session cookie', async () => {
    await expect(controller.session({ cookies: {} } as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects session lookup without a cookies object', async () => {
    await expect(controller.session({} as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects session lookup when the cookie does not match a user', async () => {
    authService.findByKeycloakSub.mockResolvedValue(null);

    await expect(
      controller.session({ cookies: { session: 'kc-1' } } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns the public session user when the cookie is valid', async () => {
    authService.findByKeycloakSub.mockResolvedValue({
      id: 'user-1',
      username: 'immanuel',
      role: UserRole.PLAYER,
    } as any);

    await expect(
      controller.session({ cookies: { session: 'kc-1' } } as any),
    ).resolves.toEqual({
      id: 'user-1',
      username: 'immanuel',
      role: UserRole.PLAYER,
    });
  });

  it('clears the session cookie on logout', () => {
    const res = {
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    controller.logout(res);

    expect(res.cookie).toHaveBeenCalledWith(
      'session',
      '',
      expect.objectContaining({ maxAge: 0, httpOnly: true }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out' });
  });

  it('clears the session cookie securely in production', () => {
    appConfig.node_env = 'production';
    const res = {
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    controller.logout(res);

    expect(res.cookie).toHaveBeenCalledWith(
      'session',
      '',
      expect.objectContaining({ secure: true, maxAge: 0 }),
    );
  });
});
