import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../../../ports';
import { LobbySettings } from '../../../../domain';
import { ParticipantDto } from '../../../dtos';
import { PlayerType } from '$gen/prisma-client/client';
import { PlayerColor, Session } from '@prisma/client';

@Injectable()
export class CreateSessionUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
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
      additionalRules?: (
        | 'THROW_AGAIN_ON_6'
        | 'THREE_SIXES_LOSE_TURN'
        | 'PLAGUE_FLY'
      )[];
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
    const session = this.sessionRepo.createSession(hostId, lobbySettings);
    const participant = new ParticipantDto(
      new Date(),
      (await session).id,
      (await session).hostId,
      PlayerColor.RED,
      PlayerType.HUMAN,
      false,
      true,
      false,
      0,
      null,
      0,
      new Date(),
    );
    await this.sessionRepo.createParticipant(participant);
    return { ...(await session) };
  }
}
