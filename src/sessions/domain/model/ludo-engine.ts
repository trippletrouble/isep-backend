import { GameStatus, PlayerColor, PieceStatus, AdditionalRule, MoveOutcome } from '@prisma/client';
import { Session } from 'src/generated/prisma-class/session';
import { GameParticipant } from 'src/generated/prisma-class/game_participant';
import { Figure } from 'src/generated/prisma-class/figure';

const TURN_ORDER: PlayerColor[] = [
  PlayerColor.RED,
  PlayerColor.BLUE,
  PlayerColor.GREEN,
  PlayerColor.YELLOW,
];

const COLOR_OFFSET: Record<PlayerColor, number> = {
  [PlayerColor.RED]: 0,
  [PlayerColor.BLUE]: 10,
  [PlayerColor.GREEN]: 20,
  [PlayerColor.YELLOW]: 30,
};

const HOME_RUN_START: Record<PlayerColor, number> = {
  [PlayerColor.RED]: 40,
  [PlayerColor.BLUE]: 44,
  [PlayerColor.GREEN]: 48,
  [PlayerColor.YELLOW]: 52,
};

const COMMON_TRACK_END = 39;
const GOAL_POSITION = 56;

export class LudoEngine {
  /**
   * Calculates the absolute position of a figure if it were to move by `diceValue` steps.
   * Returns `null` if the move is invalid (e.g. overshooting goal, illegal starting move).
   */
  public static calculateTargetPosition(
    color: PlayerColor,
    currentPos: number,
    diceValue: number,
  ): number | null {
    // 1. Spawning from HOME
    if (currentPos === -1) {
      if (diceValue !== 6) return null;
      return COLOR_OFFSET[color];
    }

    // 2. Moving on Common Track (0-39)
    if (currentPos >= 0 && currentPos <= COMMON_TRACK_END) {
      const startOffset = COLOR_OFFSET[color];
      // Steps traveled from starting space
      const stepsTraveled = (currentPos - startOffset + 40) % 40;
      const targetSteps = stepsTraveled + diceValue;

      if (targetSteps < 40) {
        // Still on common track
        return (startOffset + targetSteps) % 40;
      } else if (targetSteps < 44) {
        // Enters Home Run path
        const homeOffset = targetSteps - 40;
        return HOME_RUN_START[color] + homeOffset;
      } else if (targetSteps === 44) {
        // Reaches GOAL
        return GOAL_POSITION;
      } else {
        // Overshot
        return null;
      }
    }

    // 3. Moving in Home Run Path
    const homeStart = HOME_RUN_START[color];
    if (currentPos >= homeStart && currentPos < homeStart + 4) {
      const stepsInHome = currentPos - homeStart;
      const targetSteps = stepsInHome + diceValue;

      if (targetSteps < 4) {
        return homeStart + targetSteps;
      } else if (targetSteps === 4) {
        return GOAL_POSITION;
      } else {
        // Overshot
        return null;
      }
    }

    // 4. Already in GOAL
    return null;
  }

  /**
   * Returns a list of all figures belonging to the participant that can legally move.
   */
  public getPossibleMoves(
    session: Session,
    participant: GameParticipant,
    figures: Figure[],
    diceValue: number,
  ): Figure[] {
    const mine = figures.filter((f) => f.participantId === participant.id);
    const movable: Figure[] = [];

    for (const fig of mine) {
      if (fig.status === PieceStatus.GOAL || fig.position === GOAL_POSITION) continue;

      const targetPos = LudoEngine.calculateTargetPosition(participant.color, fig.position, diceValue);
      if (targetPos === null) continue;

      // Rule: You cannot land on one of your own figures
      const isBlockedByOwn = mine.some(
        (f) => f.id !== fig.id && f.position === targetPos && f.status !== PieceStatus.HOME,
      );
      if (isBlockedByOwn) continue;

      movable.push(fig);
    }

    return movable;
  }

  /**
   * Finds the next participant in the color turn order sequence who hasn't finished yet.
   */
  public static findNextPlayer(
    current: GameParticipant,
    all: GameParticipant[],
  ): GameParticipant {
    const active = all
      .filter((p) => !p.hasFinished)
      .sort((a, b) => TURN_ORDER.indexOf(a.color) - TURN_ORDER.indexOf(b.color));

    if (active.length === 0) return current;

    const idx = active.findIndex((p) => p.id === current.id);
    return active[(idx + 1) % active.length];
  }

  /**
   * Advances the turn status to the next participant.
   */
  public static advanceTurn(
    session: Session,
    all: GameParticipant[],
    next: GameParticipant,
  ): void {
    session.currentPlayerId = next.id;
    session.diceRolledThisTurn = false;
    session.turnNumber++;
    session.consecutiveSixes = 0;
    for (const p of all) {
      p.isCurrentTurn = p.id === next.id;
    }
  }

