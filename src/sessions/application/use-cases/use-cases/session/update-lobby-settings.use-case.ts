import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../../../ports';
import { LobbySettings } from '../../../../domain';
import { LobbySettingsDto } from '../../../dtos';
import { GameStateCacheService } from '../../../services';
import {
  InvalidSessionStatusError,
  NotHostError,
  SessionNotFoundError,
} from '../../errors';

@Injectable()
export class UpdateLobbySettingsUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    private readonly cache: GameStateCacheService,
  ) {}

  async execute(
    sessionId: string,
    userId: string,
    settings: LobbySettingsDto,
  ): Promise<LobbySettingsDto> {
    const session = await this.sessionRepo.findByIdMinimal(sessionId);

    if (!session) throw new SessionNotFoundError();

    if (session.hostId !== userId) throw new NotHostError();

    if (session.status !== 'WAITING') throw new InvalidSessionStatusError();

    const lobbySettings = new LobbySettings(
      settings.numberOfPlayers,
      settings.mode,
      settings.boardTheme,
      settings.isPrivate,
      settings.turnTimeLimitSeconds,
      settings.additionalRules,
    );

    const updated = await this.sessionRepo.updateSessionById(sessionId, {
      numberOfPlayers: lobbySettings.numberOfPlayers,
      mode: lobbySettings.mode,
      boardTheme: lobbySettings.boardTheme,
      isPrivate: lobbySettings.isPrivate,
      turnTimeLimitSeconds: lobbySettings.turnTimeLimitSeconds,
      additionalRules: lobbySettings.additionalRules,
    });

    this.cache.invalidate(sessionId).catch(() => {});

    return new LobbySettingsDto(
      updated.numberOfPlayers,
      updated.mode,
      updated.boardTheme,
      updated.isPrivate,
      updated.turnTimeLimitSeconds as number,
      updated.additionalRules,
    );
  }
}
