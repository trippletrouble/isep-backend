import {
  GameHistoryActionType,
  MoveOutcome,
} from '$gen/prisma-client/enums';

export class GameHistoryEventDto {
  id: number;
  sequenceNr: number;
  sessionId: string;
  participantId: string;
  actionType: GameHistoryActionType;
  diceValue: number | null;
  figureId: number | null;
  fromPosition: number | null;
  toPosition: number | null;
  outcome: MoveOutcome | null;
  createdAt: string;
}
