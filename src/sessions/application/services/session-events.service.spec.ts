import { MessageEvent } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { SessionNotFoundError } from '../use-cases';
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
  let redisMock: any;
  let subscriberMock: any;
  let messageCallback: ((channel: string, message: string) => void) | null;

  beforeEach(() => {
    jest.useFakeTimers();
    sessionRepoMock = {
      findGameStateById: jest.fn(),
    } as unknown as jest.Mocked<SessionRepositoryPort>;

    messageCallback = null;
    subscriberMock = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'message') {
          messageCallback = callback;
        }
      }),
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
    };

    redisMock = {
      duplicate: jest.fn().mockReturnValue(subscriberMock),
      publish: jest.fn().mockResolvedValue(1),
    };

    service = new SessionEventsService(sessionRepoMock, redisMock);
    service.onModuleInit();
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

  it('should publish emitted events to Redis', async () => {
    sessionRepoMock.findGameStateById.mockResolvedValue(gameState);

    service.emit('session-123', 'turn_changed', {
      currentPlayerId: 'user-2',
      turnNumber: 2,
    });

    expect(redisMock.publish).toHaveBeenCalledWith(
      'session:session-123:events',
      JSON.stringify({
        type: 'turn_changed',
        data: {
          currentPlayerId: 'user-2',
          turnNumber: 2,
        },
      }),
    );
  });

  it('should broadcast events received from Redis Pub/Sub message to local subscribers', async () => {
    const events: MessageEvent[] = [];
    sessionRepoMock.findGameStateById.mockResolvedValue(gameState);

    const stream = await service.getStream('session-123');
    const subscription = stream.subscribe((event) => events.push(event));

    const eventPayload = {
      type: 'turn_changed',
      data: {
        currentPlayerId: 'user-2',
        turnNumber: 2,
      },
    };

    if (messageCallback) {
      messageCallback('session:session-123:events', JSON.stringify(eventPayload));
    }

    expect(events[1]).toEqual(eventPayload);

    subscription.unsubscribe();
  });

  it('should subscribe to Redis channel on first client connection', async () => {
    sessionRepoMock.findGameStateById.mockResolvedValue(gameState);

    const stream = await service.getStream('session-123');
    const subscription = stream.subscribe();

    expect(subscriberMock.subscribe).toHaveBeenCalledWith('session:session-123:events');

    subscription.unsubscribe();
  });

  it('should unsubscribe from Redis channel on last client disconnection', async () => {
    sessionRepoMock.findGameStateById.mockResolvedValue(gameState);

    const stream1 = await service.getStream('session-123');
    const sub1 = stream1.subscribe();

    const stream2 = await service.getStream('session-123');
    const sub2 = stream2.subscribe();

    expect(subscriberMock.subscribe).toHaveBeenCalledTimes(1);

    sub1.unsubscribe();
    expect(subscriberMock.unsubscribe).not.toHaveBeenCalled();

    sub2.unsubscribe();
    expect(subscriberMock.unsubscribe).toHaveBeenCalledWith('session:session-123:events');
  });

  it('should clean up the Redis subscriber connection on module destroy', async () => {
    await service.onModuleDestroy();
    expect(subscriberMock.quit).toHaveBeenCalled();
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

