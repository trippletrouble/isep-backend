import { MoveOutcomeType } from './move-figure-result.type';

export type MoveExecutedEventPayload = {
  outcome: MoveOutcomeType;
  figureId: number;
  fromPosition: number;
  toPosition: number;
};
