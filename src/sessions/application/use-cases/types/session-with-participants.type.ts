import { Session } from '../../../../generated/prisma-class/session';
import { GameParticipant } from '../../../../generated/prisma-class/game_participant';

export type SessionWithParticipants = Session & {
  participants: GameParticipant[];
};
