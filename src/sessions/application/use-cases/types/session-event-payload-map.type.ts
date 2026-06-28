import { GameStateType } from './game-state.type';
import { GameEndedEventPayload } from './game-ended-event-payload.type';
import { HeartbeatEventPayload } from './heartbeat-event-payload.type';
import { MoveExecutedEventPayload } from './move-executed-event-payload.type';
import { TurnChangedEventPayload } from './turn-changed-event-payload.type';
import { DiceRolledEventPayload } from './dice-rolled-event-payload.type';
import { QuizResolvedPayload } from './quiz-resolved-event-payload.type';

export type PlagueFlyAcquiredPayload = {
  figureId: number;
  playerId: string;
  activeFlyCount: number;
};

export type PlagueFlyTransferredPayload = {
  fromFigureId: number;
  toFigureId: number;
  fromPlayerId: string;
  toPlayerId: string;
  activeFlyCount: number;
};

export type QuizStartedPayload = {
  questionId: string;
  question: string;
  answers: { id: string; text: string }[];
  attackerId: string;
  defenderId: string;
  figureId: number;
  fromPosition: number;
  toPosition: number;
  category: string;
  timeLimitSeconds: number;
};

export type QuizAnsweredPayload = {
  questionId: string;
  playerId: string;
  role: 'attacker' | 'defender';
};

export type SessionEventPayloadMap = {
  game_state: GameStateType;
  game_started: GameStateType;
  dice_rolled: DiceRolledEventPayload;
  move_executed: MoveExecutedEventPayload;
  turn_changed: TurnChangedEventPayload;
  game_ended: GameEndedEventPayload;
  heartbeat: HeartbeatEventPayload;
  plague_fly_acquired: PlagueFlyAcquiredPayload; // ← neu
  plague_fly_transferred: PlagueFlyTransferredPayload; // ← neu
  quiz_started: QuizStartedPayload;
  quiz_answered: QuizAnsweredPayload;
  quiz_resolved: QuizResolvedPayload;
};
