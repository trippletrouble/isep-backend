import { Session } from '../../../../generated/prisma-class/session';
import { Participant } from './participant.type';

export type SessionWithParticipants = Session & {
  participants: Participant[];
};
