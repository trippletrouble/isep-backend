import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { LobbyDto } from '../dtos';
import { LobbySettingsDto } from '../dtos/lobby-settings.dto';
import { LobbyPlayerDto } from '../dtos/lobby-player.dto';
import { SessionNotFoundError } from './errors';
import { InvalidSessionStatusError } from './errors';

@Injectable()
export class GetLobbyUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
  ) {}

  async execute(sessionId: string): Promise<LobbyDto> {
    const session = await this.sessionRepo.findSessionById(sessionId);

    if (!session) throw new SessionNotFoundError();

    if (session.status !== 'WAITING') throw new InvalidSessionStatusError();

    const players = session.participants.map(
      (participant) =>
        new LobbyPlayerDto(
          participant.userId,
          participant.userId,
          (participant as any).user?.username ?? '',
          participant.color,
          participant.type,
          participant.isCurrentTurn,
          participant.hasFinished,
          participant.figuresInGoal,
        ),
    );

    const settings = new LobbySettingsDto(
      session.numberOfPlayers,
      session.mode,
      session.boardTheme,
      session.isPrivate,
      session.turnTimeLimitSeconds as number,
      session.additionalRules,
    );

    return new LobbyDto(
      session.id,
      session.hostId,
      settings,
      players,
      session.status,
      session.inviteToken,
      session.createdAt.toISOString(),
    );
  }
}
