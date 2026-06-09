import { Session } from '../domain/model/session.model';
import { GameParticipant } from '../domain/model/participant.model';
import { LobbySettings } from '../domain/model/lobby-settings.model';
export interface SessionRepositoryPort {
  createSession(
    hostId: string,
    settings: LobbySettings,
  ): Promise<{
    session: Session;
    hostParticipant: GameParticipant;
  }>;
  findById(id: string): Promise<Session | null>;
  findByIdMinimal(id: string): Promise<Session | null>;
}
export const SessionRepositoryPort = Symbol('SessionRepositoryPort');
