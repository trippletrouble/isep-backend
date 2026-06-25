import { Injectable } from '@nestjs/common';
import { GameStateFigureType } from '../../application/use-cases/types';

const MAX_FLIES = 3;
const MAX_DEBUFFS = 3;

@Injectable()
export class FlyDomainService {
  canAssignFly(activeFlyCount: number, figure: GameStateFigureType): boolean {
    if (activeFlyCount >= MAX_FLIES) return false;
    if (figure.hasPlagueFly) return false;
    if (figure.position === -1) return false;
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
