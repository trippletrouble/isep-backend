import { LobbySettings } from '../domain';
import { User } from '../../generated/prisma-class/user';
import { Session } from '../../generated/prisma-class/session';
import { GameParticipant } from '../../generated/prisma-class/game_participant';
import { Figure } from '../../generated/prisma-class/figure';

export abstract class SessionRepositoryPort {
  abstract createSession(
    hostId: string,
    settings: LobbySettings,
  ): Promise<Session>;
  abstract findSessionById(id: string): Promise<Session | null>;
  abstract findByIdMinimal(id: string): Promise<Session | null>;
  abstract findUserById(id: string): Promise<User | null>;

  abstract findSessionWithDetails(
    id: string,
  ): Promise<{ session: Session; participants: GameParticipant[]; figures: Figure[] } | null>;

  abstract updateSessionState(
    session: Session,
    participants: GameParticipant[],
    figures: Figure[],
  ): Promise<void>;

  abstract createFigures(
    figures: { id: number; sessionId: string; participantId: string; position: number; status: string }[],
  ): Promise<Figure[]>;
}

