import { Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  IUserRepository,
} from '../../ports/user-repository.port';
import { User } from '../../../generated/prisma-class/user';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKeycloakSub(sub: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { keycloakSub: sub },
    });
  }

  async create(dto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        keycloakSub: dto.keycloakSub,
        username:    dto.username,
        avatarUrl:   dto.avatarUrl ?? null,
        isGuest:     false,
      },
    });
  }
}