import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepositoryPort } from '../ports';
import { User } from '$gen/prisma-class/user';
import { CreateUserDto, OidcProfile } from '../util';

@Injectable()
export class AuthService {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async findOrCreateUser(profile: OidcProfile): Promise<User> {
    if (!profile.sub || !profile.username) {
      throw new UnauthorizedException('Incomplete OIDC-Profile');
    }

    const existing = await this.userRepository.findByKeycloakSub(profile.sub);
    if (existing) return existing;

    const dto: CreateUserDto = {
      keycloakSub: profile.sub,
      username: profile.username,
      avatarUrl: profile.avatarUrl ?? null,
      role: profile.role,
    };

    return this.userRepository.create(dto);
  }

  async findByKeycloakSub(sub: string): Promise<User | null> {
    return this.userRepository.findByKeycloakSub(sub);
  }
}