  /**
   * Evaluates the move and modifies the session, participant, and figures state.
   */
  public applyMove(
    session: Session,
    participant: GameParticipant,
    allParticipants: GameParticipant[],
    figures: Figure[],
    movingFigureId: number,
    diceValue: number,
  ): {
    session: Session;
    participants: GameParticipant[];
    figures: Figure[];
    outcome: MoveOutcome;
    capturedFigure: { figureId: number; ownerPlayerId: string; previousPosition: number } | null;
    nextPlayerId: string;
    rollAgain: boolean;
  } {
    const figure = figures.find(
      (f) => f.id === movingFigureId && f.participantId === participant.id,
    );
    if (!figure) {
      throw new Error(`Figure ${movingFigureId} not found for participant`);
    }

    const targetPos = LudoEngine.calculateTargetPosition(participant.color, figure.position, diceValue);
    if (targetPos === null) {
      throw new Error(`Invalid move proposed for figure ${movingFigureId} with dice value ${diceValue}`);
    }

    const previousPos = figure.position;
    figure.position = targetPos;
    figure.status = targetPos === GOAL_POSITION ? PieceStatus.GOAL : PieceStatus.ACTIVE;
    figure.updatedAt = new Date();

    let outcome: MoveOutcome = MoveOutcome.MOVED;
    let capturedFigureInfo: { figureId: number; ownerPlayerId: string; previousPosition: number } | null = null;

    if (figure.status === PieceStatus.GOAL) {
      participant.figuresInGoal++;
      outcome = MoveOutcome.GOAL;

      if (participant.figuresInGoal === 4) {
        participant.hasFinished = true;
        const finishedCount = allParticipants.filter((p) => p.hasFinished).length;
        participant.placement = finishedCount;
        outcome = MoveOutcome.GAME_WON;

        // MVP: Game ends immediately when the first player wins (or if only 1 player remains)
        const activeCount = allParticipants.filter((p) => !p.hasFinished).length;
        if (activeCount <= 1 || finishedCount === 1) {
          session.winnerId = participant.id;
          session.status = GameStatus.FINISHED;
          session.finishedAt = new Date();
        }
      }
    } else if (targetPos >= 0 && targetPos <= COMMON_TRACK_END) {
      // Check for opponent capture on common track
      for (const opponent of allParticipants) {
        if (opponent.id === participant.id) continue;

        for (const fig of figures) {
          if (fig.participantId !== opponent.id) continue;
          if (fig.status !== PieceStatus.ACTIVE) continue;

          if (fig.position === targetPos) {
            // Captured!
            capturedFigureInfo = {
              figureId: fig.id,
              ownerPlayerId: opponent.id,
              previousPosition: fig.position,
            };
            fig.position = -1;
            fig.status = PieceStatus.HOME;
            fig.updatedAt = new Date();

            participant.figuresCaptured++;
            outcome = MoveOutcome.CAPTURED;
            break;
          }
        }
        if (capturedFigureInfo) break;
      }
    }

    // Determine turn succession
    let nextPlayerId = participant.id;
    let rollAgain = false;

    if (session.status !== GameStatus.FINISHED) {
      const rolledSix = diceValue === 6;
      const throwAgain = session.additionalRules.includes(AdditionalRule.THROW_AGAIN_ON_6);
      rollAgain = (capturedFigureInfo !== null || (rolledSix && throwAgain)) && !participant.hasFinished;

      if (rollAgain) {
        session.diceRolledThisTurn = false;
        nextPlayerId = participant.id;
      } else {
        const next = LudoEngine.findNextPlayer(participant, allParticipants);
        LudoEngine.advanceTurn(session, allParticipants, next);
        nextPlayerId = next.id;
      }
    }

    session.updatedAt = new Date();
    participant.updatedAt = new Date();

    return {
      session,
      participants: allParticipants,
      figures,
      outcome,
      capturedFigure: capturedFigureInfo,
      nextPlayerId,
      rollAgain,
    };
  }

  /**
   * Processes a dice roll. Evaluates rules like consecutive 6s or no possible moves.
   */
  public handleRoll(
    session: Session,
    participant: GameParticipant,
    allParticipants: GameParticipant[],
    figures: Figure[],
    rolledValue: number,
  ): {
    session: Session;
    participants: GameParticipant[];
    hasMoves: boolean;
    nextPlayerId: string;
    rollAgain: boolean;
  } {
    session.lastDiceValue = rolledValue;
    session.diceRolledThisTurn = true;
    session.updatedAt = new Date();

    if (rolledValue === 6) {
      session.consecutiveSixes++;
    } else {
      session.consecutiveSixes = 0;
    }

    // Rule: Three consecutive sixes lose turn
    if (
      session.additionalRules.includes(AdditionalRule.THREE_SIXES_LOSE_TURN) &&
      session.consecutiveSixes >= 3
    ) {
      const next = LudoEngine.findNextPlayer(participant, allParticipants);
      LudoEngine.advanceTurn(session, allParticipants, next);
      return {
        session,
        participants: allParticipants,
        hasMoves: false,
        nextPlayerId: next.id,
        rollAgain: false,
      };
    }

    const possibleMoves = this.getPossibleMoves(session, participant, figures, rolledValue);

    if (possibleMoves.length === 0) {
      // No possible moves -> advance turn immediately
      const next = LudoEngine.findNextPlayer(participant, allParticipants);
      LudoEngine.advanceTurn(session, allParticipants, next);
      return {
        session,
        participants: allParticipants,
        hasMoves: false,
        nextPlayerId: next.id,
        rollAgain: false,
      };
    }

    const rolledSix = rolledValue === 6;
    const throwAgain = session.additionalRules.includes(AdditionalRule.THROW_AGAIN_ON_6);
    const rollAgain = rolledSix && throwAgain;

    return {
      session,
      participants: allParticipants,
      hasMoves: true,
      nextPlayerId: participant.id,
      rollAgain,
    };
  }
}
