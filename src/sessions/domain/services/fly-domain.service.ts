import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import { GameStateFigureType } from '../../application';
import {
  GOAL_LANE_SIZE,
  GOAL_START_FIELDS,
  isFinalGoalPosition,
} from '../model';

const MAX_FLIES = 3;
const MAX_DEBUFFS = 3;

@Injectable()
export class FlyDomainService {
  private readonly logger = new Logger(FlyDomainService.name);

  constructor(private readonly prisma: PrismaService) {}

  canAssignFly(activeFlyCount: number, figure: GameStateFigureType): boolean {
    if (activeFlyCount >= MAX_FLIES) return false;
    if (figure.hasPlagueFly) return false;
    if (figure.position === -1) return false;
    if (figure.status === 'GOAL') return false;
    if (isFinalGoalPosition(figure.position)) return false;
    const goalStartPositions = Object.values(GOAL_START_FIELDS);
    const isInGoalLane = goalStartPositions.some(
      (start) =>
        figure.position >= start && figure.position < start + GOAL_LANE_SIZE,
    );
    if (isInGoalLane) return false;
    return true;
  }

  async tryAssignFly(
    gameId: string,
    playerId: string,
    figureId: string,
  ): Promise<boolean> {
    return true;
  }
  async applyRoll(
    gameId: string,
    figureId: string,
    diceValue: number,
  ): Promise<{
    originalValue: number;
    modifiedValue: number;
    debuffApplied: boolean;
    debuffValue?: number;
    flyRemoved: boolean;
  }> {
    const debuffValue = this.rollDebuff();
    const modifiedValue = this.applyDebuffLocal(diceValue, debuffValue);
    return {
      originalValue: diceValue,
      modifiedValue,
      debuffApplied: true,
      debuffValue,
      flyRemoved: false,
    };
  }

  async resolveKick(
    gameId: string,
    attackerFigureId: string,
    victimFigureId: string,
  ): Promise<{
    bothFliesRemoved: boolean;
    flyTransferred: boolean;
    attackerFlyRemoved: boolean;
  }> {
    try {
      const attacker = await this.prisma.figure.findUnique({
        where: {
          sessionId_id: {
            sessionId: gameId,
            id: Number(attackerFigureId),
          },
        },
      });
      const victim = await this.prisma.figure.findUnique({
        where: {
          sessionId_id: {
            sessionId: gameId,
            id: Number(victimFigureId),
          },
        },
      });

      const attackerHasFly = attacker?.hasPlagueFly ?? false;
      const victimHasFly = victim?.hasPlagueFly ?? false;

      if (attackerHasFly && victimHasFly) {
        return {
          bothFliesRemoved: true,
          flyTransferred: false,
          attackerFlyRemoved: false,
        };
      } else if (!attackerHasFly && victimHasFly) {
        return {
          bothFliesRemoved: false,
          flyTransferred: true,
          attackerFlyRemoved: false,
        };
      } else if (attackerHasFly && !victimHasFly) {
        return {
          bothFliesRemoved: false,
          flyTransferred: false,
          attackerFlyRemoved: true,
        };
      }
    } catch (err) {
      this.logger.warn(`Failed to resolve kick locally: ${err.message}`);
    }

    return {
      bothFliesRemoved: false,
      flyTransferred: false,
      attackerFlyRemoved: false,
    };
  }

  async handleReachGoal(
    gameId: string,
    figureId: string,
  ): Promise<{ flyRemoved: boolean }> {
    return { flyRemoved: true };
  }

  async resetGame(gameId: string): Promise<void> {}

  private rollDebuff(): number {
    return Math.floor(Math.random() * 3) + 1;
  }

  private applyDebuffLocal(diceValue: number, debuff: number): number {
    return Math.max(1, diceValue - debuff);
  }

  shouldRemoveFlyAfterDebuff(debuffCount: number): boolean {
    return debuffCount >= MAX_DEBUFFS;
  }
}
