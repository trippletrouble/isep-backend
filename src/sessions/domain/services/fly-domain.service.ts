import { Injectable } from '@nestjs/common';
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

  rollDebuff(): number {
    return Math.floor(Math.random() * 3) + 1; // 1–3
  }

  applyDebuff(diceValue: number, debuff: number): number {
    return Math.max(1, diceValue - debuff);
  }

  shouldRemoveFlyAfterDebuff(debuffCount: number): boolean {
    return debuffCount >= MAX_DEBUFFS;
  }

  resolveKick(
    attackerFigure: GameStateFigureType,
    victimFigure: GameStateFigureType,
  ): {
    bothRemoved: boolean;
    transferToAttacker: boolean;
    attackerLosesFly: boolean;
  } {
    if (attackerFigure.hasPlagueFly && victimFigure.hasPlagueFly) {
      return {
        bothRemoved: true,
        transferToAttacker: false,
        attackerLosesFly: false,
      };
    }
    if (victimFigure.hasPlagueFly) {
      return {
        bothRemoved: false,
        transferToAttacker: true,
        attackerLosesFly: false,
      };
    }
    if (attackerFigure.hasPlagueFly) {
      return {
        bothRemoved: false,
        transferToAttacker: false,
        attackerLosesFly: true,
      };
    }
    return {
      bothRemoved: false,
      transferToAttacker: false,
      attackerLosesFly: false,
    };
  }
}
