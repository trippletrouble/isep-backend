import { LobbySettings } from '../domain';
import { User } from '../../generated/prisma-class/user';
import { Session } from '../../generated/prisma-class/session';
import {
  Participant,
  SessionWithParticipants,
} from '../application/use-cases/types';
import { ParticipantDto } from '../application/dtos/participant.dto';
export abstract class SessionRepositoryPort {
  abstract createSession(
    hostId: string,
    settings: LobbySettings,
  ): Promise<Session>;
  abstract findSessionById(id: string): Promise<SessionWithParticipants | null>;
  abstract findByIdMinimal(id: string): Promise<Session | null>;
  abstract findUserById(id: string): Promise<User | null>;
  abstract updateSessionById(
    id: string,
    data: Partial<Session>,
  ): Promise<Session>;
  abstract createParticipant(
    participant: ParticipantDto,
  ): Promise<Participant | null>;
}
