import { Inject, Injectable } from '@nestjs/common';
import { PieceStatus } from '@prisma/client';
import { SessionRepositoryPort } from '../../ports/session-repository.port';
import { PrismaService } from '../../../prisma/prisma.service';
import { User } from '../../../generated/prisma-class/user';

export class NotEnoughPlayersError extends Error {
  constructor() {
    super('NOT_ENOUGH_PLAYERS');
    this.name = 'NotEnoughPlayersError';
  }
}

export class NotHostError extends Error {
  constructor() {
    super('NOT_HOST');
    this.name = 'NotHostError';
  }
}

export class InvalidSessionStatusError extends Error {
  constructor() {
    super('Session is not in WAITING status');
    this.name = 'InvalidSessionStatusError';
  }
}

export class SessionNotFoundError extends Error {
  constructor() {
    super('SESSION_NOT_FOUND');
    this.name = 'SessionNotFoundError';
  }
}

type CreatedFigure = {
  id: number;
  sessionId: string;
  participantId: string;
  position: number;
  status: PieceStatus;
};

@Injectable()
export class StartSessionUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    sessionId: string,
    user: User,
  ): Promise<{
    sessionId: string;
    status: string;
    currentPlayerId: string;
    playerOrder: string[];
    figures: Array<{
      id: number;
      sessionId: string;
      participantId: string;
      position: number;
      status: string;
    }>;
  }> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });

    if (!session) {
      throw new SessionNotFoundError();
    }

    if (session.hostId !== user.id) {
      throw new NotHostError();
    }

    if (session.status !== 'WAITING') {
      throw new InvalidSessionStatusError();
    }

    const participants = session.participants;
    console.log(participants);
    if (participants.length < 2) {
      throw new NotEnoughPlayersError();
    }

    const shuffledParticipants = [...participants].sort(
      () => Math.random() - 0.5,
    );
    const playerOrder = shuffledParticipants.map((p) => p.userId);
    const firstPlayerId = shuffledParticipants[0].userId;

    const figuresToCreate: CreatedFigure[] = [];
    for (let pIndex = 0; pIndex < participants.length; pIndex++) {
      const participant = participants[pIndex];
      for (let i = 0; i < 4; i++) {
        figuresToCreate.push({
          id: pIndex * 4 + (i + 1),
          sessionId: sessionId,
          participantId: participant.id,
          position: -1, // HOME
          status: PieceStatus.HOME,
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'IN_PROGRESS',
          currentPlayerId: firstPlayerId,
          turnNumber: 0,
          startedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.figure.createMany({
        data: figuresToCreate,
        skipDuplicates: true,
      });

      for (let i = 0; i < shuffledParticipants.length; i++) {
        await tx.gameParticipant.update({
          where: { id: shuffledParticipants[i].id },
          data: {
            isCurrentTurn: i === 0,
            updatedAt: new Date(),
          },
        });
      }
    });
    return {
      sessionId,
      status: 'IN_PROGRESS',
      currentPlayerId: firstPlayerId,
      playerOrder,
      figures: figuresToCreate.map((f) => ({
        id: f.id,
        sessionId: f.sessionId,
        participantId: f.participantId,
        position: f.position,
        status: f.status,
      })),
    };
  }
}
