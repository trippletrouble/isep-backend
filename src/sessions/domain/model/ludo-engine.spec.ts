import { LudoEngine } from './ludo-engine';
import { GameStatus, PlayerColor, PieceStatus, AdditionalRule, MoveOutcome } from '@prisma/client';
import { Session } from 'src/generated/prisma-class/session';
import { GameParticipant } from 'src/generated/prisma-class/game_participant';
import { Figure } from 'src/generated/prisma-class/figure';

describe('LudoEngine Unit Tests', () => {
  let engine: LudoEngine;
  let mockSession: Session;
  let mockParticipants: GameParticipant[];
  let mockFigures: Figure[];

  beforeEach(() => {
    engine = new LudoEngine();

    // Setup base mock session
    mockSession = {
      id: 'session-1',
      status: GameStatus.IN_PROGRESS,
      mode: 'CLASSIC',
      boardTheme: 'CLASSIC',
      numberOfPlayers: 2,
      isPrivate: false,
      additionalRules: [AdditionalRule.THROW_AGAIN_ON_6],
      hostId: 'user-1',
      currentPlayerId: 'part-1',
      turnNumber: 1,
      diceRolledThisTurn: false,
      consecutiveSixes: 0,
      winnerId: null,
      replayLogRef: null,
      startedAt: new Date(),
      finishedAt: null,
      durationSeconds: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Setup 2 participants (RED and BLUE)
    mockParticipants = [
      {
        id: 'part-1',
        sessionId: 'session-1',
        userId: 'user-1',
        color: PlayerColor.RED,
        type: 'HUMAN',
        isBot: false,
        isCurrentTurn: true,
        hasFinished: false,
        figuresInGoal: 0,
        placement: null,
        figuresCaptured: 0,
        joinedAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'part-2',
        sessionId: 'session-1',
        userId: 'user-2',
        color: PlayerColor.BLUE,
        type: 'HUMAN',
        isBot: false,
        isCurrentTurn: false,
        hasFinished: false,
        figuresInGoal: 0,
        placement: null,
        figuresCaptured: 0,
        joinedAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Setup 8 figures (4 RED, 4 BLUE)
    mockFigures = [
      // RED figures (IDs 0-3)
      { id: 0, sessionId: 'session-1', participantId: 'part-1', position: -1, status: PieceStatus.HOME, updatedAt: new Date() },
      { id: 1, sessionId: 'session-1', participantId: 'part-1', position: -1, status: PieceStatus.HOME, updatedAt: new Date() },
      { id: 2, sessionId: 'session-1', participantId: 'part-1', position: -1, status: PieceStatus.HOME, updatedAt: new Date() },
      { id: 3, sessionId: 'session-1', participantId: 'part-1', position: -1, status: PieceStatus.HOME, updatedAt: new Date() },
      // BLUE figures (IDs 4-7)
      { id: 4, sessionId: 'session-1', participantId: 'part-2', position: -1, status: PieceStatus.HOME, updatedAt: new Date() },
      { id: 5, sessionId: 'session-1', participantId: 'part-2', position: -1, status: PieceStatus.HOME, updatedAt: new Date() },
      { id: 6, sessionId: 'session-1', participantId: 'part-2', position: -1, status: PieceStatus.HOME, updatedAt: new Date() },
      { id: 7, sessionId: 'session-1', participantId: 'part-2', position: -1, status: PieceStatus.HOME, updatedAt: new Date() },
    ];
  });

  describe('calculateTargetPosition', () => {
    it('should spawn a figure from HOME when rolling a 6', () => {
      // RED starts at offset 0
      const redPos = LudoEngine.calculateTargetPosition(PlayerColor.RED, -1, 6);
      expect(redPos).toBe(0);

      // BLUE starts at offset 10
      const bluePos = LudoEngine.calculateTargetPosition(PlayerColor.BLUE, -1, 6);
      expect(bluePos).toBe(10);
    });

    it('should not spawn a figure from HOME when rolling other than 6', () => {
      const redPos = LudoEngine.calculateTargetPosition(PlayerColor.RED, -1, 5);
      expect(redPos).toBeNull();
    });

    it('should advance on the common track', () => {
      const pos = LudoEngine.calculateTargetPosition(PlayerColor.RED, 5, 4);
      expect(pos).toBe(9);
    });

    it('should wrap around the common track', () => {
      // RED starts at 0, wraps at 39. Absolute pos 38 + 4 = 42 (relative step 42 -> RED home run 42)
      // Let's test standard wrap: BLUE starts at 10, common track wrap at 39 back to 0.
      // E.g. BLUE at absolute space 38 (relative steps = 28). Move 5 steps -> relative 33 (absolute 3).
      const pos = LudoEngine.calculateTargetPosition(PlayerColor.BLUE, 38, 5);
      expect(pos).toBe(3);
    });

    it('should enter the color-specific home run path after a full lap', () => {
      // RED starting offset is 0.
      // Relative space 39. Move 2 steps -> relative 41.
      // RED home run starts at 40. New absolute pos = 40 + (41 - 40) = 41.
      const redPos = LudoEngine.calculateTargetPosition(PlayerColor.RED, 39, 2);
      expect(redPos).toBe(41);

      // BLUE starting offset is 10.
      // If BLUE is at absolute position 9 (relative 39). Move 3 steps -> relative 42.
      // BLUE home run starts at 44. New absolute pos = 44 + (42 - 40) = 46.
      const bluePos = LudoEngine.calculateTargetPosition(PlayerColor.BLUE, 9, 3);
      expect(bluePos).toBe(46);
    });

    it('should reach the GOAL exactly', () => {
      // RED relative 43 (absolute 43). Move 1 step -> relative 44 (GOAL 56).
      const redPos = LudoEngine.calculateTargetPosition(PlayerColor.RED, 43, 1);
      expect(redPos).toBe(56);
    });

    it('should block moving if it overshoots the GOAL', () => {
      // RED at 43. Move 2 steps -> overshot (null)
      const redPos = LudoEngine.calculateTargetPosition(PlayerColor.RED, 43, 2);
      expect(redPos).toBeNull();
    });
  });

  describe('getPossibleMoves', () => {
    it('should allow spawning if starting space is free', () => {
      const moves = engine.getPossibleMoves(mockSession, mockParticipants[0], mockFigures, 6);
      expect(moves.length).toBe(4); // all 4 home figures can spawn
    });

    it('should block spawning if starting space is occupied by own figure', () => {
      // Place RED figure 0 on absolute position 0 (RED start space)
      mockFigures[0].position = 0;
      mockFigures[0].status = PieceStatus.ACTIVE;

      const moves = engine.getPossibleMoves(mockSession, mockParticipants[0], mockFigures, 6);
      // Only the active figure 0 can move (0 + 6 = 6). Figures 1, 2, 3 are blocked from spawning.
      expect(moves.length).toBe(1);
      expect(moves[0].id).toBe(0);
    });

    it('should block move if target space is occupied by own figure', () => {
      mockFigures[0].position = 5;
      mockFigures[0].status = PieceStatus.ACTIVE;

      mockFigures[1].position = 9;
      mockFigures[1].status = PieceStatus.ACTIVE;

      // Figure 0 wants to move 4 steps to position 9 (occupied by Figure 1)
      const moves = engine.getPossibleMoves(mockSession, mockParticipants[0], mockFigures, 4);
      // Figure 0 is blocked. Figure 1 can move (9 + 4 = 13).
      expect(moves.length).toBe(1);
      expect(moves[0].id).toBe(1);
    });
  });

  describe('applyMove', () => {
    it('should execute spawn on 6', () => {
      const { figures, outcome, nextPlayerId } = engine.applyMove(
        mockSession,
        mockParticipants[0],
        mockParticipants,
        mockFigures,
        0, // figureId
        6, // diceValue
      );

      const spawnFig = figures.find((f) => f.id === 0)!;
      expect(spawnFig.position).toBe(0);
      expect(spawnFig.status).toBe(PieceStatus.ACTIVE);
      expect(outcome).toBe(MoveOutcome.MOVED);
      // Spawning on a 6 grants an extra turn if THROW_AGAIN_ON_6 is active
      expect(nextPlayerId).toBe('part-1');
    });

    it('should execute capturing of opponent figure', () => {
      // Place RED figure 0 on space 5
      mockFigures[0].position = 5;
      mockFigures[0].status = PieceStatus.ACTIVE;

      // Place BLUE figure 4 on absolute space 9.
      // BLUE starting offset is 10, so absolute space 9 represents relative space 39.
      mockFigures[4].position = 9;
      mockFigures[4].status = PieceStatus.ACTIVE;

      // RED rolls a 4 (lands on space 9)
      const { outcome, capturedFigure, nextPlayerId } = engine.applyMove(
        mockSession,
        mockParticipants[0],
        mockParticipants,
        mockFigures,
        0, // figureId
        4, // diceValue
      );

      expect(outcome).toBe(MoveOutcome.CAPTURED);
      expect(capturedFigure).toEqual({
        figureId: 4,
        ownerPlayerId: 'part-2',
        previousPosition: 9,
      });

      // Captured opponent figure is sent HOME
      const capturedFig = mockFigures.find((f) => f.id === 4)!;
      expect(capturedFig.position).toBe(-1);
      expect(capturedFig.status).toBe(PieceStatus.HOME);

      // RED participant count increments
      expect(mockParticipants[0].figuresCaptured).toBe(1);

      // Capture grants an extra turn
      expect(nextPlayerId).toBe('part-1');
    });

    it('should land exactly in the goal', () => {
      // RED figure 0 at absolute 43. Roll 1.
      mockFigures[0].position = 43;
      mockFigures[0].status = PieceStatus.ACTIVE;

      const { outcome, figures } = engine.applyMove(
        mockSession,
        mockParticipants[0],
        mockParticipants,
        mockFigures,
        0,
        1,
      );

      expect(outcome).toBe(MoveOutcome.GOAL);
      const goalFig = figures.find((f) => f.id === 0)!;
      expect(goalFig.position).toBe(56);
      expect(goalFig.status).toBe(PieceStatus.GOAL);
      expect(mockParticipants[0].figuresInGoal).toBe(1);
    });

    it('should trigger game win when 4th figure reaches goal', () => {
      mockParticipants[0].figuresInGoal = 3;

      mockFigures[0].position = 43;
      mockFigures[0].status = PieceStatus.ACTIVE;

      const { outcome, session, participants } = engine.applyMove(
        mockSession,
        mockParticipants[0],
        mockParticipants,
        mockFigures,
        0,
        1,
      );

      expect(outcome).toBe(MoveOutcome.GAME_WON);
      expect(session.status).toBe(GameStatus.FINISHED);
      expect(session.winnerId).toBe('part-1');
      expect(participants[0].hasFinished).toBe(true);
      expect(participants[0].placement).toBe(1);
    });
  });

  describe('handleRoll', () => {
    it('should track consecutive sixes', () => {
      let res = engine.handleRoll(mockSession, mockParticipants[0], mockParticipants, mockFigures, 6);
      expect(res.session.consecutiveSixes).toBe(1);

      res = engine.handleRoll(res.session, mockParticipants[0], mockParticipants, mockFigures, 6);
      expect(res.session.consecutiveSixes).toBe(2);

      res = engine.handleRoll(res.session, mockParticipants[0], mockParticipants, mockFigures, 5);
      expect(res.session.consecutiveSixes).toBe(0);
    });

    it('should forfeit turn on three consecutive sixes', () => {
      mockSession.additionalRules = [AdditionalRule.THREE_SIXES_LOSE_TURN];
      mockSession.consecutiveSixes = 2;

      const { session, hasMoves, nextPlayerId } = engine.handleRoll(
        mockSession,
        mockParticipants[0],
        mockParticipants,
        mockFigures,
        6,
      );

      expect(session.consecutiveSixes).toBe(0);
      expect(hasMoves).toBe(false);
      // Turn is forfeited -> advances to Blue (part-2)
      expect(nextPlayerId).toBe('part-2');
      expect(session.diceRolledThisTurn).toBe(false);
    });

    it('should automatically advance turn if player has no possible moves', () => {
      // RED figures are all HOME. RED rolls a 5.
      // Spawning requires 6, so RED has no possible moves.
      const { hasMoves, nextPlayerId } = engine.handleRoll(
        mockSession,
        mockParticipants[0],
        mockParticipants,
        mockFigures,
        5,
      );

      expect(hasMoves).toBe(false);
      expect(nextPlayerId).toBe('part-2'); // turn advanced
    });
  });
});
