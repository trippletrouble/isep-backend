import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionRepositoryPort } from '../../ports';
import { LobbySettings } from '../../domain';
import { Session } from 'src/generated/prisma-class/session';
import { User } from 'src/generated/prisma-class/user';
import { GameStateType } from 'src/sessions/application/use-cases/types/game-state.type';
import { SessionWithParticipants } from '../../application/use-cases/types';
import { Prisma } from 'src/generated/prisma-client/client';
import { GameParticipant } from '../../../generated/prisma-class/game_participant';
import { ApplyMoveData } from '../../application/use-cases/types/apply-move-data.type';
import { GameHistoryEventDto } from '../../application/dtos/game-history-event.dto';
import { FINAL_GOAL_POSITION, isFinalGoalPosition } from 'src/sessions/application/use-cases/possible-move-calculator.use-case';

@Injectable()
export class PrismaSessionRepository implements SessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}
  async findParticipant(
    sessionId: string,
    userId: string,
  ): Promise<GameParticipant | null> {
    return this.prisma.gameParticipant.findUnique({
      where: {
        sessionId_userId: {
          sessionId: sessionId,
          userId: userId,
        },
      },
    });
  }
  async findGameStateById(id: string): Promise<GameStateType | null> {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        figures: {
          include: {
            participant: {
              select: {
                userId: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    return {
      sessionId: session.id,
      status: session.status,
      mode: session.mode,
      boardTheme: session.boardTheme,
      players: session.participants.map((participant) => ({
        id: participant.userId,
        username: participant.user.username,
        color: participant.color,
        type: participant.type,
        isCurrentTurn: participant.isCurrentTurn,
        hasFinished: participant.hasFinished,
        figuresInGoal: participant.figuresInGoal,
      })),
      figures: session.figures.map((figure) => ({
        id: figure.id,
        playerId: figure.participant.userId,
        position: figure.position,
        status: figure.status,
      })),
      currentPlayerId: session.currentPlayerId,
      turnNumber: session.turnNumber,
      lastDiceValue: session.lastDiceValue,
      diceRolledThisTurn: session.diceRolledThisTurn,
      consecutiveSixes: session.consecutiveSixes,
      activeRules: session.additionalRules,
      winnerId: session.winnerId,
      createdAt: session.createdAt.toISOString(),
      lastUpdatedAt: session.updatedAt.toISOString(),
    };
  }
  async createParticipant(
    participant: GameParticipant,
  ): Promise<GameParticipant | null> {
    return this.prisma.gameParticipant.create({
      data: {
        sessionId: participant.sessionId,
        userId: participant.userId,
        color: participant.color,
        updatedAt: participant.updatedAt,
        type: participant.type,
        isBot: participant.isBot,
        isCurrentTurn: participant.isCurrentTurn,
        hasFinished: participant.hasFinished,
        figuresInGoal: participant.figuresInGoal,
        placement: participant.placement,
        figuresCaptured: participant.figuresCaptured,
        joinedAt: participant.joinedAt,
      },
    });
  }

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
  async updateAfterDiceRoll(
    sessionId: string,
    data: {
      lastDiceValue: number;
      diceRolledThisTurn: boolean;
      consecutiveSixes: number;
    },
  ): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        lastDiceValue: data.lastDiceValue,
        diceRolledThisTurn: data.diceRolledThisTurn,
        consecutiveSixes: data.consecutiveSixes,
        updatedAt: new Date(),
      },
    });
  }

  async addInviteToken(sessionId: string, inviteToken: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        inviteToken: ***ENTFERNT***
      },
    });
  }

  async updateSessionInvite(
    sessionId: string,
    inviteToken: ***ENTFERNT*** | null,
    inviteTokenExpiresAt: ***ENTFERNT*** | null,
  ): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        inviteToken,
        inviteTokenExpiresAt,
      },
    });
  }

  findByInviteToken(inviteToken: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { inviteToken: inviteToken },
    });
  }

  async passTurn(sessionId: string, currentPlayerId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const sessionWithParticipants = await tx.session.findUnique({
        where: { id: sessionId },
        include: {
          participants: {
            orderBy: {
              joinedAt: 'asc',
            },
          },
        },
      });

      if (!sessionWithParticipants) throw new Error('Session not found');
      const currentPlayerIndex = sessionWithParticipants.participants.findIndex(
        (p) => p.userId === currentPlayerId,
      );

      if (currentPlayerIndex === -1)
        throw new Error('Current player not found in session');
      const participants = sessionWithParticipants.participants;
      const nextPlayer =
        participants[(currentPlayerIndex + 1) % participants.length];

      await tx.session.update({
        where: { id: sessionId },
        data: {
          currentPlayerId: nextPlayer.userId,
          turnNumber: sessionWithParticipants.turnNumber + 1,
          lastDiceValue: null,
          diceRolledThisTurn: false,
          consecutiveSixes: 0,
          updatedAt: new Date(),
        },
      });

      await tx.gameParticipant.update({
        where: {
          sessionId_userId: {
            sessionId: sessionId,
            userId: currentPlayerId,
          },
        },
        data: { isCurrentTurn: false, updatedAt: new Date() },
      });

      await tx.gameParticipant.update({
        where: {
          sessionId_userId: {
            sessionId: sessionId,
            userId: nextPlayer.userId,
          },
        },
        data: { isCurrentTurn: true, updatedAt: new Date() },
      });
    });
  }

  async applyMove(data: ApplyMoveData): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const movingFigure = await tx.figure.findUnique({
        where: {
          sessionId_id: {
            sessionId: data.sessionId,
            id: data.figureId,
          },
        },
        include: {
          participant: true,
        },
      });

      if (!movingFigure) {
        throw new Error('Figure not found');
      }

      const status = isFinalGoalPosition(data.toPosition) ? 'GOAL' : 'ACTIVE';

      await tx.figure.update({
        where: {
          sessionId_id: {
            sessionId: data.sessionId,
            id: data.figureId,
          },
        },
        data: {
          position: data.toPosition,
          status,
        },
      });

      if (data.capturedFigureId !== null) {
        await tx.figure.update({
          where: {
            sessionId_id: {
              sessionId: data.sessionId,
              id: data.capturedFigureId,
            },
          },
          data: {
            position: -1,
            status: 'HOME',
          },
        });

        await tx.gameParticipant.update({
          where: {
            id: movingFigure.participantId,
          },
          data: {
            figuresCaptured: {
              increment: 1,
            },
          },
        });
      }

      if (isFinalGoalPosition(data.toPosition)) {
        await tx.gameParticipant.update({
          where: {
            id: movingFigure.participantId,
          },
          data: {
            figuresInGoal: {
              increment: 1,
            },
            hasFinished: data.outcome === 'GAME_WON',
          },
        });
      }

      const lastEvent = await tx.gameHistoryEvent.aggregate({
        where: {
          sessionId: data.sessionId,
        },
        _max: {
          sequenceNr: true,
        },
      });
      const sequenceNr = (lastEvent._max.sequenceNr ?? 0) + 1;
      const actionType: 'MOVE' | 'CAPTURE' | 'GOAL' =
        data.outcome === 'CAPTURED'
          ? 'CAPTURE'
          : data.outcome === 'GOAL' || data.outcome === 'GAME_WON'
            ? 'GOAL'
            : 'MOVE';

      await tx.gameHistoryEvent.create({
        data: {
          sequenceNr,
          sessionId: data.sessionId,
          participantId: movingFigure.participantId,
          actionType,
          diceValue: data.diceValue,
          figureId: data.figureId,
          fromPosition: data.fromPosition,
          toPosition: data.toPosition,
          outcome: data.outcome,
        },
      });

      if (data.outcome === 'GAME_WON') {
        await tx.session.update({
          where: { id: data.sessionId },
          data: {
            status: 'FINISHED',
            winnerId: data.userId,
            finishedAt: new Date(),
            lastDiceValue: null,
            diceRolledThisTurn: false,
            updatedAt: new Date(),
          },
        });
        return;
      }

      if (data.rollAgain && !data.turnForfeit) {
        await tx.session.update({
          where: { id: data.sessionId },
          data: {
            lastDiceValue: null,
            diceRolledThisTurn: false,
            updatedAt: new Date(),
          },
        });
        return;
      }

      const sessionWithParticipants = await tx.session.findUnique({
        where: { id: data.sessionId },
        include: {
          participants: {
            orderBy: {
              joinedAt: 'asc',
            },
          },
        },
      });

      if (!sessionWithParticipants) {
        throw new Error('Session not found');
      }

      const currentPlayerIndex = sessionWithParticipants.participants.findIndex(
        (participant) => participant.userId === data.userId,
      );

      if (currentPlayerIndex === -1) {
        throw new Error('Current player not found in session');
      }

      const participants = sessionWithParticipants.participants;
      const nextPlayer =
        participants[(currentPlayerIndex + 1) % participants.length];

      await tx.session.update({
        where: { id: data.sessionId },
        data: {
          currentPlayerId: nextPlayer.userId,
          turnNumber: sessionWithParticipants.turnNumber + 1,
          lastDiceValue: null,
          diceRolledThisTurn: false,
          consecutiveSixes: 0,
          updatedAt: new Date(),
        },
      });
      await tx.gameParticipant.update({
        where: {
          sessionId_userId: {
            sessionId: data.sessionId,
            userId: data.userId,
          },
        },
        data: { isCurrentTurn: false, updatedAt: new Date() },
      });
      await tx.gameParticipant.update({
        where: {
          sessionId_userId: {
            sessionId: data.sessionId,
            userId: nextPlayer.userId,
          },
        },
        data: { isCurrentTurn: true, updatedAt: new Date() },
      });
    });
  }
  async findSessionById(id: string): Promise<SessionWithParticipants | null> {
    return this.prisma.session.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });
  }

  async findByIdMinimal(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id },
    });
  }

  async deleteSessionById(id: string): Promise<void> {
    await this.prisma.session.delete({
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
  async updateSessionById(
    id: string,
    data: Partial<Session>,
  ): Promise<Session> {
    const { ...updateData } = data;
    const updatePayload: Prisma.SessionUpdateInput = {};
    if (updateData.status) updatePayload.status = updateData.status;
    if (updateData.mode) updatePayload.mode = updateData.mode;
    if (updateData.boardTheme) updatePayload.boardTheme = updateData.boardTheme;
    if (updateData.numberOfPlayers)
      updatePayload.numberOfPlayers = updateData.numberOfPlayers;
    if (updateData.isPrivate !== undefined)
      updatePayload.isPrivate = updateData.isPrivate;
    if (updateData.inviteToken !== undefined)
      updatePayload.inviteToken = updateData.inviteToken;
    if (updateData.turnTimeLimitSeconds !== undefined)
      updatePayload.turnTimeLimitSeconds = updateData.turnTimeLimitSeconds;
    if (updateData.additionalRules !== undefined)
      updatePayload.additionalRules = updateData.additionalRules;
    if (updateData.currentPlayerId !== undefined)
      updatePayload.currentPlayerId = updateData.currentPlayerId;
    if (updateData.turnNumber !== undefined)
      updatePayload.turnNumber = updateData.turnNumber;
    if (updateData.lastDiceValue !== undefined)
      updatePayload.lastDiceValue = updateData.lastDiceValue;
    if (updateData.hostId !== undefined)
      updatePayload.host = { connect: { id: updateData.hostId } };

    return this.prisma.session.update({
      where: { id },
      data: updatePayload,
    });
  }

  async removeParticipant(sessionId: string, userId: string): Promise<void> {
    await this.prisma.gameParticipant.delete({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  async findHistoryBySessionId(
    sessionId: string,
  ): Promise<GameHistoryEventDto[]> {
    const events = await this.prisma.gameHistoryEvent.findMany({
      where: { sessionId },
      orderBy: { sequenceNr: 'asc' },
    });

    return events.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    }));
  }
}
