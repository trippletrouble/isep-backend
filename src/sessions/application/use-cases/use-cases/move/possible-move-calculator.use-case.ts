import { Injectable } from '@nestjs/common';
import {
  GameStateType,
  GameStateFigureType,
  GameStateFromPlayerType,
  PossibleMoveType,
} from '../../types';
import {
  GOAL_LANE_SIZE,
  MAIN_TRACK_SIZE,
  START_FIELDS,
  GOAL_START_FIELDS,
  FINAL_GOAL_POSITIONS,
  isFinalGoalPosition,
} from '../../../../domain';

const MAIN_TRACK_START = 0;
const MAIN_TRACK_END = MAIN_TRACK_SIZE - 1;
const LAST_GOAL_LANE_INDEX = GOAL_LANE_SIZE - 1;
const GOAL_ENTRY_PROGRESS = MAIN_TRACK_SIZE - 1;

@Injectable()
export class PossibleMoveCalculatorUseCase {
  calculate(
    gameState: GameStateType,
    playerId: string,
    diceValue: number,
    flyDebuffMap?: Map<number, number>,
  ): PossibleMoveType[] {
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) {
      return [];
    }
    const ownFigures = gameState.figures.filter(
      (figure) => figure.playerId === playerId,
    );

    return ownFigures
      .map((figure) => {
        const effectiveDice = flyDebuffMap?.get(figure.id) ?? diceValue; // ← neu
        return this.calculateMoveForFigure(
          figure,
          player,
          gameState.figures,
          effectiveDice,
        );
      })
      .filter((move): move is PossibleMoveType => move !== null);
  }

  private calculateMoveForFigure(
    figure: GameStateFigureType,
    player: GameStateFromPlayerType,
    allFigures: GameStateFigureType[],
    diceValue: number,
  ): PossibleMoveType | null {
    if (isFinalGoalPosition(figure.position) || figure.status === 'GOAL') {
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
        !isFinalGoalPosition(toPosition),
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
    const finalGoalPosition = FINAL_GOAL_POSITIONS[color];

    if (fromPosition === -1) {
      return diceValue === 6 ? startField : null;
    }
    if (fromPosition >= MAIN_TRACK_START && fromPosition <= MAIN_TRACK_END) {
      const progressFromStart =
        (fromPosition - startField + MAIN_TRACK_SIZE) % MAIN_TRACK_SIZE;
      const nextProgress = progressFromStart + diceValue;

      if (nextProgress < GOAL_ENTRY_PROGRESS) {
        return (startField + nextProgress) % MAIN_TRACK_SIZE;
      }
      const goalIndex = nextProgress - GOAL_ENTRY_PROGRESS;

      if (goalIndex <= LAST_GOAL_LANE_INDEX) {
        return goalStart + goalIndex;
      }

      if (goalIndex === GOAL_LANE_SIZE) {
        return finalGoalPosition;
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
        return finalGoalPosition;
      }

      return null;
    }

    return null;
  }
}
