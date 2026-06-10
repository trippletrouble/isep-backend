import { LobbySettings } from '../domain';
import { User } from '../../generated/prisma-class/user';
import { Session } from '../../generated/prisma-class/session';
import { GameStateType } from '../application/use-cases/types/game-state.type';
import { ApplyMoveData } from '../application/use-cases/types/apply-move-data.type';

export abstract class SessionRepositoryPort {
  abstract createSession(
    hostId: string,
    settings: LobbySettings,
  ): Promise<Session>;
  abstract findSessionById(id: string): Promise<Session | null>;
  abstract findByIdMinimal(id: string): Promise<Session | null>;
  abstract findUserById(id: string): Promise<User | null>;
  abstract findGameStateById(id: string): Promise<GameStateType | null>;
  abstract updateAfterDiceRoll(
    sessionId: string,
    data: {
      lastDiceValue: number;
      diceRolledThisTurn: boolean;
      consecutiveSixes: number;
    },
  ): Promise<void>;
  abstract passTurn(sessionId: string, currentPlayerId: string): Promise<void>;
  abstract applyMove(data: ApplyMoveData): Promise<void>;
}
