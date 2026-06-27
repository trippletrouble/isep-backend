export type SessionEventType =
  | 'game_state'
  | 'game_started'
  | 'dice_rolled'
  | 'move_executed'
  | 'turn_changed'
  | 'game_ended'
  | 'heartbeat'
  | 'plague_fly_acquired'
  | 'plague_fly_transferred';
