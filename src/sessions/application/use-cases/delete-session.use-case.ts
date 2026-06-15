import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { GameStateCacheService } from '../services/game-state-cache.service';
import {
  InvalidSessionStatusError,
  NotHostError,
  SessionNotFoundError,
} from './errors';

@Injectable()
export class DeleteSessionUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    private readonly cache: GameStateCacheService,
  ) {}

  async execute(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepo.findByIdMinimal(sessionId);

    if (!session) throw new SessionNotFoundError();
    if (session.hostId !== userId) throw new NotHostError();
    if (session.status !== 'WAITING') throw new InvalidSessionStatusError();

    await this.sessionRepo.deleteSessionById(sessionId);

    this.cache.invalidate(sessionId).catch(() => {});
  }
}
