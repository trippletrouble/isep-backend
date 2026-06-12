import { GameStateType } from './game-state.type';

export type MoveOutcomeType = 'MOVED' | 'CAPTURED' | 'GOAL' | 'GAME_WON';

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
