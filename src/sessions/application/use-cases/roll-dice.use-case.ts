import { Inject, Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { LudoEngine } from '../../domain/model/ludo-engine';
import { GameStatus, AdditionalRule, PieceStatus } from '@prisma/client';

@Injectable()
export class RollDiceUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    private readonly engine: LudoEngine,
  ) {}

  async execute(
    sessionId: string,
    userId: string,
    request: { playerId: string },
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
        message: `It is not your turn. Current player is ${session.currentPlayerId}`,
        code: 'NOT_YOUR_TURN',
      });
    }

    // 4. Verify player has not rolled yet
    if (session.diceRolledThisTurn) {
      throw new BadRequestException({
        message: 'You have already rolled this turn. Please move a figure.',
        code: 'DICE_ALREADY_ROLLED',
      });
    }

    // 5. Roll the dice
    const rolledValue = Math.floor(Math.random() * 6) + 1;

    // 6. Execute engine logic
    const {
      session: updatedSession,
      participants: updatedParticipants,
      hasMoves,
      nextPlayerId,
      rollAgain,
    } = this.engine.handleRoll(session, callerParticipant, participants, figures, rolledValue);

    const turnForfeit =
      session.additionalRules.includes(AdditionalRule.THREE_SIXES_LOSE_TURN) &&
      session.consecutiveSixes >= 3;

    // 7. Calculate possible moves array
    let possibleMovesResult: { figureId: number; fromPosition: number; toPosition: number; capturesOpponent: boolean }[] = [];
    if (hasMoves && !turnForfeit) {
      const possibleFigures = this.engine.getPossibleMoves(session, callerParticipant, figures, rolledValue);
      possibleMovesResult = possibleFigures.map((fig) => {
        const targetPos = LudoEngine.calculateTargetPosition(callerParticipant.color, fig.position, rolledValue)!;
        const capturesOpponent = figures.some(
          (f) => f.participantId !== callerParticipant.id && f.status === PieceStatus.ACTIVE && f.position === targetPos
        );
        return {
          figureId: fig.id,
          fromPosition: fig.position,
          toPosition: targetPos,
          capturesOpponent,
        };
      });
    }

    // 8. Persist state
    await this.sessionRepo.updateSessionState(updatedSession, updatedParticipants, figures);

    return {
      value: rolledValue,
      playerId: request.playerId,
      possibleMoves: possibleMovesResult,
      hasMoves,
      rollAgain,
      consecutiveSixes: updatedSession.consecutiveSixes,
      turnForfeit,
      gameState: {
        sessionId: updatedSession.id,
        status: updatedSession.status,
        mode: updatedSession.mode,
        boardTheme: updatedSession.boardTheme,
        players: updatedParticipants,
        figures,
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
