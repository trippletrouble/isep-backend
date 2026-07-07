import { Inject, Injectable, Optional } from '@nestjs/common';
import { SessionRepositoryPort, DiceClientPort } from '../../../../ports';
import { LudoEngine } from '../../../../domain';
import {
  GameStateCacheService,
  SessionEventsService,
  FlyDebuffCacheService,
} from '../../../services';
import {
  DiceAlreadyRolledError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
  QuizInProgressError,
} from '../../errors';
import { DiceRollResultType } from '../../types';
import { PossibleMoveCalculatorUseCase } from './possible-move-calculator.use-case';
import { FlyDomainService } from '../../../../domain';

@Injectable()
export class RollDiceUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
    @Inject(DiceClientPort)
    private readonly diceClient: DiceClientPort,
    private readonly possibleMoveCalculator: PossibleMoveCalculatorUseCase,
    private readonly cache: GameStateCacheService,
    private readonly flyDebuffCache: FlyDebuffCacheService,
    private readonly ludoEngine: LudoEngine,
    private readonly flyDomainService: FlyDomainService,
    @Optional()
    private readonly sessionEvents?: SessionEventsService,
  ) {}

  async execute(
    sessionId: string,
    playerId: string,
  ): Promise<DiceRollResultType> {
    const gameState = await this.sessionRepository.findGameStateById(sessionId);
    if (!gameState) throw new SessionNotFoundError();
    if (gameState.status === 'QUIZ_PENDING') {
      throw new QuizInProgressError();
    }
    if (gameState.status !== 'IN_PROGRESS')
      throw new InvalidSessionStatusError();
    if (gameState.currentPlayerId !== playerId) throw new NotYourTurnError();
    if (gameState.diceRolledThisTurn) throw new DiceAlreadyRolledError();

    let value: number;
    const cheatList = (global as any).cheatRolls?.[sessionId];
    if (process.env.NODE_ENV !== 'production' && Array.isArray(cheatList) && cheatList.length > 0) {
      value = cheatList.shift();
    } else {
      value = await this.diceClient.roll();
    }
    const flyActive = gameState.activeRules.includes('PLAGUE_FLY');

    const flyDebuffMap = new Map<number, number>();

    let plagueFlyAcquired = false;
    let acquiredFigureId: number | undefined;

    if (flyActive) {
      const playerFigures = gameState.figures.filter(
        (f) => f.playerId === playerId,
      );

      for (const figure of playerFigures) {
        if (!figure.hasPlagueFly) continue;

        const result = await this.flyDomainService.applyRoll(
          sessionId,
          String(figure.id),
          value,
        );

        const effectiveDice = result.modifiedValue;
        flyDebuffMap.set(figure.id, effectiveDice);

        if (result.flyRemoved) {
          await this.sessionRepository.setFigureHasPlagueFly(
            sessionId,
            figure.id,
            false,
          );
          flyDebuffMap.delete(figure.id);
        } else {
          const updatedCount = await this.sessionRepository.incrementFlyDebuffCount(
            sessionId,
            figure.id,
          );
          if (updatedCount >= 3) {
            await this.sessionRepository.setFigureHasPlagueFly(
              sessionId,
              figure.id,
              false,
            );
            flyDebuffMap.delete(figure.id);
          }
        }
      }

      if (value === 1) {
        const playerFigures = gameState.figures.filter(
          (f) => f.playerId === playerId,
        );
        const eligible = playerFigures.find((f) =>
          this.flyDomainService.canAssignFly(gameState.activeFlyCount, f),
        );

        if (eligible) {
          const assigned = await this.flyDomainService.tryAssignFly(
            sessionId,
            playerId,
            String(eligible.id),
          );
          if (assigned) {
            await this.sessionRepository.setFigureHasPlagueFly(
              sessionId,
              eligible.id,
              true,
            );
            plagueFlyAcquired = true;
            acquiredFigureId = eligible.id;
          }
        }
      }
    }
    await this.flyDebuffCache.set(sessionId, flyDebuffMap);

    const freshState =
      await this.sessionRepository.findGameStateById(sessionId);
    if (!freshState) throw new SessionNotFoundError();

    const result = this.ludoEngine.handleRoll(freshState, value, flyDebuffMap);

    await this.sessionRepository.updateAfterDiceRoll(sessionId, {
      lastDiceValue: value,
      diceRolledThisTurn: !result.turnForfeit,
      consecutiveSixes: result.consecutiveSixes,
    });

    if (!result.hasMoves || result.turnForfeit) {
      await this.sessionRepository.passTurn(sessionId, playerId);
    }

    const updatedGameState =
      await this.sessionRepository.findGameStateById(sessionId);
    if (!updatedGameState) throw new SessionNotFoundError();

    this.cache.set(sessionId, updatedGameState).catch(() => {});

    this.sessionEvents?.emit(sessionId, 'dice_rolled', {
      value,
      playerId,
      hasMoves: result.hasMoves,
      rollAgain: result.rollAgain,
      consecutiveSixes: result.consecutiveSixes,
      turnForfeit: result.turnForfeit,
      plagueFlyAcquired,
    });

    if (plagueFlyAcquired && acquiredFigureId !== undefined) {
      this.sessionEvents?.emit(sessionId, 'plague_fly_acquired', {
        figureId: acquiredFigureId,
        playerId,
        activeFlyCount: updatedGameState.activeFlyCount,
      });
    }

    if (!result.hasMoves || result.turnForfeit) {
      this.sessionEvents?.emit(sessionId, 'turn_changed', {
        currentPlayerId: updatedGameState.currentPlayerId,
        turnNumber: updatedGameState.turnNumber,
      });
    }

    return {
      value,
      playerId,
      possibleMoves: result.possibleMoves,
      hasMoves: result.hasMoves,
      rollAgain: result.rollAgain,
      consecutiveSixes: result.consecutiveSixes,
      turnForfeit: result.turnForfeit,
      plagueFlyAcquired,
      gameState: updatedGameState,
    };
  }
}
