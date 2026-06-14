import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { LeaveSessionUseCase } from './leave-session.use-case';
import { SessionNotFoundError, ParticipantNotFoundError } from './errors';
import { GameStateType } from './types/game-state.type';

@Injectable()
export class ReconnectUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    private readonly leaveSessionUseCase: LeaveSessionUseCase,
  ) {}

  async execute(sessionId: string, userId: string): Promise<GameStateType> {
    const session = await this.sessionRepo.findSessionById(sessionId);
    if (!session) throw new SessionNotFoundError();

    const participant = session.participants.find((p) => p.userId === userId);
    if (!participant) throw new ParticipantNotFoundError();

    if (session.status === 'IN_PROGRESS') {
      this.leaveSessionUseCase.cancelReconnectTimeout(sessionId, userId);
    }

    const gameState = await this.sessionRepo.findGameStateById(sessionId);
    if (!gameState) throw new SessionNotFoundError();

    return gameState;
  }
}
