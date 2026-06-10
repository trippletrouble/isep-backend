import { Inject, Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { LudoEngine } from '../../domain/model/ludo-engine';
import { GameStatus, MoveOutcome } from '@prisma/client';

@Injectable()
export class MoveFigureUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    private readonly engine: LudoEngine,
  ) {}

  async execute(
    sessionId: string,
    userId: string,
    request: { playerId: string; figureId: number; targetFieldId: number },
  ) {
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

    // 2. Find participant and verify ownership
    const callerParticipant = participants.find((p) => p.id === request.playerId);
    if (!callerParticipant) {
      throw new BadRequestException('Player not found in this session');
    }
    if (callerParticipant.userId !== userId) {
      throw new ForbiddenException('You are not authorized to make actions for this player');
    }

    // 3. Verify it is their turn
    if (session.currentPlayerId !== request.playerId) {
      throw new BadRequestException({
        message: 'It is not your turn',
        code: 'NOT_YOUR_TURN',
      });
    }

    // 4. Verify player has rolled the dice first
    if (!session.diceRolledThisTurn || session.lastDiceValue === null) {
      throw new BadRequestException({
        message: 'You must roll the dice first before moving',
        code: 'DICE_NOT_ROLLED',
      });
    }

    // 5. Verify the chosen figure is in the list of possible moves
    const possibleMoves = this.engine.getPossibleMoves(session, callerParticipant, figures, session.lastDiceValue);
    const isMovable = possibleMoves.some((f) => f.id === request.figureId);
    if (!isMovable) {
      throw new BadRequestException({
        message: `Figure ${request.figureId} is not in the list of possible moves.`,
        code: 'INVALID_MOVE',
      });
    }

    const targetPos = LudoEngine.calculateTargetPosition(callerParticipant.color, figures.find((f) => f.id === request.figureId)!.position, session.lastDiceValue)!;

    // Optional Validation: verify targetFieldId from client matches calculated target position
    if (request.targetFieldId !== targetPos) {
      throw new BadRequestException({
        message: `Proposed target field ${request.targetFieldId} does not match actual calculated target position ${targetPos}.`,
        code: 'INVALID_MOVE',
      });
    }

    const movingFigure = figures.find((f) => f.id === request.figureId)!;
    const fromPosition = movingFigure.position;

    // 6. Apply move in Ludo Engine
    const {
      session: updatedSession,
      participants: updatedParticipants,
      figures: updatedFigures,
      outcome,
      capturedFigure,
      nextPlayerId,
      rollAgain,
    } = this.engine.applyMove(session, callerParticipant, participants, figures, request.figureId, session.lastDiceValue);

    // 7. Persist state
    await this.sessionRepo.updateSessionState(updatedSession, updatedParticipants, updatedFigures);

    return {
      outcome,
      figureId: request.figureId,
      fromPosition,
      toPosition: targetPos,
      capturedFigure: capturedFigure
        ? {
            figureId: capturedFigure.figureId,
            ownerPlayerId: capturedFigure.ownerPlayerId,
            previousPosition: capturedFigure.previousPosition,
          }
        : null,
      gameState: {
        sessionId: updatedSession.id,
        status: updatedSession.status,
        mode: updatedSession.mode,
        boardTheme: updatedSession.boardTheme,
        players: updatedParticipants,
        figures: updatedFigures,
        currentPlayerId: updatedSession.currentPlayerId,
        turnNumber: updatedSession.turnNumber,
        lastDiceValue: updatedSession.lastDiceValue,
        diceRolledThisTurn: updatedSession.diceRolledThisTurn,
        activeRules: updatedSession.additionalRules,
        consecutiveSixes: updatedSession.consecutiveSixes,
        winnerId: updatedSession.winnerId,
        createdAt: updatedSession.createdAt,
        lastUpdatedAt: updatedSession.updatedAt,
      },
    };
  }
}
