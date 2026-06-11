import { PlayerColor, PlayerType } from '@prisma/client';
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