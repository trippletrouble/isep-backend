import { Inject, Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { Session } from 'src/generated/prisma-class/session';
import { GameParticipant } from 'src/generated/prisma-class/game_participant';
import { GameStatus, PlayerColor, PieceStatus } from '@prisma/client';

const COLOR_FIGURE_IDS: Record<PlayerColor, number[]> = {
  [PlayerColor.RED]: [0, 1, 2, 3],
  [PlayerColor.BLUE]: [4, 5, 6, 7],
  [PlayerColor.GREEN]: [8, 9, 10, 11],
  [PlayerColor.YELLOW]: [12, 13, 14, 15],
};

@Injectable()
export class StartSessionUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
  ) {}

  async execute(sessionId: string, userId: string): Promise<{ session: Session; participants: GameParticipant[] }> {
    const details = await this.sessionRepo.findSessionWithDetails(sessionId);
    if (!details) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const { session, participants } = details;

    // 1. Verify host ownership
    if (session.hostId !== userId) {
      throw new ForbiddenException('Only the host can start the session');
    }

    // 2. Verify status is WAITING
    if (session.status !== GameStatus.WAITING) {
      throw new BadRequestException(`Session is not in WAITING status (current: ${session.status})`);
    }

    // 3. Validate minimum player count (>= 2)
    if (participants.length < 2) {
      throw new BadRequestException('At least 2 players are required to start the game');
    }

    // 4. Initialize 4 figures for each participant at position -1 (HOME)
    const figuresToCreate: { id: number; sessionId: string; participantId: string; position: number; status: string }[] = [];
    for (const p of participants) {
      const ids = COLOR_FIGURE_IDS[p.color];
      for (const id of ids) {
        figuresToCreate.push({
          id,
          sessionId: session.id,
          participantId: p.id,
          position: -1,
          status: PieceStatus.HOME,
        });
      }
    }

    await this.sessionRepo.createFigures(figuresToCreate);

    // 5. Randomly select the starting player
    const randomIdx = Math.floor(Math.random() * participants.length);
    const startingPlayer = participants[randomIdx];

    session.status = GameStatus.IN_PROGRESS;
    session.currentPlayerId = startingPlayer.id;
    session.diceRolledThisTurn = false;
    session.consecutiveSixes = 0;
    session.turnNumber = 1;
    session.startedAt = new Date();
    session.updatedAt = new Date();

    for (const p of participants) {
      p.isCurrentTurn = p.id === startingPlayer.id;
      p.hasFinished = false;
      p.figuresInGoal = 0;
      p.placement = null;
      p.figuresCaptured = 0;
      p.updatedAt = new Date();
    }

    // 6. Persist updated session and participants
    // We retrieve the figures again to pass them to updateSessionState
    const updatedDetails = await this.sessionRepo.findSessionWithDetails(sessionId);
    if (!updatedDetails) {
      throw new Error('Could not reload session details after creating figures');
    }

    await this.sessionRepo.updateSessionState(session, participants, updatedDetails.figures);

    return {
      session,
      participants,
    };
  }
}
