import { PlayerColor, PlayerType } from '../../../domain';

export type GameStateFromPlayerType = {
  id: string;
  username: string;
  color: PlayerColor;
  type: PlayerType;
  isCurrentTurn: boolean;
  hasFinished: boolean;
  figuresInGoal: number;
}