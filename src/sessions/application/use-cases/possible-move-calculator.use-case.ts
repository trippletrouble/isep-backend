import { Injectable } from '@nestjs/common';

import { GameStateType } from './types/game-state.type';
import { GameStateFigureType } from './types/game-state-figure.type';
import { GameStateFromPlayerType } from './types/game-state-from-Player.type';
import { PossibleMoveType } from './types/possible-move.type';

const START_FIELDS = {
  RED: 0,
  BLUE: 10,
  GREEN: 20,
  YELLOW: 30,
} as const;

const GOAL_START_FIELDS = {
  RED: 40,
  BLUE: 44,
  GREEN: 48,
  YELLOW: 52,
} as const;

@Injectable()
export class PossibleMoveCalculatorUseCase {
  calculate(
    gameState: GameStateType,
    playerId: string,
    diceValue: number,
  ): PossibleMoveType[] {
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) {
      return [];
    }
    const ownFigures = gameState.figures.filter(
      (figure) => figure.playerId === playerId,
    );

    return ownFigures
      .map((figure) =>
        this.calculateMoveForFigure(
          figure,
          player,
          gameState.figures,
          diceValue,
        ),
      )
      .filter((move): move is PossibleMoveType => move !== null);
  }

  private calculateMoveForFigure(
    figure: GameStateFigureType,
    player: GameStateFromPlayerType,
    allFigures: GameStateFigureType[],
    diceValue: number,
  ): PossibleMoveType | null {
    if (figure.position === 56 || figure.status === 'GOAL') {
      return null;
    }

    const toPosition = this.calculateTargetPosition(
      figure.position,
      player.color,
      diceValue,
    );

    if (toPosition === null) {
      return null;
    }

    const ownFigureOnTarget = allFigures.some(
      (other) =>
        other.playerId === player.id &&
        other.id !== figure.id &&
        other.position === toPosition &&
        toPosition !== 56,
    );

    if (ownFigureOnTarget) {
      return null;
    }

    const capturesOpponent =
      toPosition >= 0 &&
      toPosition <= 39 &&
      allFigures.some(
        (other) =>
          other.playerId !== player.id && other.position === toPosition,
      );

    return {
      figureId: figure.id,
      fromPosition: figure.position,
      toPosition,
      capturesOpponent,
    };
  }

  private calculateTargetPosition(
    fromPosition: number,
    color: GameStateFromPlayerType['color'],
    diceValue: number,
  ): number | null {
    const startField = START_FIELDS[color];
    const goalStart = GOAL_START_FIELDS[color];

    if (fromPosition === -1) {
      console.log("from home ")
      return diceValue === 6 ? startField : null;
    }
    console.log("not from home")
    if (fromPosition >= 0 && fromPosition <= 39) {
      const progressFromStart = (fromPosition - startField + 40) % 40;
      const nextProgress = progressFromStart + diceValue;

      if (nextProgress <= 39) {
        return (startField + nextProgress) % 40;
      }

      const goalIndex = nextProgress - 40;

      if (goalIndex <= 3) {
        return goalStart + goalIndex;
      }

      if (goalIndex === 4) {
        return 56;
      }

      return null;
    }

    if (fromPosition >= goalStart && fromPosition <= goalStart + 3) {
      const goalIndex = fromPosition - goalStart;
      const nextGoalIndex = goalIndex + diceValue;

      if (nextGoalIndex <= 3) {
        return goalStart + nextGoalIndex;
      }

      if (nextGoalIndex === 4) {
        return 56;
      }

      return null;
    }

    return null;
  }
}
