import { MoveOutcomeType } from '@common';

export type ApplyMoveData = {
  sessionId: string;
  userId: string;
  figureId: number;
  fromPosition: number;
  toPosition: number;
  diceValue: number;
  capturedFigureId: number | null;
  outcome: MoveOutcomeType;
  rollAgain: boolean;
  turnForfeit: boolean;
};
