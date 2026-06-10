import { PossibleMoveType } from './possible-move.type';

export type PossibleMovesResultType = {
  diceValue: number;
  possibleMoves: PossibleMoveType[];
};
