import { LobbySettings, ActiveQuizType } from '../domain';
import { User } from '../../generated/prisma-class/user';
import { Session } from '$gen/prisma-class/session';
import {
  GameStateType,
  SessionWithParticipants,
  ParticipantDto,
  ApplyMoveData,
  GameHistoryEventDto,
} from '../application';
import { GameParticipant } from '../../generated/prisma-class/game_participant';

export abstract class SessionRepositoryPort {
  abstract createSession(
    hostId: string,
    settings: LobbySettings,
  ): Promise<Session>;
  abstract findSessionById(id: string): Promise<SessionWithParticipants | null>;
  abstract findByIdMinimal(id: string): Promise<Session | null>;
  abstract findUserById(id: string): Promise<User | null>;
  abstract findGameStateById(id: string): Promise<GameStateType | null>;
  abstract findParticipant(
    sessionId: string,
    userId: string,
  ): Promise<GameParticipant | null>;
  abstract updateAfterDiceRoll(
    sessionId: string,
    data: {
      lastDiceValue: number;
      diceRolledThisTurn: boolean;
      consecutiveSixes: number;
    },
  ): Promise<void>;
  abstract addInviteToken(sessionId: string, inviteToken: string);
  abstract findByInviteToken(inviteToken: string): Promise<Session | null>;
  abstract updateSessionInvite(
    sessionId: string,
    inviteToken: ***ENTFERNT*** | null,
    inviteTokenExpiresAt: ***ENTFERNT*** | null,
  ): Promise<void>;

  abstract passTurn(sessionId: string, currentPlayerId: string): Promise<void>;
  abstract updateSessionById(
    id: string,
    data: Partial<Session>,
  ): Promise<Session>;
  abstract createParticipant(
    participant: ParticipantDto,
  ): Promise<GameParticipant | null>;
  abstract findOpenPublicSessions(
    page: number,
    size: number,
  ): Promise<{ items: Session[]; total: number }>;
  abstract removeParticipant(sessionId: string, userId: string): Promise<void>;
  abstract deleteSession(sessionId: string): Promise<void>;
  abstract applyMove(data: ApplyMoveData): Promise<void>;
  abstract findHistoryBySessionId(
    sessionId: string,
  ): Promise<GameHistoryEventDto[]>;
  abstract deleteSessionById(id: string): Promise<void>;

  abstract createQuizDuel(data: {
    sessionId: string;
    attackerId: string;
    defenderId: string;
    questionId: string;
    timeLimitSeconds: number;
    pendingFigureId: number;
    pendingFromPos: number;
    pendingToPos: number;
    diceValue: number;
  }): Promise<string>;

  abstract resolveQuizDuel(data: {
    quizDuelId: string;
    outcome: 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'DRAW';
    captureProceeds: boolean;
  }): Promise<void>;

  abstract findActiveQuizDuel(
    sessionId: string,
  ): Promise<ActiveQuizType | null>;

  abstract setFigureHasPlagueFly(
    sessionId: string,
    figureId: number,
    value: boolean,
  ): Promise<void>;
  abstract incrementFlyDebuffCount(
    sessionId: string,
    figureId: number,
  ): Promise<number>;

  abstract setPendingQuiz(
    sessionId: string,
    data: {
      questionId: string;
      attackerId: string;
      defenderId: string;
      figureId: number;
      fromPosition: number;
      toPosition: number;
      diceValue: number;
    },
  ): Promise<void>;

  abstract clearPendingQuiz(sessionId: string): Promise<void>;
}
