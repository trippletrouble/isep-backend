import {
  Inject,
  Injectable,
  MessageEvent,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
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
export class SessionEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionEventsService.name);
  private readonly streams = new Map<string, SessionStream>();
  private readonly subscriberCounts = new Map<string, number>();
  private subscriber: Redis;

  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  onModuleInit(): void {
    this.subscriber = this.redis.duplicate();
    this.subscriber.on('message', (channel, message) => {
      const sessionId = this.extractSessionId(channel);
      try {
        const parsed = JSON.parse(message) as MessageEvent;
        const stream = this.streams.get(sessionId);
        if (stream) {
          stream.events.next(parsed);
        }
      } catch (err) {
        this.logger.warn(
          `Failed to parse Pub/Sub message from channel ${channel}`,
          err,
        );
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  async getStream(sessionId: string): Promise<Observable<MessageEvent>> {
    const gameState = await this.sessionRepo.findGameStateById(sessionId);
    if (!gameState) throw new SessionNotFoundError();

    const stream = this.getOrCreateStream(sessionId);
    await this.incrementSubscribers(sessionId);

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
    const channel = this.channel(sessionId);
    const message = JSON.stringify(this.createEvent(eventType, data));
    this.redis.publish(channel, message).catch((err) => {
      this.logger.warn(
        `Failed to publish event to Redis for session ${sessionId}:`,
        err,
      );
    });
  }

  removeStream(sessionId: string): void {
    const stream = this.streams.get(sessionId);
    if (!stream) return;

    this.streams.delete(sessionId);
    this.subscriberCounts.delete(sessionId);
    stream.closed.next();
    stream.closed.complete();
    stream.events.complete();

    this.subscriber.unsubscribe(this.channel(sessionId)).catch((err) => {
      this.logger.error(
        `Failed to unsubscribe from Redis channel for session ${sessionId}:`,
        err,
      );
    });
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

  private async incrementSubscribers(sessionId: string): Promise<void> {
    const currentCount = this.subscriberCounts.get(sessionId) ?? 0;
    const newCount = currentCount + 1;
    this.subscriberCounts.set(sessionId, newCount);

    if (newCount === 1) {
      try {
        await this.subscriber.subscribe(this.channel(sessionId));
      } catch (err) {
        this.logger.error(
          `Failed to subscribe to Redis channel for session ${sessionId}:`,
          err,
        );
      }
    }
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

  private channel(sessionId: string): string {
    return `session:${sessionId}:events`;
  }

  private extractSessionId(channel: string): string {
    const parts = channel.split(':');
    return parts[1];
  }
}
