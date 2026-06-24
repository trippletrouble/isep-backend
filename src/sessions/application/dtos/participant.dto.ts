import { PlayerColor, PlayerType } from '$gen/prisma-client/enums';

import { GameParticipant } from '$gen/prisma-class/game_participant';

export class ParticipantDto extends GameParticipant {
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
    super();
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
}
