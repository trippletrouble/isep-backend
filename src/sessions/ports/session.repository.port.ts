import { LobbySettings } from '../domain';
import { User } from '../../generated/prisma-class/user';
import { Session } from '../../generated/prisma-class/session';
import { SessionWithParticipants } from '../application/use-cases/types';
export abstract class SessionRepositoryPort {
  abstract createSession(
    hostId: string,
    settings: LobbySettings,
  ): Promise<Session>;
  abstract findSessionById(id: string): Promise<SessionWithParticipants | null>;
  abstract findByIdMinimal(id: string): Promise<Session | null>;
  abstract findUserById(id: string): Promise<User | null>;
}
