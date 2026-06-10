import { Inject, Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { LudoEngine } from '../../domain/model/ludo-engine';
import { GameStatus, PieceStatus } from '@prisma/client';

@Injectable()
export class GetPossibleMovesUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    private readonly engine: LudoEngine,
  ) {}

  async execute(sessionId: string, playerId: string) {
    const details = await this.sessionRepo.findSessionWithDetails(sessionId);
    if (!details) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const { session, participants, figures } = details;

    // 1. Verify game status is IN_PROGRESS
    if (session.status !== GameStatus.IN_PROGRESS) {
      throw new ConflictException({
        message: 'Game is not in progress',
        code: 'GAME_NOT_IN_PROGRESS',
      });
    }

    // 2. Find participant
    const participant = participants.find((p) => p.id === playerId);
    if (!participant) {
      throw new BadRequestException('Player not found in this session');
    }

    // 3. Verify it is their turn
    if (session.currentPlayerId !== playerId) {
      throw new BadRequestException({
        message: 'It is not your turn',
        code: 'NOT_YOUR_TURN',
      });
    }

    // 4. Verify player has rolled the dice first
    if (!session.diceRolledThisTurn || session.lastDiceValue === null) {
      throw new BadRequestException({
        message: 'Es wurde noch nicht gewürfelt. Zuerst POST /rolls aufrufen.',
        code: 'DICE_NOT_ROLLED',
      });
    }

    const rolledValue = session.lastDiceValue;

    // 5. Calculate possible moves
    const possibleFigures = this.engine.getPossibleMoves(session, participant, figures, rolledValue);
    const possibleMovesResult = possibleFigures.map((fig) => {
      const targetPos = LudoEngine.calculateTargetPosition(participant.color, fig.position, rolledValue)!;
      const capturesOpponent = figures.some(
        (f) => f.participantId !== participant.id && f.status === PieceStatus.ACTIVE && f.position === targetPos
      );
      return {
        figureId: fig.id,
        fromPosition: fig.position,
        toPosition: targetPos,
        capturesOpponent,
      };
    });

    return {
      diceValue: rolledValue,
      possibleMoves: possibleMovesResult,
    };
  }
}
