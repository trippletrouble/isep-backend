import { Injectable } from '@nestjs/common';
import { PlayerColor } from '../../../generated/prisma-client/client';
import { GameStateType, PossibleMoveType } from '../../application';
import { MoveOutcomeType } from '@common';
import {
  TURN_ORDER,
  HOME_POSITION,
  MAIN_TRACK_SIZE,
  MAIN_TRACK_END,
  GOAL_LANE_SIZE,
  START_FIELDS,
  GOAL_START_FIELDS,
  FINAL_GOAL_POSITIONS,
  isFinalGoalPosition,
} from './game.constants';

export interface DiceRollResult {
  consecutiveSixes: number;
  turnForfeit: boolean;
  rollAgain: boolean;
  possibleMoves: PossibleMoveType[];
  hasMoves: boolean;
}

export interface MoveResult {
  figureId: number;
  fromPosition: number;
  toPosition: number;
  outcome: MoveOutcomeType;
  capturedFigureId: number | null;
  rollAgain: boolean;
  turnForfeit: boolean;
}

export interface ILudoEngine {
  handleRoll(session: GameStateType, diceValue: number): DiceRollResult;
  getPossibleMoves(
    session: GameStateType,
    playerId: string,
    diceValue: number,
  ): PossibleMoveType[];
  applyMove(
    session: GameStateType,
    figureId: number,
    diceValue: number,
  ): MoveResult;
  findNextPlayer(session: GameStateType): string;
}

@Injectable()
export class LudoEngine implements ILudoEngine {
  private calculateTargetPosition(
    currentPos: number,
    diceValue: number,
    color: PlayerColor,
  ): number | null {
    const startField = START_FIELDS[color];
    const goalStart = GOAL_START_FIELDS[color];
    const finalGoal = FINAL_GOAL_POSITIONS[color];
    const lastGoalLaneIndex = GOAL_LANE_SIZE - 1;

    if (currentPos === HOME_POSITION) {
      return diceValue === 6 ? startField : null;
    }

    if (currentPos >= 0 && currentPos <= MAIN_TRACK_END) {
      const progressFromStart =
        (currentPos - startField + MAIN_TRACK_SIZE) % MAIN_TRACK_SIZE;
      const nextProgress = progressFromStart + diceValue;

      if (nextProgress < MAIN_TRACK_END) {
        return (startField + nextProgress) % MAIN_TRACK_SIZE;
      }

      const goalIndex = nextProgress - MAIN_TRACK_END;

      if (goalIndex <= lastGoalLaneIndex) {
        return goalStart + goalIndex;
      }

      if (goalIndex === GOAL_LANE_SIZE) {
        return finalGoal;
      }

      return null;
    }

    if (
      currentPos >= goalStart &&
      currentPos <= goalStart + lastGoalLaneIndex
    ) {
      const goalIndex = currentPos - goalStart;
      const nextGoalIndex = goalIndex + diceValue;

      if (nextGoalIndex <= lastGoalLaneIndex) {
        return goalStart + nextGoalIndex;
      }

      if (nextGoalIndex === GOAL_LANE_SIZE) {
        return finalGoal;
      }

      return null;
    }

    return null;
  }

  public findNextPlayer(session: GameStateType): string {
    const currentParticipant = session.players.find(
      (p) => p.id === session.currentPlayerId,
    );
    if (!currentParticipant) {
      throw new Error('Current player not found in session');
    }

    const currentColor = currentParticipant.color;
    const startIndex = TURN_ORDER.indexOf(currentColor);

    for (let i = 1; i <= 4; i++) {
      const nextColor = TURN_ORDER[(startIndex + i) % 4];
      const nextPlayer = session.players.find((p) => p.color === nextColor);
      if (nextPlayer && !nextPlayer.hasFinished) {
        return nextPlayer.id;
      }
    }
    throw new Error('No active players found to advance turn');
  }

