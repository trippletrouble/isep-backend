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
  plagueFlyTransferred: boolean;
  gameState: GameStateType;
  quiz?: {
    questionId: string;
    question: string;
    answers: { id: string; text: string }[];
  };
};
