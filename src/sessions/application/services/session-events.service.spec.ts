import { MessageEvent } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { SessionNotFoundError } from '../use-cases/errors';
import { GameStateType } from '../use-cases/types/game-state.type';
import { SessionEventsService } from './session-events.service';

const gameState = {
  sessionId: 'session-123',
  status: 'IN_PROGRESS',
  mode: 'CLASSIC',
  boardTheme: 'CLASSIC',
  players: [],
  figures: [],
  currentPlayerId: 'user-1',
  turnNumber: 1,
  lastDiceValue: null,
  diceRolledThisTurn: false,
  consecutiveSixes: 0,
  activeRules: [],
  winnerId: null,
  createdAt: '2026-06-16T12:00:00.000Z',
  lastUpdatedAt: '2026-06-16T12:00:00.000Z',
} as unknown as GameStateType;

describe('SessionEventsService', () => {
  let service: SessionEventsService;
  let sessionRepoMock: jest.Mocked<SessionRepositoryPort>;

  beforeEach(() => {
    jest.useFakeTimers();
    sessionRepoMock = {
      findGameStateById: jest.fn(),
    } as unknown as jest.Mocked<SessionRepositoryPort>;
    service = new SessionEventsService(sessionRepoMock);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should emit the current game state immediately', async () => {
    const events: MessageEvent[] = [];
    sessionRepoMock.findGameStateById.mockResolvedValue(gameState);

    const stream = await service.getStream('session-123');
    const subscription = stream.subscribe((event) => events.push(event));

    expect(sessionRepoMock.findGameStateById).toHaveBeenCalledWith(
      'session-123',
    );
    expect(events).toEqual([{ type: 'game_state', data: gameState }]);

    subscription.unsubscribe();
  });

  it('should emit a heartbeat every 15 seconds', async () => {
    const events: MessageEvent[] = [];
    sessionRepoMock.findGameStateById.mockResolvedValue(gameState);

    const stream = await service.getStream('session-123');
    const subscription = stream.subscribe((event) => events.push(event));

    jest.advanceTimersByTime(15000);

    expect(events[1]).toEqual({ type: 'heartbeat', data: '' });

    subscription.unsubscribe();
  });

  it('should broadcast emitted session events to subscribers', async () => {
    const events: MessageEvent[] = [];
    sessionRepoMock.findGameStateById.mockResolvedValue(gameState);

    const stream = await service.getStream('session-123');
    const subscription = stream.subscribe((event) => events.push(event));

    service.emit('session-123', 'turn_changed', {
      currentPlayerId: 'user-2',
      turnNumber: 2,
    });

    expect(events[1]).toEqual({
      type: 'turn_changed',
      data: {
        currentPlayerId: 'user-2',
        turnNumber: 2,
      },
    });

    subscription.unsubscribe();
  });

  it('should complete subscribers when a session stream is removed', async () => {
    let completed = false;
    sessionRepoMock.findGameStateById.mockResolvedValue(gameState);

    const stream = await service.getStream('session-123');
    stream.subscribe({ complete: () => (completed = true) });

    service.removeStream('session-123');

    expect(completed).toBe(true);
  });

  it('should throw SessionNotFoundError when the session does not exist', async () => {
    sessionRepoMock.findGameStateById.mockResolvedValue(null);

    await expect(service.getStream('missing-session')).rejects.toThrow(
      SessionNotFoundError,
    );
  });
});
