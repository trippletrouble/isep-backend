import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { LobbySettings } from '../../domain';
import { PrismaService } from '../../../prisma/prisma.service';
import { Session } from '../../../generated/prisma-client/client';

@Injectable()
export class CreateSessionUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}
  /**
   * Creates a session, takes hostId and LobbySettings
   * */
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
  ): Promise<Session> {
    const lobbySettings = new LobbySettings(
      settings.numberOfPlayers,
      settings.mode,
      settings.boardTheme,
      settings.isPrivate,
      settings.turnTimeLimitSeconds,
      settings.additionalRules,
    );

    const user = await this.sessionRepo.findUserById(hostId);
    if (!user) throw new Error('Host user not found');

    return this.sessionRepo.createSession(hostId, lobbySettings);
  }
}
