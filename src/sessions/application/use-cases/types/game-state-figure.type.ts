import { PieceStatus } from './piece-status.type';

export type GameStateFigureType = {
  id: number;
  playerId: string;
  position: number;
  status: PieceStatus;
  hasPlagueFly: boolean;
  flyDebuffCount: number;
};
