import { Injectable } from '@nestjs/common';

import { GameStateType } from './types/game-state.type';
import { GameStateFigureType } from './types/game-state-figure.type';
import { GameStateFromPlayerType } from './types/game-state-from-Player.type';
import { PossibleMoveType } from './types/possible-move.type';

export const FINAL_GOAL_POSITION = 56;
const MAIN_TRACK_START = 0;
const MAIN_TRACK_SIZE = 40;
const MAIN_TRACK_END = MAIN_TRACK_START + MAIN_TRACK_SIZE - 1;
const GOAL_LANE_SIZE = 4;
const LAST_GOAL_LANE_INDEX = GOAL_LANE_SIZE - 1;

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
    if (figure.position === FINAL_GOAL_POSITION || figure.status === 'GOAL') {
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
        toPosition !== FINAL_GOAL_POSITION,
    );

    if (ownFigureOnTarget) {
      return null;
    }

    const capturesOpponent =
      toPosition >= MAIN_TRACK_START &&
      toPosition <= MAIN_TRACK_END &&
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
      return diceValue === 6 ? startField : null;
    }
    if (fromPosition >= MAIN_TRACK_START && fromPosition <= MAIN_TRACK_END) {
      const progressFromStart =
        (fromPosition - startField + MAIN_TRACK_SIZE) % MAIN_TRACK_SIZE;
      const nextProgress = progressFromStart + diceValue;

      if (nextProgress <= MAIN_TRACK_END) {
        return (startField + nextProgress) % MAIN_TRACK_SIZE;
      }

      const goalIndex = nextProgress - MAIN_TRACK_SIZE;

      if (goalIndex <= LAST_GOAL_LANE_INDEX) {
        return goalStart + goalIndex;
      }

      if (goalIndex === GOAL_LANE_SIZE) {
        return FINAL_GOAL_POSITION;
      }

      return null;
    }

    if (
      fromPosition >= goalStart &&
      fromPosition <= goalStart + LAST_GOAL_LANE_INDEX
    ) {
      const goalIndex = fromPosition - goalStart;
      const nextGoalIndex = goalIndex + diceValue;

      if (nextGoalIndex <= LAST_GOAL_LANE_INDEX) {
        return goalStart + nextGoalIndex;
      }

      if (nextGoalIndex === GOAL_LANE_SIZE) {
        return FINAL_GOAL_POSITION;
      }

      return null;
    }

    return null;
  }
}
