import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../application/auth.service';
import { User } from '../../generated/prisma-class/user';
import { UserRole } from '../../generated/prisma-client/enums';

@Injectable()
export class KeycloakStrategy extends PassportStrategy(Strategy, 'keycloak') {
  private readonly userinfoUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    const url   = config.getOrThrow<string>('KEYCLOAK_URL');
    const realm = config.getOrThrow<string>('KEYCLOAK_REALM');

    super({
      authorizationURL: `${url}/realms/${realm}/protocol/openid-connect/auth`,
      tokenURL:         ***ENTFERNT***
      clientID:         config.getOrThrow<string>('KEYCLOAK_CLIENT_ID'),
      clientSecret:     ***ENTFERNT***
      callbackURL:      config.getOrThrow<string>('KEYCLOAK_CALLBACK_URL'),
      scope:            ['openid', 'profile', 'email'],
    });

    this.userinfoUrl = `${url}/realms/${realm}/protocol/openid-connect/userinfo`;
  }

  async validate(
    accessToken: ***ENTFERNT***
  ): Promise<User> {
    const res = await fetch(this.userinfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Userinfo-Endpoint Fehler: ${res.status}`);
    }

    const userinfo = await res.json();

    const realmRoles: string[] = userinfo.realm_access?.roles ?? [];
    const role = realmRoles.includes('admin') ? UserRole.ADMIN : UserRole.PLAYER;

    return this.authService.findOrCreateUser({
      sub:       userinfo.sub,
      username:  userinfo.preferred_username,
      avatarUrl: userinfo.picture ?? null,
      role,
    });
  }
}