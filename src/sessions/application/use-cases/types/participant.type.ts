import {
  PlayerColor,
  PlayerType,
} from '../../../../generated/prisma-client/enums';

export type Participant = {
  id: string;
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
