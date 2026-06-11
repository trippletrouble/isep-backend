import { Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  UserRepositoryPort,
} from '../../ports/user-repository.port';
import { User } from '../../../generated/prisma-class/user';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRole } from '../../../generated/prisma-client/enums';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByKeycloakSub(sub: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { keycloakSub: sub },
    });
  }

  async create(dto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        keycloakSub: dto.keycloakSub,
        username: dto.username,
        avatarUrl: dto.avatarUrl ?? null,
        isGuest: false,
        role: dto.role ?? UserRole.PLAYER,
      },
    });
  }
}
