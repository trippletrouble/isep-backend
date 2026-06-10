import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionRepositoryPort } from '../../ports';
import { LobbySettings } from '../../domain';
import { Session } from 'src/generated/prisma-class/session';
import { User } from 'src/generated/prisma-class/user';
import { GameParticipant } from 'src/generated/prisma-class/game_participant';
import { Figure } from 'src/generated/prisma-class/figure';
import { PieceStatus } from '@prisma/client';

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

  async findSessionWithDetails(
    id: string,
  ): Promise<{ session: Session; participants: GameParticipant[]; figures: Figure[] } | null> {
    const sessionRecord = await this.prisma.session.findUnique({
      where: { id },
      include: {
        participants: true,
        figures: true,
      },
    });
    if (!sessionRecord) return null;
    const { participants, figures, ...session } = sessionRecord;
    return {
      session: session as Session,
      participants: participants as GameParticipant[],
      figures: figures as Figure[],
    };
  }

  async updateSessionState(
    session: Session,
    participants: GameParticipant[],
    figures: Figure[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: session.id },
        data: {
          status: session.status,
          currentPlayerId: session.currentPlayerId,
          turnNumber: session.turnNumber,
          lastDiceValue: session.lastDiceValue,
          diceRolledThisTurn: session.diceRolledThisTurn,
          consecutiveSixes: session.consecutiveSixes,
          winnerId: session.winnerId,
          finishedAt: session.finishedAt,
        },
      });

      for (const p of participants) {
        await tx.gameParticipant.update({
          where: { id: p.id },
          data: {
            figuresInGoal: p.figuresInGoal,
            hasFinished: p.hasFinished,
            placement: p.placement,
            figuresCaptured: p.figuresCaptured,
            isCurrentTurn: p.isCurrentTurn,
          },
        });
      }

      for (const fig of figures) {
        await tx.figure.update({
          where: {
            sessionId_id: {
              sessionId: fig.sessionId,
              id: fig.id,
            },
          },
          data: {
            position: fig.position,
            status: fig.status as PieceStatus,
          },
        });
      }
    });
  }

  async createFigures(
    figures: { id: number; sessionId: string; participantId: string; position: number; status: string }[],
  ): Promise<Figure[]> {
    const created: Figure[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const fig of figures) {
        const res = await tx.figure.create({
          data: {
            id: fig.id,
            sessionId: fig.sessionId,
            participantId: fig.participantId,
            position: fig.position,
            status: fig.status as PieceStatus,
          },
        });
        created.push(res as Figure);
      }
    });
    return created;
  }
}

