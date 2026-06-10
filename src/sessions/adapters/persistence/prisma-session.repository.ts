import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionRepositoryPort } from '../../ports';
import { LobbySettings } from '../../domain';
import { Session } from 'src/generated/prisma-class/session';
import { User } from 'src/generated/prisma-class/user';
import { GameStateType } from 'src/sessions/application/use-cases/types/game-state.type';

@Injectable()
export class PrismaSessionRepository implements SessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

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
            participant: true,
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
  async passTurn(sessionId: string, currentPlayerId: string): Promise<void> {
    const sessionwithParticipants = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });

    if (!sessionwithParticipants) throw new Error('Session not found');

    const currentPlayerIndex = sessionwithParticipants.participants.findIndex(
      (p) => p.userId === currentPlayerId,
    );

    if (currentPlayerIndex === -1)
      throw new Error('Current player not found in session');
    const participants = sessionwithParticipants.participants;
    const nextPlayerIndex = (currentPlayerIndex + 1) % participants.length;
    const nextPlayer = participants[nextPlayerIndex];
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: sessionId },
        data: {
          currentPlayerId: nextPlayer.userId,
          turnNumber: sessionwithParticipants.turnNumber + 1,
          lastDiceValue: null, // Reset für nächsten Zug
          diceRolledThisTurn: false,
          consecutiveSixes: 0, // Reset bei Zugwechsel
          updatedAt: new Date(),
        },
      }),
      //this.prisma.gameParticipant.findFirst(where: {userId: currentPlayerId})
      this.prisma.gameParticipant.update({
        where: {
          sessionId_userId: {
            sessionId: sessionId,
            userId: currentPlayerId,
          },
        },

        data: { isCurrentTurn: false, updatedAt: new Date() },
      }),
      this.prisma.gameParticipant.update({
        //where: { id: nextPlayer.id },
        where: {
          sessionId_userId: {
            sessionId: sessionId,
            userId: nextPlayer.userId,
          },
        },
        data: { isCurrentTurn: true, updatedAt: new Date() },
      }),
    ]);
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
}
