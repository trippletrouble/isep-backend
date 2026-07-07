import { LudoEngine } from './ludo-engine';
import { PlayerColor, PieceStatus } from '../../../generated/prisma-client/client';
import { GameStateType } from '../../application/use-cases/types/game-state.type';

// Helper function to create a test figure
function createTestFigure(id: number, position: number, status: PieceStatus, participantId: string) {
  return {
    id,
    playerId: participantId,
    position,
    status,
  };
}

// Helper function to create a test participant
function createTestParticipant(id: string, color: PlayerColor, hasFinished = false) {
  return {
    id,
    username: `player_${color.toLowerCase()}`,
    color,
    type: 'HUMAN' as const,
    isCurrentTurn: false,
    hasFinished,
    figuresInGoal: 0,
  };
}

// Helper function to create a test session
function createTestSession(players: any[], figures: any[], overrides?: Partial<GameStateType>): GameStateType {
  return {
    sessionId: 'test-session-id',
    status: 'IN_PROGRESS',
    mode: 'CLASSIC',
    boardTheme: 'CLASSIC',
    players,
    figures,
    currentPlayerId: players[0]?.id ?? null,
    turnNumber: 0,
    lastDiceValue: null,
    diceRolledThisTurn: false,
    consecutiveSixes: 0,
    activeRules: [],
    winnerId: null,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('LudoEngine', () => {
  let engine: LudoEngine;

  beforeEach(() => {
    engine = new LudoEngine();
  });

  describe('calculateTargetPosition', () => {
    const getTargetPosition = (currentPos: number, diceValue: number, color: PlayerColor): number | null => {
      return (engine as any).calculateTargetPosition(currentPos, diceValue, color);
    };

    describe('A) SPAWNING (position = -1)', () => {
      it('should spawn only on a 6', () => {
        expect(getTargetPosition(-1, 6, PlayerColor.RED)).toBe(0);
        expect(getTargetPosition(-1, 1, PlayerColor.RED)).toBeNull();
        expect(getTargetPosition(-1, 2, PlayerColor.RED)).toBeNull();
        expect(getTargetPosition(-1, 3, PlayerColor.RED)).toBeNull();
        expect(getTargetPosition(-1, 4, PlayerColor.RED)).toBeNull();
        expect(getTargetPosition(-1, 5, PlayerColor.RED)).toBeNull();
      });

      it('should yield correct start position for all player colors on a 6', () => {
        expect(getTargetPosition(-1, 6, PlayerColor.RED)).toBe(0);
        expect(getTargetPosition(-1, 6, PlayerColor.BLUE)).toBe(13);
        expect(getTargetPosition(-1, 6, PlayerColor.YELLOW)).toBe(26);
        expect(getTargetPosition(-1, 6, PlayerColor.GREEN)).toBe(39);
      });
    });

    describe('B) COMMON TRACK', () => {
      it('should move normally within common track', () => {
        expect(getTargetPosition(0, 5, PlayerColor.RED)).toBe(5);
        expect(getTargetPosition(25, 3, PlayerColor.RED)).toBe(28);
        expect(getTargetPosition(48, 2, PlayerColor.RED)).toBe(50);
      });
    });

    describe('C) EINTRITT IN HOME RUN', () => {
      it('should enter home run lane', () => {
        expect(getTargetPosition(50, 1, PlayerColor.RED)).toBe(52);
        expect(getTargetPosition(49, 3, PlayerColor.RED)).toBe(53);
        expect(getTargetPosition(50, 5, PlayerColor.RED)).toBe(56);
      });
    });

    describe('D) MOVEMENT IN HOME RUN', () => {
      it('should move forward inside home run lane', () => {
        expect(getTargetPosition(51, 2, PlayerColor.RED)).toBe(54);
        expect(getTargetPosition(55, 1, PlayerColor.RED)).toBe(56);
      });
    });

    describe('E) GOAL (exact throw)', () => {
      it('should land on 72 only with an exact throw', () => {
        // Position 54
        expect(getTargetPosition(54, 2, PlayerColor.RED)).toBe(56);
        expect(getTargetPosition(54, 3, PlayerColor.RED)).toBe(72);
        expect(getTargetPosition(54, 4, PlayerColor.RED)).toBeNull();

        // Position 55
        expect(getTargetPosition(55, 1, PlayerColor.RED)).toBe(56);
        expect(getTargetPosition(55, 2, PlayerColor.RED)).toBe(72);
        expect(getTargetPosition(55, 3, PlayerColor.RED)).toBeNull();

        // Position 50
        expect(getTargetPosition(50, 6, PlayerColor.RED)).toBe(72);
        expect(getTargetPosition(50, 7, PlayerColor.RED)).toBeNull();
      });
    });

    describe('F) EDGE CASES', () => {
      it('should return null if already in goal', () => {
        expect(getTargetPosition(72, 1, PlayerColor.RED)).toBeNull();
        expect(getTargetPosition(72, 6, PlayerColor.RED)).toBeNull();
      });

      it('should handle base cases', () => {
        expect(getTargetPosition(-1, 6, PlayerColor.RED)).toBe(0);
        expect(getTargetPosition(-1, 1, PlayerColor.RED)).toBeNull();
      });
    });
  });

  describe('getPossibleMoves', () => {
    describe('A) ALLE FIGUREN HOME (-1)', () => {
      it('should allow spawn only on a 6', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f1 = createTestFigure(1, -1, PieceStatus.HOME, 'red-id');
        const f2 = createTestFigure(2, -1, PieceStatus.HOME, 'red-id');
        const session = createTestSession([pRed], [f1, f2]);

        const moves6 = engine.getPossibleMoves(session, 'red-id', 6);
        expect(moves6).toHaveLength(2);
        expect(moves6[0]).toEqual({
          figureId: 1,
          fromPosition: -1,
          toPosition: 0,
          capturesOpponent: false,
        });

        const moves5 = engine.getPossibleMoves(session, 'red-id', 5);
        expect(moves5).toHaveLength(0);
      });
    });

    describe('B) SELBST-BLOCKADE', () => {
      it('should block move if another own figure is on the target position', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const fA = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');
        const fB = createTestFigure(2, 5, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [fA, fB]);

        // Figure B wants to move 5 steps (from 5 to 10), but Figure A is on 10.
        const moves = engine.getPossibleMoves(session, 'red-id', 5);
        expect(moves).toHaveLength(1); // Only Figure A can move (from 10 to 15)
        expect(moves.find(m => m.figureId === 2)).toBeUndefined();
      });

      it('should allow move if target position is free', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const fA = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');
        const fB = createTestFigure(2, 4, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [fA, fB]);

        // Figure B wants to move 5 steps (from 4 to 9), which is free.
        const moves = engine.getPossibleMoves(session, 'red-id', 5);
        expect(moves).toHaveLength(2);
        expect(moves.find(m => m.figureId === 2)).toEqual({
          figureId: 2,
          fromPosition: 4,
          toPosition: 9,
          capturesOpponent: false,
        });
      });
    });

    describe('C) GEGNER AUF ZIELPOSITION', () => {
      it('should set capturesOpponent to true when landing on an opponent figure', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const pBlue = createTestParticipant('blue-id', PlayerColor.BLUE);
        
        const fOwn = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');
        // Blue starting offset is 13.
        // If Blue is at relative position 0, their absolute position is (13 + 0) % 52 = 13.
        // Red starts at absolute offset 0.
        // If Red is at relative position 10 and moves 3 steps, Red's relative position becomes 13,
        // and Red's absolute position becomes (0 + 13) % 52 = 13.
        // This is a match!
        const fOpp = createTestFigure(2, 13, PieceStatus.ACTIVE, 'blue-id');
        
        const session = createTestSession([pRed, pBlue], [fOwn, fOpp]);

        const moves = engine.getPossibleMoves(session, 'red-id', 3);
        expect(moves).toHaveLength(1);
        expect(moves[0]).toEqual({
          figureId: 1,
          fromPosition: 10,
          toPosition: 13,
          capturesOpponent: true,
        });
      });
    });

    describe('D) HOME RUN', () => {
      it('should allow legal moves inside home run', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, 53, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [f]);

        const moves = engine.getPossibleMoves(session, 'red-id', 2);
        expect(moves).toHaveLength(1);
        expect(moves[0].toPosition).toBe(55);
      });

      it('should block move if it overshoots 56', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, 53, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [f]);

        const moves = engine.getPossibleMoves(session, 'red-id', 5);
        expect(moves).toHaveLength(0);
      });

      it('should prevent self-blockade inside home run lane', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const fA = createTestFigure(1, 54, PieceStatus.ACTIVE, 'red-id');
        const fB = createTestFigure(2, 55, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [fA, fB]);

        // Figure A wants to move 1 step (from 54 to 55), but Figure B is on 55.
        const moves = engine.getPossibleMoves(session, 'red-id', 1);
        expect(moves).toHaveLength(1); // Only Figure B can move (to 56)
        expect(moves.find(m => m.figureId === 1)).toBeUndefined();
      });
    });

    describe('E) SPAWN-BLOCKADE', () => {
      it('should block spawning if starting space is occupied by own figure', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const fA = createTestFigure(1, -1, PieceStatus.HOME, 'red-id');
        const fB = createTestFigure(2, 0, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [fA, fB]);

        const moves = engine.getPossibleMoves(session, 'red-id', 6);
        expect(moves).toHaveLength(1); // Only Figure B can move (0 to 6)
        expect(moves.find(m => m.figureId === 1)).toBeUndefined();
      });

      it('should allow spawning and capture opponent on absolute start position', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const pBlue = createTestParticipant('blue-id', PlayerColor.BLUE);
        
        const fOwn = createTestFigure(1, -1, PieceStatus.HOME, 'red-id');
        // Blue starting offset is 13.
        // If Blue is at relative position 39, their absolute position is (13 + 39) % 52 = 0.
        // Red's start position absolute offset is 0.
        // So Blue is sitting on Red's starting space!
        const fOpp = createTestFigure(2, 0, PieceStatus.ACTIVE, 'blue-id');
        
        const session = createTestSession([pRed, pBlue], [fOwn, fOpp]);

        const moves = engine.getPossibleMoves(session, 'red-id', 6);
        expect(moves).toHaveLength(1);
        expect(moves[0]).toEqual({
          figureId: 1,
          fromPosition: -1,
          toPosition: 0,
          capturesOpponent: true,
        });
      });
    });

    describe('F) GOAL-FIGUREN', () => {
      it('should never return moves for figures already in goal', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, 56, PieceStatus.GOAL, 'red-id');
        const session = createTestSession([pRed], [f]);

        const moves = engine.getPossibleMoves(session, 'red-id', 2);
        expect(moves).toHaveLength(0);
      });
    });

    describe('G) GEMISCHTES SZENARIO', () => {
      it('should correctly filter options in mixed scenarios', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f1 = createTestFigure(1, -1, PieceStatus.HOME, 'red-id');
        const f2 = createTestFigure(2, -1, PieceStatus.HOME, 'red-id');
        const f3 = createTestFigure(3, 20, PieceStatus.ACTIVE, 'red-id');
        const f4 = createTestFigure(4, 56, PieceStatus.GOAL, 'red-id');
        const session = createTestSession([pRed], [f1, f2, f3, f4]);

        // On a 6, figures 1, 2, and 3 should be able to move
        const moves6 = engine.getPossibleMoves(session, 'red-id', 6);
        expect(moves6).toHaveLength(3);
        expect(moves6.map(m => m.figureId).sort()).toEqual([1, 2, 3]);

        // On a 3, only figure 3 can move
        const moves3 = engine.getPossibleMoves(session, 'red-id', 3);
        expect(moves3).toHaveLength(1);
        expect(moves3[0]).toEqual({
          figureId: 3,
          fromPosition: 20,
          toPosition: 23,
          capturesOpponent: false,
        });
      });
    });
  });

  describe('handleRoll & findNextPlayer', () => {
    describe('A) NORMALER WURF', () => {
      it('should return hasMoves: true when at least one figure can move', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [f], { currentPlayerId: 'red-id' });

        const result = engine.handleRoll(session, 3);
        expect(result.hasMoves).toBe(true);
        expect(result.consecutiveSixes).toBe(0);
        expect(result.turnForfeit).toBe(false);
      });
    });

    describe('B) KEIN ZUG MÖGLICH', () => {
      it('should return hasMoves: false when all figures are HOME and dice is 1-5', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f1 = createTestFigure(1, -1, PieceStatus.HOME, 'red-id');
        const session = createTestSession([pRed], [f1], { currentPlayerId: 'red-id' });

        const result = engine.handleRoll(session, 3);
        expect(result.hasMoves).toBe(false);
        expect(result.possibleMoves).toHaveLength(0);
      });
    });

    describe('C) CONSECUTIVE SIXES', () => {
      it('should increment consecutive sixes and allow spawn/moves on first/second six', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, -1, PieceStatus.HOME, 'red-id');
        const session = createTestSession([pRed], [f], {
          currentPlayerId: 'red-id',
          consecutiveSixes: 0,
        });

        // First 6
        const res1 = engine.handleRoll(session, 6);
        expect(res1.consecutiveSixes).toBe(1);
        expect(res1.turnForfeit).toBe(false);
        expect(res1.hasMoves).toBe(true);

        // Second 6 (session has consecutiveSixes: 1)
        session.consecutiveSixes = 1;
        const res2 = engine.handleRoll(session, 6);
        expect(res2.consecutiveSixes).toBe(2);
        expect(res2.turnForfeit).toBe(false);
        expect(res2.hasMoves).toBe(true);
      });

      it('should forfeit turn and reset consecutive sixes on third six if THREE_SIXES_LOSE_TURN is active', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [f], {
          currentPlayerId: 'red-id',
          consecutiveSixes: 2,
          activeRules: ['THREE_SIXES_LOSE_TURN'],
        });

        const result = engine.handleRoll(session, 6);
        expect(result.turnForfeit).toBe(true);
        expect(result.consecutiveSixes).toBe(0);
        expect(result.hasMoves).toBe(false);
        expect(result.possibleMoves).toHaveLength(0);
        expect(result.rollAgain).toBe(false);
      });

      it('should NOT forfeit turn on third six if THREE_SIXES_LOSE_TURN is inactive', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [f], {
          currentPlayerId: 'red-id',
          consecutiveSixes: 2,
          activeRules: [], // Rule inactive
        });

        const result = engine.handleRoll(session, 6);
        expect(result.turnForfeit).toBe(false);
        expect(result.consecutiveSixes).toBe(3);
        expect(result.hasMoves).toBe(true);
      });
    });

    describe('D) RESET BEI NICHT-6', () => {
      it('should reset consecutive sixes to 0 when rolling a non-6', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [f], {
          currentPlayerId: 'red-id',
          consecutiveSixes: 2,
        });

        const result = engine.handleRoll(session, 4);
        expect(result.consecutiveSixes).toBe(0);
      });
    });

    describe('E) ROLL AGAIN', () => {
      it('should allow rollAgain on a 6 if THROW_AGAIN_ON_6 is active', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [f], {
          currentPlayerId: 'red-id',
          activeRules: ['THROW_AGAIN_ON_6'],
        });

        const result = engine.handleRoll(session, 6);
        expect(result.rollAgain).toBe(true);
      });

      it('should NOT allow rollAgain on a 6 if THROW_AGAIN_ON_6 is inactive', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [f], {
          currentPlayerId: 'red-id',
          activeRules: [],
        });

        const result = engine.handleRoll(session, 6);
        expect(result.rollAgain).toBe(false);
      });

      it('should NOT allow rollAgain on rolling 1-5 even if THROW_AGAIN_ON_6 is active', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [f], {
          currentPlayerId: 'red-id',
          activeRules: ['THROW_AGAIN_ON_6'],
        });

        const result = engine.handleRoll(session, 5);
        expect(result.rollAgain).toBe(false);
      });
    });

    describe('F) TURN ORDER', () => {
      it('should cycle 4 players correctly: RED -> BLUE -> YELLOW -> GREEN -> RED', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const pBlue = createTestParticipant('blue-id', PlayerColor.BLUE);
        const pYellow = createTestParticipant('yellow-id', PlayerColor.YELLOW);
        const pGreen = createTestParticipant('green-id', PlayerColor.GREEN);
        const session = createTestSession([pRed, pBlue, pYellow, pGreen], []);

        session.currentPlayerId = 'red-id';
        expect(engine.findNextPlayer(session)).toBe('blue-id');

        session.currentPlayerId = 'blue-id';
        expect(engine.findNextPlayer(session)).toBe('yellow-id');

        session.currentPlayerId = 'yellow-id';
        expect(engine.findNextPlayer(session)).toBe('green-id');

        session.currentPlayerId = 'green-id';
        expect(engine.findNextPlayer(session)).toBe('red-id');
      });

      it('should cycle 2 players correctly: RED -> YELLOW -> RED', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const pYellow = createTestParticipant('yellow-id', PlayerColor.YELLOW);
        const session = createTestSession([pRed, pYellow], []);

        session.currentPlayerId = 'red-id';
        expect(engine.findNextPlayer(session)).toBe('yellow-id');

        session.currentPlayerId = 'yellow-id';
        expect(engine.findNextPlayer(session)).toBe('red-id');
      });

      it('should skip players who have finished', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const pBlue = createTestParticipant('blue-id', PlayerColor.BLUE, true); // Finished!
        const pYellow = createTestParticipant('yellow-id', PlayerColor.YELLOW);
        const pGreen = createTestParticipant('green-id', PlayerColor.GREEN);
        const session = createTestSession([pRed, pBlue, pYellow, pGreen], []);

        // RED's turn should go to YELLOW, skipping BLUE
        session.currentPlayerId = 'red-id';
        expect(engine.findNextPlayer(session)).toBe('yellow-id');
      });
    });
  });

  describe('applyMove', () => {
    describe('A) NORMALER ZUG', () => {
      it('should move figure normally and return outcome MOVED', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [f], { currentPlayerId: 'red-id' });

        const result = engine.applyMove(session, 1, 4);
        expect(result).toEqual({
          figureId: 1,
          fromPosition: 10,
          toPosition: 14,
          outcome: 'MOVED',
          capturedFigureId: null,
          rollAgain: false,
          turnForfeit: false,
        });
      });
    });

    describe('B) SPAWNING', () => {
      it('should spawn figure from HOME to START', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, -1, PieceStatus.HOME, 'red-id');
        const session = createTestSession([pRed], [f], { currentPlayerId: 'red-id' });

        const result = engine.applyMove(session, 1, 6);
        expect(result).toEqual({
          figureId: 1,
          fromPosition: -1,
          toPosition: 0,
          outcome: 'MOVED',
          capturedFigureId: null,
          rollAgain: false,
          turnForfeit: false,
        });
      });
    });

    describe('C) CAPTURE', () => {
      it('should capture opponent figure and grant extra turn', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const pBlue = createTestParticipant('blue-id', PlayerColor.BLUE);
        const fOwn = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');
        const fOpp = createTestFigure(2, 13, PieceStatus.ACTIVE, 'blue-id'); // Absolute position 13
        const session = createTestSession([pRed, pBlue], [fOwn, fOpp], { currentPlayerId: 'red-id' });

        const result = engine.applyMove(session, 1, 3);
        expect(result).toEqual({
          figureId: 1,
          fromPosition: 10,
          toPosition: 13,
          outcome: 'CAPTURED',
          capturedFigureId: 2,
          rollAgain: true,
          turnForfeit: false,
        });
      });
    });

    describe('D) KEIN CAPTURE IN HOME RUN', () => {
      it('should not capture opponent in home run even if relative positions match', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const pBlue = createTestParticipant('blue-id', PlayerColor.BLUE);
        const fOwn = createTestFigure(1, 50, PieceStatus.ACTIVE, 'red-id');
        const fOpp = createTestFigure(2, 53, PieceStatus.ACTIVE, 'blue-id'); // Different home run lane
        const session = createTestSession([pRed, pBlue], [fOwn, fOpp], { currentPlayerId: 'red-id' });

        const result = engine.applyMove(session, 1, 2);
        expect(result.outcome).toBe('MOVED');
        expect(result.toPosition).toBe(53);
        expect(result.capturedFigureId).toBeNull();
        expect(result.rollAgain).toBe(false);
      });
    });

    describe('E) GOAL', () => {
      it('should reach goal and return outcome GOAL', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f1 = createTestFigure(1, 55, PieceStatus.ACTIVE, 'red-id');
        const f2 = createTestFigure(2, -1, PieceStatus.HOME, 'red-id');
        const session = createTestSession([pRed], [f1, f2], { currentPlayerId: 'red-id' });

        const result = engine.applyMove(session, 1, 2);
        expect(result.outcome).toBe('GOAL');
        expect(result.toPosition).toBe(72);
      });
    });

    describe('F) GAME WON', () => {
      it('should win game when the fourth figure reaches goal', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f1 = createTestFigure(1, 72, PieceStatus.GOAL, 'red-id');
        const f2 = createTestFigure(2, 72, PieceStatus.GOAL, 'red-id');
        const f3 = createTestFigure(3, 72, PieceStatus.GOAL, 'red-id');
        const f4 = createTestFigure(4, 55, PieceStatus.ACTIVE, 'red-id');
        const session = createTestSession([pRed], [f1, f2, f3, f4], { currentPlayerId: 'red-id' });

        const result = engine.applyMove(session, 4, 2);
        expect(result.outcome).toBe('GAME_WON');
        expect(result.rollAgain).toBe(false); // No extra turn when winning
      });
    });

    describe('G) TURN SUCCESSION', () => {
      it('should determine rollAgain status correctly based on rules and captures', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const f = createTestFigure(1, 10, PieceStatus.ACTIVE, 'red-id');

        // Case 1: Normal move, no 6, no capture -> rollAgain: false
        let session = createTestSession([pRed], [f], { currentPlayerId: 'red-id' });
        expect(engine.applyMove(session, 1, 4).rollAgain).toBe(false);

        // Case 2: Dice 6, rule active -> rollAgain: true
        session = createTestSession([pRed], [f], {
          currentPlayerId: 'red-id',
          activeRules: ['THROW_AGAIN_ON_6'],
        });
        expect(engine.applyMove(session, 1, 6).rollAgain).toBe(true);

        // Case 3: Dice 6, rule inactive -> rollAgain: false
        session = createTestSession([pRed], [f], {
          currentPlayerId: 'red-id',
          activeRules: [],
        });
        expect(engine.applyMove(session, 1, 6).rollAgain).toBe(false);
      });
    });

    describe('H) CAPTURE BEI SPAWN', () => {
      it('should capture opponent when spawning onto Red start position 0', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const pBlue = createTestParticipant('blue-id', PlayerColor.BLUE);
        const fOwn = createTestFigure(1, -1, PieceStatus.HOME, 'red-id');
        const fOpp = createTestFigure(2, 0, PieceStatus.ACTIVE, 'blue-id'); // Absolute position 0
        const session = createTestSession([pRed, pBlue], [fOwn, fOpp], { currentPlayerId: 'red-id' });

        const result = engine.applyMove(session, 1, 6);
        expect(result.outcome).toBe('CAPTURED');
        expect(result.toPosition).toBe(0);
        expect(result.capturedFigureId).toBe(2);
        expect(result.rollAgain).toBe(true);
      });
    });
  });

  describe('Integration Simulations', () => {
    describe('TEST 1: "Kurzes 2-Spieler-Spiel"', () => {
      it('should simulate spawning, rolling again, moving, and turn switching correctly', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const pBlue = createTestParticipant('blue-id', PlayerColor.BLUE);
        
        const fRed = createTestFigure(1, -1, PieceStatus.HOME, 'red-id');
        const fBlue = createTestFigure(2, -1, PieceStatus.HOME, 'blue-id');
        
        const session = createTestSession([pRed, pBlue], [fRed, fBlue], {
          currentPlayerId: 'red-id',
          activeRules: ['THROW_AGAIN_ON_6'],
        });

        // 1. RED rolls a 6
        const roll1 = engine.handleRoll(session, 6);
        expect(roll1.hasMoves).toBe(true);
        expect(roll1.rollAgain).toBe(true);
        expect(roll1.consecutiveSixes).toBe(1);

        // Red makes a move: spawn Figure 1
        const move1 = engine.applyMove(session, 1, 6);
        expect(move1.outcome).toBe('MOVED');
        expect(move1.toPosition).toBe(0);
        expect(move1.rollAgain).toBe(true); // Red gets another turn because they rolled a 6 with THROW_AGAIN_ON_6 active

        // Apply changes to session (as the repository would do)
        fRed.position = move1.toPosition;
        fRed.status = PieceStatus.ACTIVE;
        session.consecutiveSixes = roll1.consecutiveSixes;

        // 2. RED rolls again (rolls a 4)
        const roll2 = engine.handleRoll(session, 4);
        expect(roll2.hasMoves).toBe(true);
        expect(roll2.rollAgain).toBe(false);
        expect(roll2.consecutiveSixes).toBe(0); // Reset since it was not a 6

        // Red moves Figure 1 from 0 to 4
        const move2 = engine.applyMove(session, 1, 4);
        expect(move2.outcome).toBe('MOVED');
        expect(move2.toPosition).toBe(4);
        expect(move2.rollAgain).toBe(false);

        // Apply changes to session and advance turn (as repo/use case would do)
        fRed.position = move2.toPosition;
        session.currentPlayerId = engine.findNextPlayer(session);
        session.consecutiveSixes = roll2.consecutiveSixes;
        session.turnNumber += 1;

        expect(session.currentPlayerId).toBe('blue-id');
        expect(session.turnNumber).toBe(1);

        // 3. BLUE is now active and rolls a 3 (no moves possible because figure is at -1)
        const roll3 = engine.handleRoll(session, 3);
        expect(roll3.hasMoves).toBe(false);

        // Turn is automatically advanced since BLUE has no moves
        session.currentPlayerId = engine.findNextPlayer(session);
        session.turnNumber += 1;

        expect(session.currentPlayerId).toBe('red-id');
        expect(session.turnNumber).toBe(2);
      });
    });

    describe('TEST 2: "Capture-Szenario"', () => {
      it('should simulate landing on opponent, sending them back to base, and granting extra turn', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const pBlue = createTestParticipant('blue-id', PlayerColor.BLUE);
        
        const fRed = createTestFigure(1, 20, PieceStatus.ACTIVE, 'red-id');
        // Blue starting offset is 13.
        // If Blue is at relative position 10, their absolute position is (13 + 10) % 52 = 23.
        // Red starts at absolute offset 0.
        // If Red is at relative position 20 and moves 3, Red's relative position becomes 23,
        // and Red's absolute position becomes (0 + 23) % 52 = 23.
        // This is a match!
        const fBlue = createTestFigure(2, 23, PieceStatus.ACTIVE, 'blue-id');
        
        const session = createTestSession([pRed, pBlue], [fRed, fBlue], {
          currentPlayerId: 'red-id',
          activeRules: [],
        });

        // RED rolls a 3
        const roll = engine.handleRoll(session, 3);
        expect(roll.hasMoves).toBe(true);

        // RED moves Figure 1
        const move = engine.applyMove(session, 1, 3);
        expect(move.outcome).toBe('CAPTURED');
        expect(move.capturedFigureId).toBe(2);
        expect(move.rollAgain).toBe(true); // Extra turn on capture!

        // Apply changes to session
        fRed.position = move.toPosition;
        fBlue.position = -1;
        fBlue.status = PieceStatus.HOME;

        // RED should roll again (turn does not change)
        expect(session.currentPlayerId).toBe('red-id');
      });
    });

    describe('TEST 3: "Three Sixes Forfeit"', () => {
      it('should forfeit turn and pass to next player when rolling three 6s consecutively with rule active', () => {
        const pRed = createTestParticipant('red-id', PlayerColor.RED);
        const pBlue = createTestParticipant('blue-id', PlayerColor.BLUE);
        
        const fRed = createTestFigure(1, 5, PieceStatus.ACTIVE, 'red-id');
        const fBlue = createTestFigure(2, 5, PieceStatus.ACTIVE, 'blue-id');
        
        const session = createTestSession([pRed, pBlue], [fRed, fBlue], {
          currentPlayerId: 'red-id',
          activeRules: ['THREE_SIXES_LOSE_TURN', 'THROW_AGAIN_ON_6'],
          consecutiveSixes: 0,
        });

        // 1. First 6
        const roll1 = engine.handleRoll(session, 6);
        expect(roll1.consecutiveSixes).toBe(1);
        expect(roll1.turnForfeit).toBe(false);
        expect(roll1.rollAgain).toBe(true);

        // RED moves
        const move1 = engine.applyMove(session, 1, 6);
        fRed.position = move1.toPosition;
        session.consecutiveSixes = roll1.consecutiveSixes;

        // 2. Second 6
        const roll2 = engine.handleRoll(session, 6);
        expect(roll2.consecutiveSixes).toBe(2);
        expect(roll2.turnForfeit).toBe(false);
        expect(roll2.rollAgain).toBe(true);

        // RED moves
        const move2 = engine.applyMove(session, 1, 6);
        fRed.position = move2.toPosition;
        session.consecutiveSixes = roll2.consecutiveSixes;

        // 3. Third 6
        const roll3 = engine.handleRoll(session, 6);
        expect(roll3.consecutiveSixes).toBe(0); // Reset to 0
        expect(roll3.turnForfeit).toBe(true);
        expect(roll3.hasMoves).toBe(false); // No moves allowed on forfeit
        expect(roll3.rollAgain).toBe(false);

        // Turn is immediately forfeited and passed (as in RollDiceUseCase)
        session.currentPlayerId = engine.findNextPlayer(session);
        session.consecutiveSixes = roll3.consecutiveSixes;
        session.turnNumber += 1;

        expect(session.currentPlayerId).toBe('blue-id');
        expect(session.consecutiveSixes).toBe(0);
        expect(session.turnNumber).toBe(1);
      });
    });
  });

  describe('Verification of Helpers (sanity check)', () => {
    it('should construct test structures successfully', () => {
      const figure = createTestFigure(1, 0, PieceStatus.ACTIVE, 'user-1');
      const participant = createTestParticipant('user-1', PlayerColor.RED);
      const session = createTestSession([participant], [figure]);

      expect(figure.playerId).toBe('user-1');
      expect(participant.color).toBe(PlayerColor.RED);
      expect(session.figures).toHaveLength(1);
    });
  });
});
