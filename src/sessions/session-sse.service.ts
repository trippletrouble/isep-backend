import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  MessageEvent,
} from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { SessionRepositoryPort } from './ports';
import { GameStateType } from './application';

@Injectable()
export class SessionSseService {
  private sessionSubjects = new Map<string, Subject<MessageEvent>>();

  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
  ) {}

  async connect(sessionId: string, userId: string): Promise<Observable<MessageEvent>> {
    const gameState = await this.sessionRepository.findGameStateById(sessionId);
    if (!gameState) {
      throw new NotFoundException({
        status: 'error',
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
        timestamp: new Date().toISOString(),
      });
    }

    const isParticipant = gameState.players.some((p) => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'You are not part of the game',
        timestamp: new Date().toISOString(),
      });
    }

    if (!this.sessionSubjects.has(sessionId)) {
      this.sessionSubjects.set(sessionId, new Subject<MessageEvent>());
    }
    const broadcastSubject = this.sessionSubjects.get(sessionId)!;

    return new Observable<MessageEvent>((subscriber) => {
      // Emit the initial game state immediately to the subscriber upon connection/reconnection
      subscriber.next({
        data: gameState,
      });

      const broadcastSub = broadcastSubject.subscribe(subscriber);

      return () => {
        broadcastSub.unsubscribe();
        if (broadcastSubject.observed === false) {
          this.sessionSubjects.delete(sessionId);
        }
      };
    });
  }

  async emitState(sessionId: string, gameState?: GameStateType): Promise<void> {
    const subject = this.sessionSubjects.get(sessionId);
    if (!subject) return;

    let state = gameState;
    if (!state) {
      const fetched = await this.sessionRepository.findGameStateById(sessionId);
      if (!fetched) return;
      state = fetched;
    }

    subject.next({
      data: state,
    });
  }
}
