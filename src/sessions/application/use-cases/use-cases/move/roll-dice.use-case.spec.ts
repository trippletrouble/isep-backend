/* eslint-disable @typescript-eslint/unbound-method */
import { RollDiceUseCase } from './roll-dice.use-case';
import { SessionRepositoryPort } from '../../../../ports';
import { DiceClientPort } from '../../../../ports/dice-client.port';
import { PossibleMoveCalculatorUseCase } from './possible-move-calculator.use-case';
import { GameStateCacheService } from '../../../services/game-state-cache.service';
import { GameStateType } from '../../types/game-state.type';
import {
  DiceAlreadyRolledError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
} from '../../errors';

describe('RollDiceUseCase', () => {
  let useCase: RollDiceUseCase;
  let mockSessionRepo: jest.Mocked<SessionRepositoryPort>;
  let mockDiceClient: jest.Mocked<DiceClientPort>;
  let mockMoveCalculator: jest.Mocked<PossibleMoveCalculatorUseCase>;
  let mockCache: jest.Mocked<GameStateCacheService>;

  const playerId = 'player-1';
  const sessionId = 'session-123';

  const mockGameState: GameStateType = {
    sessionId,
    status: 'IN_PROGRESS',
    mode: 'CLASSIC',
    boardTheme: 'CLASSIC',
    players: [
      { id: playerId, name: 'Nico' },
    ] as unknown as GameStateType['players'],
    figures: [
      { id: 1, playerId, position: 0, status: 'HOME' },
    ] as unknown as GameStateType['figures'],
    currentPlayerId: playerId,
    turnNumber: 1,
    lastDiceValue: null,
    diceRolledThisTurn: false,
    consecutiveSixes: 0,
    activeRules: [],
    winnerId: null,
    createdAt: '2026-06-15T12:00:00.000Z',
    lastUpdatedAt: '2026-06-15T12:00:00.000Z',
  };

  const updatedGameState: GameStateType = {
    ...mockGameState,
    lastDiceValue: 3,
    diceRolledThisTurn: true,
  };

  beforeEach(() => {
    mockSessionRepo = {
      findGameStateById: jest.fn(),
      updateAfterDiceRoll: jest.fn().mockResolvedValue(undefined),
      passTurn: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SessionRepositoryPort>;

    mockDiceClient = {
      roll: jest.fn().mockResolvedValue(3),
    };

    mockMoveCalculator = {
      calculate: jest
        .fn()
        .mockReturnValue([{ figureId: 1, fromPosition: 0, toPosition: 3 }]),
    } as unknown as jest.Mocked<PossibleMoveCalculatorUseCase>;

    mockCache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      invalidate: jest.fn(),
    } as unknown as jest.Mocked<GameStateCacheService>;

    useCase = new RollDiceUseCase(
      mockSessionRepo,
      mockDiceClient,
      mockMoveCalculator,
      mockCache,
    );
  });

  it('should call cache.set with updated game state after successful DB write', async () => {
    mockSessionRepo.findGameStateById
      .mockResolvedValueOnce(mockGameState)
      .mockResolvedValueOnce(updatedGameState);

    await useCase.execute(sessionId, playerId);

    expect(mockSessionRepo.updateAfterDiceRoll).toHaveBeenCalled();
    expect(mockCache.set).toHaveBeenCalledWith(sessionId, updatedGameState);
  });

  it('should not call cache.set when updateAfterDiceRoll throws', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue(mockGameState);
    mockSessionRepo.updateAfterDiceRoll.mockRejectedValue(
      new Error('DB error'),
    );

    await expect(useCase.execute(sessionId, playerId)).rejects.toThrow(
      'DB error',
    );

    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it('should not call cache.set when passTurn throws (no moves, pass-turn path)', async () => {
    mockMoveCalculator.calculate.mockReturnValue([]);
    mockSessionRepo.findGameStateById.mockResolvedValue(mockGameState);
    mockSessionRepo.passTurn.mockRejectedValue(new Error('DB passTurn error'));

    await expect(useCase.execute(sessionId, playerId)).rejects.toThrow(
      'DB passTurn error',
    );

    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it('should throw SessionNotFoundError when session does not exist', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue(null);

    await expect(useCase.execute(sessionId, playerId)).rejects.toThrow(
      SessionNotFoundError,
    );
  });

  it('should throw InvalidSessionStatusError when session is not IN_PROGRESS', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue({
      ...mockGameState,
      status: 'WAITING',
    });

    await expect(useCase.execute(sessionId, playerId)).rejects.toThrow(
      InvalidSessionStatusError,
    );
  });

  it('should throw NotYourTurnError when player is not the current player', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue({
      ...mockGameState,
      currentPlayerId: 'other-player',
    });

    await expect(useCase.execute(sessionId, playerId)).rejects.toThrow(
      NotYourTurnError,
    );
  });

  it('should throw DiceAlreadyRolledError when dice was already rolled this turn', async () => {
    mockSessionRepo.findGameStateById.mockResolvedValue({
      ...mockGameState,
      diceRolledThisTurn: true,
    });

    await expect(useCase.execute(sessionId, playerId)).rejects.toThrow(
      DiceAlreadyRolledError,
    );
  });
});
