import { Injectable, Logger } from '@nestjs/common';
import { appConfig } from '@common';
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
  private readonly baseUrl = appConfig.fly_service_url;

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
    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}/flies/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, figureId }),
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { assigned: boolean };
      return data.assigned;
    } catch (err) {
      this.logger.warn(`Failed to contact fly-service assign: ${err.message}. Falling back.`);
      return true;
    }
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
    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}/flies/apply-roll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figureId, diceValue }),
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        return (await response.json()) as any;
      }
    } catch (err) {
      this.logger.warn(`Failed to contact fly-service apply-roll: ${err.message}. Falling back.`);
    }

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
      const response = await fetch(`${this.baseUrl}/games/${gameId}/flies/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attackerFigureId, victimFigureId }),
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = (await response.json()) as {
          bothFliesRemoved: boolean;
          flyTransferred: boolean;
          attackerFlyRemoved: boolean;
        };
        return data;
      }
    } catch (err) {
      this.logger.warn(`Failed to contact fly-service kick: ${err.message}. Falling back.`);
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
    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}/flies/reach-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figureId }),
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        return (await response.json()) as any;
      }
    } catch (err) {
      this.logger.warn(`Failed to contact fly-service reach-goal: ${err.message}. Falling back.`);
    }
    return { flyRemoved: true };
  }

  async resetGame(gameId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/games/${gameId}/flies`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(3000),
      });
    } catch (err) {
      this.logger.warn(`Failed to contact fly-service delete: ${err.message}.`);
    }
  }

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
