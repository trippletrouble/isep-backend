import { GameStatus } from '../../domain/model/session.model';
import { LobbySettingsDto } from './lobby-settings.dto';
import { LobbyPlayerDto } from './lobby-player.dto';

export class LobbyDto {
  constructor(
    sessionId: string,
    hostId: string,
    settings: LobbySettingsDto,
    players: LobbyPlayerDto[],
    status: GameStatus,
    inviteToken: ***ENTFERNT*** | null,
    createdAt: string,
  ) {
    this.sessionId = sessionId;
    this.hostId = hostId;
    this.settings = settings;
    this.players = players;
    this.status = status;
    this.inviteToken = inviteToken;
    this.createdAt = createdAt;
  }
  sessionId: string;
  hostId: string;
  settings: LobbySettingsDto;
  players: LobbyPlayerDto[];
  status: GameStatus;
  inviteToken: ***ENTFERNT*** | null;
  createdAt: string;
}
