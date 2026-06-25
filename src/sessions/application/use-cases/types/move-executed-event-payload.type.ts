import { MoveOutcomeType } from '@common';

export type MoveExecutedEventPayload = {
  outcome: MoveOutcomeType;
  figureId: number;
  fromPosition: number;
  toPosition: number;
};
