import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { AuthService } from '../application/auth.service';
import { User } from '../../generated/prisma-class/user';
import { UserRole } from '../../generated/prisma-client/enums';
import { appConfig } from '../../common/config/app.config';

interface KeycloakRealmAccess {
  roles: string[];
}

interface KeycloakUserinfo {
  sub: string;
  preferred_username: string;
  picture?: string | null;
  realm_access?: KeycloakRealmAccess | null;
}

@Injectable()
export class KeycloakStrategy extends PassportStrategy(Strategy, 'keycloak') {
  private readonly userinfoUrl: string;

  constructor(private readonly authService: AuthService) {
    const url = appConfig.keycloak_url;
    const realm = appConfig.keycloak_realm;

    super({
      authorizationURL: `${url}/realms/${realm}/protocol/openid-connect/auth`,
      tokenURL: ***ENTFERNT***
      clientID: appConfig.keycloak_client_id,
      clientSecret: ***ENTFERNT***
      callbackURL: appConfig.keycloak_callback_url,
      scope: ['openid', 'profile', 'email'],
    });

    this.userinfoUrl = `${url}/realms/${realm}/protocol/openid-connect/userinfo`;
  }

  async validate(accessToken: string): Promise<User> {
    const res = await fetch(this.userinfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Userinfo-Endpoint Fehler: ${res.status}`);
    }

    const userinfo = (await res.json()) as KeycloakUserinfo;

    const realmRoles: string[] = userinfo.realm_access?.roles ?? [];
    const role = realmRoles.includes('admin')
      ? UserRole.ADMIN
      : UserRole.PLAYER;

    return this.authService.findOrCreateUser({
      sub: userinfo.sub,
      username: userinfo.preferred_username,
      avatarUrl: userinfo.picture ?? null,
      role,
    });
  }
}
