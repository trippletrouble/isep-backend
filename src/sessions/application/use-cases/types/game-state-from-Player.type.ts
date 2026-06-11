import { PlayerColor, PlayerType } from '@prisma/client';

export type GameStateFromPlayerType = {
  id: string;
  username: string;
  color: PlayerColor;
  type: PlayerType;
  isCurrentTurn: boolean;
  hasFinished: boolean;
  figuresInGoal: number;
}