import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';

@Injectable()
export class GetSessionStateUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
  ) {}

  async execute(sessionId: string) {
    const details = await this.sessionRepo.findSessionWithDetails(sessionId);
    if (!details) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const { session, participants, figures } = details;

    return {
      sessionId: session.id,
      status: session.status,
      mode: session.mode,
      boardTheme: session.boardTheme,
      players: participants,
      figures,
      currentPlayerId: session.currentPlayerId,
      turnNumber: session.turnNumber,
      lastDiceValue: session.lastDiceValue,
      diceRolledThisTurn: session.diceRolledThisTurn,
      activeRules: session.additionalRules,
      consecutiveSixes: session.consecutiveSixes,
      winnerId: session.winnerId,
      createdAt: session.createdAt,
      lastUpdatedAt: session.updatedAt,
    };
  }
}
