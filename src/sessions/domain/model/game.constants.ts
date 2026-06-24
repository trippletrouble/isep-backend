import { PlayerColor } from '$gen/prisma-client/client';

export const TURN_ORDER: PlayerColor[] = [
  PlayerColor.RED,
  PlayerColor.BLUE,
  PlayerColor.YELLOW,
  PlayerColor.GREEN,
];

export const HOME_POSITION = -1;
export const MAIN_TRACK_SIZE = 52;
export const MAIN_TRACK_END = MAIN_TRACK_SIZE - 1; // 51
export const GOAL_LANE_SIZE = 5;

export const START_FIELDS: Record<PlayerColor, number> = {
  [PlayerColor.RED]: 0,
  [PlayerColor.BLUE]: 13,
  [PlayerColor.YELLOW]: 26,
  [PlayerColor.GREEN]: 39,
};

export const GOAL_START_FIELDS: Record<PlayerColor, number> = {
  [PlayerColor.RED]: 52,
  [PlayerColor.BLUE]: 57,
  [PlayerColor.YELLOW]: 62,
  [PlayerColor.GREEN]: 67,
};

export const FINAL_GOAL_POSITIONS: Record<PlayerColor, number> = {
  [PlayerColor.RED]: 72,
  [PlayerColor.BLUE]: 73,
  [PlayerColor.YELLOW]: 74,
  [PlayerColor.GREEN]: 75,
};

export const isFinalGoalPosition = (position: number): boolean =>
  Object.values(FINAL_GOAL_POSITIONS).includes(position);
