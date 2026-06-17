import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { GameStateCacheService } from '../services/game-state-cache.service';
import { SessionNotFoundError, ParticipantNotFoundError } from './errors';

@Injectable()
export class LeaveSessionUseCase {
  private activeTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    private readonly cache: GameStateCacheService,
  ) {}

  async execute(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepo.findSessionById(sessionId);
    if (!session) throw new SessionNotFoundError();

    const participant = session.participants.find((p) => p.userId === userId);
    if (!participant) throw new ParticipantNotFoundError();

    if (session.status === 'WAITING') {
      await this.sessionRepo.removeParticipant(sessionId, userId);

      const remainingParticipants = session.participants.filter(
        (p) => p.userId !== userId,
      );

      if (remainingParticipants.length === 0) {
        await this.sessionRepo.deleteSession(sessionId);
      } else if (session.hostId === userId) {
        // Transfer host role to the oldest remaining player
        const sorted = [...remainingParticipants].sort(
          (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
        );
        const newHost = sorted[0];
        await this.sessionRepo.updateSessionById(sessionId, {
          hostId: newHost.userId,
        });
      }
      this.cache.invalidate(sessionId).catch(() => {});
    } else if (session.status === 'IN_PROGRESS') {
      // Slot reservation: Start a 60-second in-memory timer
      const timeoutKey = `${sessionId}_${userId}`;
      if (this.activeTimeouts.has(timeoutKey)) {
        clearTimeout(this.activeTimeouts.get(timeoutKey));
      }

      const timeoutId = setTimeout(async () => {
        this.activeTimeouts.delete(timeoutKey);
        await this.cleanupParticipant(sessionId, userId);
      }, 60000);

      this.activeTimeouts.set(timeoutKey, timeoutId);
    }
  }

  private async cleanupParticipant(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const session = await this.sessionRepo.findSessionById(sessionId);
    if (!session) return;

    const participant = session.participants.find((p) => p.userId === userId);
    if (!participant) return; // Already cleaned up or reconnected (if reconnect deletes timeout)

    const remainingParticipants = session.participants.filter(
      (p) => p.userId !== userId,
    );

    if (remainingParticipants.length === 0) {
      await this.sessionRepo.deleteSession(sessionId);
    } else {
      // If leaving participant holds the current turn, pass the turn first
      if (participant.isCurrentTurn) {
        await this.sessionRepo.passTurn(sessionId, userId);
      }

      await this.sessionRepo.removeParticipant(sessionId, userId);

      // If leaving participant was the host, transfer host role
      if (session.hostId === userId) {
        const sorted = [...remainingParticipants].sort(
          (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
        );
        const newHost = sorted[0];
        await this.sessionRepo.updateSessionById(sessionId, {
          hostId: newHost.userId,
        });
      }
    }
    this.cache.invalidate(sessionId).catch(() => {});
  }

  /**
   * Called by reconnect logic to cancel active timeout
   */
  cancelReconnectTimeout(sessionId: string, userId: string): void {
    const timeoutKey = `${sessionId}_${userId}`;
    const timeoutId = this.activeTimeouts.get(timeoutKey);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.activeTimeouts.delete(timeoutKey);
    }
  }
}
