import { PossibleMoveType } from './possible-move.type';
import { GameStateType } from './game-state.type';

export type DiceRollResultType = {
  value: number;
  playerId: string;
  possibleMoves: PossibleMoveType[];
  hasMoves: boolean;
  rollAgain: boolean;
  consecutiveSixes: number;
  turnForfeit: boolean;
  plagueFlyAcquired: boolean;
  gameState: GameStateType;
};
