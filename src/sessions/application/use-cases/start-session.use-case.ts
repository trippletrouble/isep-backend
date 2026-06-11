import { Inject, Injectable } from '@nestjs/common';
import { PieceStatus } from '@prisma/client';
import { SessionRepositoryPort } from '../../ports';
import { PrismaService } from '../../../prisma/prisma.service';
import { User } from '../../../generated/prisma-class/user';
import { Position, StartSessionInfoType } from './types';
import {
  InvalidSessionStatusError,
  NotEnoughPlayersError,
  NotHostError,
  SessionNotFoundError,
} from './errors';
import { GameParticipant } from '../../../generated/prisma-class/game_participant';

export {
  InvalidSessionStatusError,
  NotEnoughPlayersError,
  NotHostError,
  SessionNotFoundError,
};

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

  async execute(sessionId: string, user: User): Promise<StartSessionInfoType> {
    const session = await this.sessionRepo.findSessionById(sessionId);

    if (!session) throw new SessionNotFoundError();

    if (session.hostId !== user.id) throw new NotHostError();

    if (session.status !== 'WAITING') throw new InvalidSessionStatusError();
    const participants: GameParticipant[] = session.participants;

    if (participants.length < 2) throw new NotEnoughPlayersError();

    const shuffledParticipants: GameParticipant[] = [...participants].sort(
      () => Math.random() - 0.5,
    );
    const playerIdOrder = shuffledParticipants.map(
      (p: GameParticipant) => p.userId,
    );
    const firstPlayerId = shuffledParticipants[0].userId;

    const figuresToCreate: CreatedFigure[] = [];

    for (
      let playerIndex = 0;
      playerIndex < participants.length;
      playerIndex++
    ) {
      const participant = participants[playerIndex];
      for (let figureIndex = 0; figureIndex < 4; figureIndex++) {
        figuresToCreate.push({
          id: playerIndex * 4 + (figureIndex + 1),
          sessionId: sessionId,
          participantId: participant.id,
          position: Position.Home,
          status: PieceStatus.HOME,
        });
      }
    }

    await this.sessionRepo.updateSessionById(sessionId, {
      status: 'IN_PROGRESS',
      currentPlayerId: firstPlayerId,
      turnNumber: 0,
      startedAt: new Date(),
    });

    await this.prisma.$transaction(async (tx) => {
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
      playerIdOrder,
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
