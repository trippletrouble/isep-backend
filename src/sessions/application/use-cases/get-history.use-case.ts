import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { GameHistoryEventDto } from '../dtos/game-history-event.dto';
import { SessionNotFoundError } from './errors';

@Injectable()
export class GetHistoryUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
  ) {}

  async execute(sessionId: string): Promise<GameHistoryEventDto[]> {
    const session = await this.sessionRepo.findByIdMinimal(sessionId);
    if (!session) throw new SessionNotFoundError();

    return this.sessionRepo.findHistoryBySessionId(sessionId);
  }
}
