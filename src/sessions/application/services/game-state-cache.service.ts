import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { GameStateType } from '../use-cases';

const KEY_PREFIX = 'session';
const TTL_SECONDS = 1800;

@Injectable()
export class GameStateCacheService {
  private readonly logger = new Logger(GameStateCacheService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async get(sessionId: string): Promise<GameStateType | null> {
    try {
      const raw = await this.redis.get(this.key(sessionId));
      if (!raw) return null;
      return JSON.parse(raw) as GameStateType;
    } catch (err) {
      this.logger.warn(`Redis GET failed for ${sessionId}`, err);
      return null;
    }
  }

  async set(sessionId: string, state: GameStateType): Promise<void> {
    try {
      await this.redis.set(
        this.key(sessionId),
        JSON.stringify(state),
        'EX',
        TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`Redis SET failed for ${sessionId}`, err);
    }
  }

  async invalidate(sessionId: string): Promise<void> {
    try {
      await this.redis.del(this.key(sessionId));
    } catch (err) {
      this.logger.warn(`Redis DEL failed for ${sessionId}`, err);
    }
  }

  private key(sessionId: string): string {
    return `${KEY_PREFIX}:${sessionId}:state`;
  }
}
