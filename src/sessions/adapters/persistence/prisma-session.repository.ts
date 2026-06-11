import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionRepositoryPort } from '../../ports';
import { LobbySettings } from '../../domain';
import { Session } from 'src/generated/prisma-class/session';
import { User } from 'src/generated/prisma-class/user';

@Injectable()
export class PrismaSessionRepository implements SessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(
    hostId: string,
    settings: LobbySettings,
  ): Promise<Session> {
    return this.prisma.session.create({
      data: {
        mode: settings.mode,
        boardTheme: settings.boardTheme,
        numberOfPlayers: settings.numberOfPlayers,
        isPrivate: settings.isPrivate,
        turnTimeLimitSeconds: settings.turnTimeLimitSeconds,
        additionalRules: settings.additionalRules,
        hostId: hostId,
      },
    });
  }

  async findSessionById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });
  }

  async findByIdMinimal(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findOpenPublicSessions(
    page: number,
    size: number,
  ): Promise<{ items: Session[]; total: number }> {
    const where = {
      status: 'WAITING' as const,
      isPrivate: false,
    };

    const [items, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip: (page - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.session.count({ where }),
    ]);

    return { items, total };
  }
}
