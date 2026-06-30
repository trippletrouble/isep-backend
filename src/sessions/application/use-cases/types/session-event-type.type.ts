export type SessionEventType =
  | 'game_state'
  | 'lobby_updated'
  | 'game_started'
  | 'dice_rolled'
  | 'move_executed'
  | 'turn_changed'
  | 'game_ended'
  | 'heartbeat'
  | 'plague_fly_acquired'
  | 'plague_fly_transferred'
  | 'quiz_started'
  | 'quiz_answered'
  | 'quiz_resolved';
