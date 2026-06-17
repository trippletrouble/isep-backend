import { Inject, Injectable, MessageEvent } from '@nestjs/common';
import { interval, merge, Observable, of, Subject } from 'rxjs';
import { finalize, map, takeUntil } from 'rxjs/operators';
import { SessionRepositoryPort } from '../../ports';
import { SessionNotFoundError } from '../use-cases';
import {
  SessionEventMessage,
  SessionEventPayloadMap,
  SessionEventType,
} from '../use-cases/types';

const HEARTBEAT_INTERVAL_MS = 15000;

type SessionStream = {
  events: Subject<MessageEvent>;
  closed: Subject<void>;
};

@Injectable()
export class SessionEventsService {
  private readonly streams = new Map<string, SessionStream>();
  private readonly subscriberCounts = new Map<string, number>();

  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
  ) {}

  async getStream(sessionId: string): Promise<Observable<MessageEvent>> {
    const gameState = await this.sessionRepo.findGameStateById(sessionId);
    if (!gameState) throw new SessionNotFoundError();

    const stream = this.getOrCreateStream(sessionId);
    this.incrementSubscribers(sessionId);

    return merge(
      of(this.createEvent('game_state', gameState)),
      stream.events.asObservable(),
      interval(HEARTBEAT_INTERVAL_MS).pipe(
        map(() => this.createEvent('heartbeat', '')),
      ),
    ).pipe(
      takeUntil(stream.closed),
      finalize(() => this.decrementSubscribers(sessionId)),
    );
  }

  emit<T extends Exclude<SessionEventType, 'heartbeat' | 'game_state'>>(
    sessionId: string,
    eventType: T,
    data: SessionEventPayloadMap[T],
  ): void {
    const stream = this.streams.get(sessionId);
    if (!stream) return;

    stream.events.next(this.createEvent(eventType, data));
  }

  removeStream(sessionId: string): void {
    const stream = this.streams.get(sessionId);
    if (!stream) return;

    this.streams.delete(sessionId);
    this.subscriberCounts.delete(sessionId);
    stream.closed.next();
    stream.closed.complete();
    stream.events.complete();
  }

  private getOrCreateStream(sessionId: string): SessionStream {
    const existingStream = this.streams.get(sessionId);
    if (existingStream) return existingStream;

    const stream = {
      events: new Subject<MessageEvent>(),
      closed: new Subject<void>(),
    };
    this.streams.set(sessionId, stream);
    return stream;
  }

  private incrementSubscribers(sessionId: string): void {
    const currentCount = this.subscriberCounts.get(sessionId) ?? 0;
    this.subscriberCounts.set(sessionId, currentCount + 1);
  }

  private decrementSubscribers(sessionId: string): void {
    const currentCount = this.subscriberCounts.get(sessionId) ?? 0;
    if (currentCount <= 1) {
      this.removeStream(sessionId);
      return;
    }

    this.subscriberCounts.set(sessionId, currentCount - 1);
  }

  private createEvent<T extends SessionEventType>(
    type: T,
    data: SessionEventPayloadMap[T],
  ): SessionEventMessage<T> {
    return { type, data };
  }
}
