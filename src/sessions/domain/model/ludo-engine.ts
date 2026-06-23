import { Injectable } from '@nestjs/common';
import {
  PlayerColor,
  PieceStatus,
} from '../../../generated/prisma-client/client';
import { GameStateType, PossibleMoveType } from '../../application';
import { MoveOutcomeType } from '@common';

export const TURN_ORDER: PlayerColor[] = [
  PlayerColor.RED,
  PlayerColor.BLUE,
  PlayerColor.YELLOW,
  PlayerColor.GREEN,
];

export const COLOR_OFFSET: Record<PlayerColor, number> = {
  RED: 0,
  BLUE: 13,
  YELLOW: 26,
  GREEN: 39,
};

// Coordinate system boundaries (player-relative)
export const HOME_POSITION = -1;
export const START_POSITION = 0;
export const COMMON_TRACK_END = 50;
export const HOME_RUN_START = 51;
export const HOME_RUN_END = 55;
export const GOAL_POSITION = 56;
export const COMMON_TRACK_SIZE = 52; // 0-51 global fields for modulo

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
  /**
   * Translates a player-relative position on the common track (0-50) to the absolute board position (0-51).
   * @param color The player's color
   * @param playerPosition The player-relative position
   */
  private toAbsolutePosition(
    color: PlayerColor,
    playerPosition: number,
  ): number {
    return (COLOR_OFFSET[color] + playerPosition) % COMMON_TRACK_SIZE;
  }

  /**
   * Calculates the target position for a given dice roll.
   * Returns null if the move is invalid (e.g. overshooting goal).
   * @param currentPos Current player-relative position
   * @param diceValue Dice value rolled
   * @param color Player's color
   */
  private calculateTargetPosition(
    currentPos: number,
    diceValue: number,
    color: PlayerColor,
  ): number | null {
    if (currentPos === HOME_POSITION) {
      return diceValue === 6 ? START_POSITION : null;
    }
    if (currentPos >= GOAL_POSITION) {
      return null;
    }
    const newPos = currentPos + diceValue;
    if (newPos > GOAL_POSITION) {
      return null;
    }
    return newPos;
  }

  /**
   * Finds the next player in the TURN_ORDER who participates in the game and has not finished yet.
   * @param session The current game state
   */
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

  /**
   * Handles a dice roll event, evaluating consecutive sixes, possible moves, turn forfeits, and roll again status.
   * @param session The current game state
   * @param diceValue The value rolled
   */
  public handleRoll(session: GameStateType, diceValue: number): DiceRollResult {
    const consecutiveSixes = diceValue === 6 ? session.consecutiveSixes + 1 : 0;

    // Check if the player forfeits their turn because of rolling three consecutive sixes
    const turnForfeit =
      session.activeRules.includes('THREE_SIXES_LOSE_TURN') &&
      consecutiveSixes >= 3;

    const possibleMoves = turnForfeit
      ? []
      : this.getPossibleMoves(session, session.currentPlayerId!, diceValue);

    const hasMoves = possibleMoves.length > 0;

    // Player rolls again if they got a 6, the rule is active, they didn't forfeit, and they actually have moves to play
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

  /**
   * Calculates all legal moves for the given player and dice value.
   * Evaluates self-blockade and potential opponent captures.
   * @param session The current game state
   * @param playerId The player ID to calculate moves for
   * @param diceValue The dice value rolled
   */
  public getPossibleMoves(
    session: GameStateType,
    playerId: string,
    diceValue: number,
  ): PossibleMoveType[] {
    const player = session.players.find((p) => p.id === playerId);
    if (!player) {
      return [];
    }

    const playerColor = player.color;
    const ownFigures = session.figures.filter((f) => f.playerId === playerId);
    const moves: PossibleMoveType[] = [];

    for (const figure of ownFigures) {
      const targetPos = this.calculateTargetPosition(
        figure.position,
        diceValue,
        playerColor,
      );
      if (targetPos === null) {
        continue;
      }

      // Check self-blockade: cannot land on the same position as another own figure
      // (except for the goal field 56, where multiple figures can reside)
      const isSelfBlocked = ownFigures.some(
        (f) =>
          f.id !== figure.id &&
          f.position === targetPos &&
          targetPos !== GOAL_POSITION,
      );
      if (isSelfBlocked) {
        continue;
      }

      // Check capture potential (only applicable on the Common Track 0-50)
      let capturesOpponent = false;
      if (targetPos >= START_POSITION && targetPos <= COMMON_TRACK_END) {
        const myAbsoluteTarget = this.toAbsolutePosition(
          playerColor,
          targetPos,
        );
        const opponentFigures = session.figures.filter(
          (f) => f.playerId !== playerId,
        );

        capturesOpponent = opponentFigures.some((oppFig) => {
          if (
            oppFig.position >= START_POSITION &&
            oppFig.position <= COMMON_TRACK_END
          ) {
            const oppPlayer = session.players.find(
              (p) => p.id === oppFig.playerId,
            );
            if (oppPlayer) {
              const oppAbsolute = this.toAbsolutePosition(
                oppPlayer.color,
                oppFig.position,
              );
              return oppAbsolute === myAbsoluteTarget;
            }
          }
          return false;
        });
      }

      moves.push({
        figureId: figure.id,
        fromPosition: figure.position,
        toPosition: targetPos,
        capturesOpponent,
      });
    }

    return moves;
  }

  /**
   * Calculates the outcome of a move, including captures, goal entry, winning conditions, and turn progression.
   * Throws an error if the move is invalid or not in the allowed list of moves.
   * @param session The current game state
   * @param figureId The ID of the figure to move
   * @param diceValue The dice value used for the move
   */
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

    // Find the moving figure
    const figure = session.figures.find(
      (f) => f.id === figureId && f.playerId === playerId,
    );
    if (!figure) {
      throw new Error(
        'Figure not found or does not belong to the current player',
      );
    }

    // Get legal moves to validate the move
    const possibleMoves = this.getPossibleMoves(session, playerId, diceValue);
    const selectedMove = possibleMoves.find((m) => m.figureId === figureId);
    if (!selectedMove) {
      throw new Error('Invalid move');
    }

    // Determine the captured opponent figure if applicable
    let capturedFigureId: number | null = null;
    if (selectedMove.capturesOpponent) {
      const myAbsoluteTarget = this.toAbsolutePosition(
        player.color,
        selectedMove.toPosition,
      );
      const opponentFigures = session.figures.filter(
        (f) => f.playerId !== playerId,
      );

      const oppFigure = opponentFigures.find((oppFig) => {
        if (
          oppFig.position >= START_POSITION &&
          oppFig.position <= COMMON_TRACK_END
        ) {
          const oppPlayer = session.players.find(
            (p) => p.id === oppFig.playerId,
          );
          if (oppPlayer) {
            return (
              this.toAbsolutePosition(oppPlayer.color, oppFig.position) ===
              myAbsoluteTarget
            );
          }
        }
        return false;
      });
      if (oppFigure) {
        capturedFigureId = oppFigure.id;
      }
    }

    // Determine move outcome
    let outcome: MoveOutcomeType = 'MOVED';
    if (selectedMove.capturesOpponent) {
      outcome = 'CAPTURED';
    } else if (selectedMove.toPosition === GOAL_POSITION) {
      const ownFigures = session.figures.filter((f) => f.playerId === playerId);
      const allInGoal = ownFigures.every((f) =>
        f.id === figureId ? true : f.position === GOAL_POSITION,
      );
      outcome = allInGoal ? 'GAME_WON' : 'GOAL';
    }

    // Turn Succession: roll again on 6 (if rule active) or on capturing an opponent
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
      turnForfeit: false, // Turn forfeit is evaluated during handleRoll
    };
  }
}
