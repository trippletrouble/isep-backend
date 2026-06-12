import { Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  FinishedParticipationStats,
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

  async findFinishedParticipationsByUserId(
    userId: string,
  ): Promise<FinishedParticipationStats[]> {
    const participations = await this.prisma.gameParticipant.findMany({
      where: {
        userId,
        session: {
          status: 'FINISHED',
        },
      },
      select: {
        figuresCaptured: true,
        session: {
          select: {
            id: true,
            winnerId: true,
          },
        },
      },
    });

    return participations.map((participation) => ({
      sessionId: participation.session.id,
      winnerId: participation.session.winnerId,
      figuresCaptured: participation.figuresCaptured,
    }));
  }
}
