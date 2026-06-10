import {
  PlayerColor,
  PlayerType,
} from '../../../generated/prisma-client/enums';

export class ParticipantDto {
  constructor(
    updatedAt: Date,
    sessionId: string,
    userId: string,
    color: PlayerColor,
    type: PlayerType,
    isBot: boolean,
    isCurrentTurn: boolean,
    hasFinished: boolean,
    figuresInGoal: number,
    placement: number | null,
    figuresCaptured: number,
    joinedAt: Date,
  ) {
    this.updatedAt = updatedAt;
    this.sessionId = sessionId;
    this.userId = userId;
    this.color = color;
    this.type = type;
    this.isBot = isBot;
    this.isCurrentTurn = isCurrentTurn;
    this.hasFinished = hasFinished;
    this.figuresInGoal = figuresInGoal;
    this.placement = placement;
    this.figuresCaptured = figuresCaptured;
    this.joinedAt = joinedAt;
  }

  updatedAt: Date;
  sessionId: string;
  userId: string;
  color: PlayerColor;
  type: PlayerType;
  isBot: boolean;
  isCurrentTurn: boolean;
  hasFinished: boolean;
  figuresInGoal: number;
  placement: number | null;
  figuresCaptured: number;
  joinedAt: Date;
};
