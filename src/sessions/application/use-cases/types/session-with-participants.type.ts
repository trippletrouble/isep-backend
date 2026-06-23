import { Session } from '$gen/prisma-class/session';
import { GameParticipant } from '$gen/prisma-class/game_participant';

export type SessionWithParticipants = Session & {
  participants: GameParticipant[];
};
