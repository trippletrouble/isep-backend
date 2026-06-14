import { PlayerColor, PlayerType } from 'src/generated/prisma-client/client';

export type GameStateFromPlayerType = {
  id: string;
  username: string;
  color: PlayerColor;
  type: PlayerType;
  isCurrentTurn: boolean;
  hasFinished: boolean;
  figuresInGoal: number;
};
