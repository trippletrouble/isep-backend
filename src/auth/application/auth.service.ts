import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  CreateUserDto,
  IUserRepository,
  USER_REPOSITORY,
} from '../ports/user-repository.port';
import { User } from '../../generated/prisma-class/user';

export interface OidcProfile {
  sub: string;
  username: string;
  avatarUrl?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async findOrCreateUser(profile: OidcProfile): Promise<User> {
    if (!profile.sub || !profile.username) {
      throw new UnauthorizedException('Incomplete OIDC-Profile');
    }

    const existing = await this.userRepository.findByKeycloakSub(profile.sub);
    if (existing) return existing;

    const dto: CreateUserDto = {
      keycloakSub: profile.sub,
      username:    profile.username,
      avatarUrl:   profile.avatarUrl ?? null,
    };

    return this.userRepository.create(dto);
  }
}