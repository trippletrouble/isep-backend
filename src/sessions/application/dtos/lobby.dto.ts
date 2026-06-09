import { GameStatus } from '../../domain/model/session.model';
import { PlayerColor, PlayerType } from '../../domain/model/participant.model';
//import { cursorTo } from 'readline';
export class LobbySettingsDto {
  constructor(
    numberOfPlayers: number,
    mode: string,
    boardTheme: string,
    isPrivate: boolean,
    turnTimeLimitSeconds: number,
    additionalRules: string[],
  ) {
    this.numberOfPlayers = numberOfPlayers;
    this.mode = mode;
    this.boardTheme = boardTheme;
    this.isPrivate = isPrivate;
    this.turnTimeLimitSeconds = turnTimeLimitSeconds;
    this.additionalRules = additionalRules;
  }
  numberOfPlayers: number;
  mode: string;
  boardTheme: string;
  isPrivate: boolean;
  turnTimeLimitSeconds: number | null;
  additionalRules: string[];
}
export class LobbyPlayerDto {
  constructor(
    id: string,
    userId: string,
    username: string,
    color: PlayerColor,
    type: PlayerType,
    isCurrentTurn: boolean,
    hasFinished: boolean,
    figuresInGoal: number,
  ) {
    this.id = id;
    this.userId = userId;
    this.username = username;
    this.color = color;
    this.type = type;
    this.isCurrentTurn = isCurrentTurn;
    this.hasFinished = hasFinished;
    this.figuresInGoal = figuresInGoal;
  }
  id: string;
  userId: string;
  username: string;
  color: PlayerColor;
  type: PlayerType;
  isCurrentTurn: boolean;
  hasFinished: boolean;
  figuresInGoal: number;
}
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
