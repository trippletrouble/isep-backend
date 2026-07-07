import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

const KEY_PREFIX = 'session';
const TTL_SECONDS = 300;

@Injectable()
export class FlyDebuffCacheService {
  private readonly logger = new Logger(FlyDebuffCacheService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async set(sessionId: string, debuffMap: Map<number, number>): Promise<void> {
    try {
      await this.redis.set(
        this.key(sessionId),
        JSON.stringify(Object.fromEntries(debuffMap)),
        'EX',
        TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`FlyDebuff SET failed for ${sessionId}`, err);
    }
  }

  async get(sessionId: string): Promise<Map<number, number>> {
    try {
      const raw = await this.redis.get(this.key(sessionId));
      if (!raw) return new Map();
      const obj = JSON.parse(raw) as Record<string, number>;
      return new Map(Object.entries(obj).map(([k, v]) => [Number(k), v]));
    } catch (err) {
      this.logger.warn(`FlyDebuff GET failed for ${sessionId}`, err);
      return new Map();
    }
  }

  async invalidate(sessionId: string): Promise<void> {
    try {
      await this.redis.del(this.key(sessionId));
    } catch (err) {
      this.logger.warn(`FlyDebuff DEL failed for ${sessionId}`, err);
    }
  }

  private key(sessionId: string): string {
    return `${KEY_PREFIX}:${sessionId}:fly-debuff`;
  }
}
