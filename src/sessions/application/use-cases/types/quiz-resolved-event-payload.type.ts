import { GameStateType } from './game-state.type';

export type QuizResolvedPayload = {
  winnerId: string;
  loserId: string;
  attackerId: string;
  defenderId: string;
  attackerCorrect: boolean;
  defenderCorrect: boolean;
  correctAnswerId: string;
  captureExecuted: boolean;
  figureId: number;
  toPosition: number;
  gameState: GameStateType;
};