  public handleRoll(session: GameStateType, diceValue: number): DiceRollResult {
    const consecutiveSixes = diceValue === 6 ? session.consecutiveSixes + 1 : 0;

    const turnForfeit =
      session.activeRules.includes('THREE_SIXES_LOSE_TURN') &&
      consecutiveSixes >= 3;

    const possibleMoves = turnForfeit
      ? []
      : this.getPossibleMoves(session, session.currentPlayerId!, diceValue);

    const hasMoves = possibleMoves.length > 0;

    const rollAgain =
      diceValue === 6 &&
      session.activeRules.includes('THROW_AGAIN_ON_6') &&
      !turnForfeit &&
      hasMoves;

    return {
      consecutiveSixes: turnForfeit ? 0 : consecutiveSixes,
      turnForfeit,
      rollAgain,
      possibleMoves,
      hasMoves,
    };
  }

  public getPossibleMoves(
    session: GameStateType,
    playerId: string,
    diceValue: number,
  ): PossibleMoveType[] {
    const player = session.players.find((p) => p.id === playerId);
    if (!player) {
      return [];
    }

    const ownFigures = session.figures.filter((f) => f.playerId === playerId);
    const moves: PossibleMoveType[] = [];

    for (const figure of ownFigures) {
      const targetPos = this.calculateTargetPosition(
        figure.position,
        diceValue,
        player.color,
      );
      if (targetPos === null) {
        continue;
      }

      const isSelfBlocked = ownFigures.some(
        (f) =>
          f.id !== figure.id &&
          f.position === targetPos &&
          !isFinalGoalPosition(targetPos),
      );
      if (isSelfBlocked) {
        continue;
      }

      // Captures only occur on the common track (absolute positions 0–51)
      const capturesOpponent =
        targetPos >= 0 &&
        targetPos <= MAIN_TRACK_END &&
        session.figures.some(
          (f) => f.playerId !== playerId && f.position === targetPos,
        );

      moves.push({
        figureId: figure.id,
        fromPosition: figure.position,
        toPosition: targetPos,
        capturesOpponent,
      });
    }

    return moves;
  }

  public applyMove(
    session: GameStateType,
    figureId: number,
    diceValue: number,
  ): MoveResult {
    const playerId = session.currentPlayerId;
    if (!playerId) {
      throw new Error('No current player is active in the session');
    }

    const player = session.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Current player not found in session');
    }

    const figure = session.figures.find(
      (f) => f.id === figureId && f.playerId === playerId,
    );
    if (!figure) {
      throw new Error(
        'Figure not found or does not belong to the current player',
      );
    }

    const possibleMoves = this.getPossibleMoves(session, playerId, diceValue);
    const selectedMove = possibleMoves.find((m) => m.figureId === figureId);
    if (!selectedMove) {
      throw new Error('Invalid move');
    }

    let capturedFigureId: number | null = null;
    if (selectedMove.capturesOpponent) {
      const oppFigure = session.figures.find(
        (f) =>
          f.playerId !== playerId && f.position === selectedMove.toPosition,
      );
      if (oppFigure) {
        capturedFigureId = oppFigure.id;
      }
    }

    let outcome: MoveOutcomeType = 'MOVED';
    if (selectedMove.capturesOpponent) {
      outcome = 'CAPTURED';
    } else if (isFinalGoalPosition(selectedMove.toPosition)) {
      const ownFigures = session.figures.filter((f) => f.playerId === playerId);
      const allInGoal = ownFigures.every((f) =>
        f.id === figureId ? true : isFinalGoalPosition(f.position),
      );
      outcome = allInGoal ? 'GAME_WON' : 'GOAL';
    }

    const rollAgain =
      outcome !== 'GAME_WON' &&
      (selectedMove.capturesOpponent ||
        (diceValue === 6 && session.activeRules.includes('THROW_AGAIN_ON_6')));

    return {
      figureId,
      fromPosition: selectedMove.fromPosition,
      toPosition: selectedMove.toPosition,
      outcome,
      capturedFigureId,
      rollAgain,
      turnForfeit: false,
    };
  }
}
