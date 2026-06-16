import { GameStateType } from './game-state.type';
import { GameEndedEventPayload } from './game-ended-event-payload.type';
import { HeartbeatEventPayload } from './heartbeat-event-payload.type';
import { MoveExecutedEventPayload } from './move-executed-event-payload.type';
import { TurnChangedEventPayload } from './turn-changed-event-payload.type';

export type SessionEventPayloadMap = {
  game_state: GameStateType;
  game_started: GameStateType;
  move_executed: MoveExecutedEventPayload;
  turn_changed: TurnChangedEventPayload;
  game_ended: GameEndedEventPayload;
  heartbeat: HeartbeatEventPayload;
};
