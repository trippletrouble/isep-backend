import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { SessionRepositoryPort } from '../../ports/session-repository.port';
import { Session } from '../../domain/model/session.model';
import { GameParticipant } from '../../domain/model/participant.model';
import { LobbySettings } from '../../domain/model/lobby-settings.model';

@Injectable()
export class PrismaSessionRepository implements SessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}
  async createSession(
    hostId: string,
    settings: LobbySettings,
  ): Promise<{
    session: Session;
    hostParticipant: GameParticipant;
  }> {
    const hostExists = await this.prisma.user.findUnique({
      where: { id: hostId },
    });

    if (!hostExists) {
      throw new Error('Host user does not exist');
    }
    return this.prisma.$transaction(async (tx) => {
      const prismaSession = await tx.session.create({
        data: {
          id: uuidv4(),
          status: 'WAITING',
          mode: settings.mode,
          boardTheme: settings.boardTheme,
          numberOfPlayers: settings.numberOfPlayers,
          isPrivate: settings.isPrivate,
          inviteToken: ***ENTFERNT***
          turnTimeLimitSeconds: settings.turnTimeLimitSeconds,
          additionalRules: settings.additionalRules,
          hostId: hostId,
          currentPlayerId: null,
          turnNumber: 0,
          lastDiceValue: null,
          diceRolledThisTurn: false,
          consecutiveSixes: 0,
          winnerId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const prismaParticipant = await tx.gameParticipant.create({
        data: {
          id: uuidv4(),
          sessionId: prismaSession.id,
          userId: hostId,
          color: 'RED',
          type: 'HUMAN',
          isBot: false,
          isCurrentTurn: false,
          hasFinished: false,
          figuresInGoal: 0,
          placement: null,
          figuresCaptured: 0,
          joinedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const session = new Session(
        prismaSession.id,
        prismaSession.status as any,
        prismaSession.mode as any,
        prismaSession.boardTheme as any,
        prismaSession.numberOfPlayers,
        prismaSession.isPrivate,
        prismaSession.inviteToken,
        prismaSession.turnTimeLimitSeconds,
        prismaSession.additionalRules as any,
        prismaSession.hostId,
        prismaSession.currentPlayerId,
        prismaSession.turnNumber,
        prismaSession.lastDiceValue,
        prismaSession.diceRolledThisTurn,
        prismaSession.consecutiveSixes,
        prismaSession.winnerId,
        prismaSession.createdAt,
        prismaSession.updatedAt,
      );

      const hostParticipant = new GameParticipant(
        prismaParticipant.id,
        prismaParticipant.sessionId,
        prismaParticipant.userId,
        prismaParticipant.color as any,
        prismaParticipant.type as any,
        prismaParticipant.isBot,
        prismaParticipant.isCurrentTurn,
        prismaParticipant.hasFinished,
        prismaParticipant.figuresInGoal,
        prismaParticipant.placement,
        prismaParticipant.figuresCaptured,
        prismaParticipant.joinedAt,
        prismaParticipant.updatedAt,
      );

      return { session, hostParticipant };
    });
  }

  async findById(id: string): Promise<Session | null> {
    const prismaSession = await this.prisma.session.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });

    if (!prismaSession) {
      return null;
    }

    return new Session(
      prismaSession.id,
      prismaSession.status as any,
      prismaSession.mode as any,
      prismaSession.boardTheme as any,
      prismaSession.numberOfPlayers,
      prismaSession.isPrivate,
      prismaSession.inviteToken,
      prismaSession.turnTimeLimitSeconds,
      prismaSession.additionalRules as any,
      prismaSession.hostId,
      prismaSession.currentPlayerId,
      prismaSession.turnNumber,
      prismaSession.lastDiceValue,
      prismaSession.diceRolledThisTurn,
      prismaSession.consecutiveSixes,
      prismaSession.winnerId,
      prismaSession.createdAt,
      prismaSession.updatedAt,
    );
  }

  async findByIdMinimal(id: string): Promise<Session | null> {
    const prismaSession = await this.prisma.session.findUnique({
      where: { id },
    });

    if (!prismaSession) {
      return null;
    }

    return new Session(
      prismaSession.id,
      prismaSession.status as any,
      prismaSession.mode as any,
      prismaSession.boardTheme as any,
      prismaSession.numberOfPlayers,
      prismaSession.isPrivate,
      prismaSession.inviteToken,
      prismaSession.turnTimeLimitSeconds,
      prismaSession.additionalRules as any,
      prismaSession.hostId,
      prismaSession.currentPlayerId,
      prismaSession.turnNumber,
      prismaSession.lastDiceValue,
      prismaSession.diceRolledThisTurn,
      prismaSession.consecutiveSixes,
      prismaSession.winnerId,
      prismaSession.createdAt,
      prismaSession.updatedAt,
    );
  }
}
