import { GameStateType } from './game-state.type';
import { MoveOutcomeType } from '@common';

export type MoveFigureResultType = {
  figureId: number;
  fromPosition: number;
  toPosition: number;
  outcome: MoveOutcomeType;
  capturedFigureId: number | null;
  rollAgain: boolean;
  turnForfeit: boolean;
  gameState: GameStateType;
};
