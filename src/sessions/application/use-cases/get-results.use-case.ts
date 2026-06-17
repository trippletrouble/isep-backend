import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { GameResultDto } from '../dtos';
import { SessionNotFoundError, InvalidSessionStatusError } from './errors';

@Injectable()
export class GetResultsUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
  ) {}

  async execute(sessionId: string): Promise<GameResultDto[]> {
    const session = await this.sessionRepo.findSessionById(sessionId);
    if (!session) throw new SessionNotFoundError();
    if (session.status !== 'FINISHED') throw new InvalidSessionStatusError();

    return session.participants
      .filter((p) => p.placement !== null)
      .sort((a, b) => a.placement! - b.placement!)
      .map((p) => ({
        placement: p.placement!,
        userId: p.userId,
        color: p.color,
        figuresInGoal: p.figuresInGoal,
        figuresCaptured: p.figuresCaptured,
      }));
  }
}
