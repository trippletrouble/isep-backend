/**
 * Use Case for creating a new session (BE-1-08)
 * Part of the Application Layer - orchestrates the creation process.
 */

import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports/session-repository.port';
import { LobbySettings } from '../../domain/model/lobby-settings.model';
import { Session } from '../../domain/model/session.model';
import { GameParticipant } from '../../domain/model/participant.model';
import { LobbyDto, LobbyPlayerDto, LobbySettingsDto } from '../dtos/lobby.dto';
import { PrismaService } from '../../../prisma/prisma.service';


@Injectable()
export class CreateSessionUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}
  async execute(
    hostId: string,
    settings: {
      numberOfPlayers: number;
      mode?: 'CLASSIC';
      boardTheme?: 'CLASSIC';
      isPrivate?: boolean;
      turnTimeLimitSeconds?: number | null;
      additionalRules?: ('THROW_AGAIN_ON_6' | 'THREE_SIXES_LOSE_TURN')[];
    },
  ): Promise<LobbyDto> {
    const lobbySettings = new LobbySettings(
      settings.numberOfPlayers,
      settings.mode,
      settings.boardTheme,
      settings.isPrivate,
      settings.turnTimeLimitSeconds,
      settings.additionalRules,
    );
    const { session, hostParticipant } = await this.sessionRepo.createSession(
      hostId,
      lobbySettings,
    );
    const user = await this.prisma.user.findUnique({
      where: { id: hostId },
      select: { username: true },
    });

    if (!user) {
      throw new Error('Host user not found');
    }

    return this.toLobbyDto(session, hostParticipant, user.username);
  }
  private toLobbyDto(
    session: Session,
    hostParticipant: GameParticipant,
    hostUsername: string,
  ): LobbyDto {
    return {
      sessionId: session.id,
      hostId: session.hostId,
      settings: {
        numberOfPlayers: session.numberOfPlayers,
        mode: session.mode,
        boardTheme: session.boardTheme,
        isPrivate: session.isPrivate,
        turnTimeLimitSeconds: session.turnTimeLimitSeconds,
        additionalRules: session.additionalRules,
      },
      players: [
        {
          id: hostParticipant.id,
          userId: hostParticipant.userId,
          username: hostUsername,
          color: hostParticipant.color,
          type: hostParticipant.type,
          isCurrentTurn: hostParticipant.isCurrentTurn,
          hasFinished: hostParticipant.hasFinished,
          figuresInGoal: hostParticipant.figuresInGoal,
        },
      ],
      status: session.status,
      inviteToken: ***ENTFERNT***
      createdAt: session.createdAt.toISOString(),
    };
  }
}
