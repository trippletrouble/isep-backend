import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionRepositoryPort } from '../../ports';
import { LobbySettings } from '../../domain';
import { Session } from 'src/generated/prisma-class/session';
import { User } from 'src/generated/prisma-class/user';
import { GameStateType } from 'src/sessions/application/use-cases/types/game-state.type';
import {
  SessionWithParticipants,
} from '../../application/use-cases/types';
import { Prisma } from '@prisma/client';
import { GameParticipant } from '../../../generated/prisma-class/game_participant';

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
        playerId: figure.participantId,
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
    const promis_participant = await this.prisma.gameParticipant.create({
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
    return promis_participant;
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

  async findSessionById(id: string): Promise<SessionWithParticipants | null> {
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

    return this.prisma.session.update({
      where: { id },
      data: updatePayload,
    });
  }
}
