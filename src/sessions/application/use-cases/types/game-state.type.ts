import {
  GameStatus,
  GameMode,
  BoardTheme,
  AdditionalRule,
} from '../../../domain';
import { GameStateFromPlayerType } from './game-state-from-player.type';
import { GameStateFigureType } from './game-state-figure.type';

export type GameStateType = {
  sessionId: string;
  status: GameStatus;
  mode: GameMode;
  boardTheme: BoardTheme;
  players: GameStateFromPlayerType[]; // GameStatePlayerDto[];
  figures: GameStateFigureType[];
  currentPlayerId: string | null;
  turnNumber: number;
  lastDiceValue: number | null;
  diceRolledThisTurn: boolean;
  consecutiveSixes: number;
  activeRules: AdditionalRule[];
  activeFlyCount: number;
  winnerId: string | null;
  createdAt: string;
  lastUpdatedAt: string;
};
