import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { SessionsController } from 'src/sessions/adapters/api/sessions.controller';
import { PlayerColor } from 'src/generated/prisma-client/enums';
import {
  ColorAlreadyTakenError,
  DiceAlreadyRolledError,
  DiceNotRolledError,
  InvalidInviteTokenError,
  InvalidMoveError,
  InvalidSessionStatusError,
  InviteTokenExpiredError,
  LobbyFullError,
  NotEnoughPlayersError,
  NotHostError,
  NotYourTurnError,
  OnlyHostCanInviteError,
  ParticipantNotFoundError,
  SessionNotFoundError,
} from 'src/sessions/application/use-cases/errors';

const mockUseCase = () => ({ execute: jest.fn() });
type MockUseCase = ReturnType<typeof mockUseCase>;

describe('SessionsController', () => {
  let controller: SessionsController;
  let useCases: Record<string, MockUseCase>;
  const user = { id: 'user-1' } as any;

  beforeEach(() => {
    useCases = {
      createSession: mockUseCase(),
      listOpenSessions: mockUseCase(),
      getGameState: mockUseCase(),
      leaveSession: mockUseCase(),
      reconnect: mockUseCase(),
      rollDice: mockUseCase(),
      moveFigure: mockUseCase(),
      startSession: mockUseCase(),
      getPossibleMoves: mockUseCase(),
      getLobby: mockUseCase(),
      updateLobbySettings: mockUseCase(),
      deleteSession: mockUseCase(),
      getSessionPlayers: mockUseCase(),
      joinSession: mockUseCase(),
      generateInvite: mockUseCase(),
      getResults: mockUseCase(),
      getHistory: mockUseCase(),
    };

    const mockSseService = {
      emitState: jest.fn().mockResolvedValue(undefined),
    };

    controller = new SessionsController(
      useCases.createSession as any,
      useCases.listOpenSessions as any,
      useCases.getGameState as any,
      useCases.leaveSession as any,
      useCases.reconnect as any,
      useCases.rollDice as any,
      useCases.moveFigure as any,
      useCases.startSession as any,
      useCases.getPossibleMoves as any,
      useCases.getLobby as any,
      useCases.updateLobbySettings as any,
      mockSseService as any,
      useCases.deleteSession as any,
      useCases.getSessionPlayers as any,
      useCases.joinSession as any,
      useCases.generateInvite as any,
      useCases.getResults as any,
      useCases.getHistory as any,
    );
  });

  it('returns a game state for a session', async () => {
    const gameState = { sessionId: 'session-1' };
    useCases.getGameState.execute.mockReturnValue(gameState);

    await expect(controller.getSession('session-1', user)).resolves.toBe(gameState);
    expect(useCases.getGameState.execute).toHaveBeenCalledWith(user, 'session-1');
  });

  it('maps missing sessions while reading game state', async () => {
    useCases.getGameState.execute.mockRejectedValue(new SessionNotFoundError());

    await expect(controller.getSession('missing', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rethrows unexpected game-state errors', async () => {
    const error = new Error('unexpected');
    useCases.getGameState.execute.mockRejectedValue(error);

    await expect(controller.getSession('session-1', user)).rejects.toBe(error);
  });

  it('returns session players', async () => {
    const players = [{ id: 'user-1' }];
    useCases.getSessionPlayers.execute.mockResolvedValue(players);

    await expect(controller.getSessionPlayers('session-1')).resolves.toBe(players);
  });

  it('maps missing sessions while reading players', async () => {
    useCases.getSessionPlayers.execute.mockRejectedValue(new SessionNotFoundError());

    await expect(controller.getSessionPlayers('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rethrows unexpected player-list errors', async () => {
    const error = new Error('unexpected');
    useCases.getSessionPlayers.execute.mockRejectedValue(error);

    await expect(controller.getSessionPlayers('session-1')).rejects.toBe(error);
  });

  it('returns lobby details', async () => {
    const lobby = { id: 'session-1', players: [] };
    useCases.getLobby.execute.mockResolvedValue(lobby);

    await expect(controller.getLobby('session-1')).resolves.toBe(lobby);
  });

  it('maps lobby status errors', async () => {
    useCases.getLobby.execute.mockRejectedValue(new InvalidSessionStatusError());

    await expect(controller.getLobby('session-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('maps missing sessions while reading lobby details', async () => {
    useCases.getLobby.execute.mockRejectedValue(new SessionNotFoundError());

    await expect(controller.getLobby('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rethrows unexpected lobby errors', async () => {
    const error = new Error('unexpected');
    useCases.getLobby.execute.mockRejectedValue(error);

    await expect(controller.getLobby('session-1')).rejects.toBe(error);
  });

  it('returns history and results', async () => {
    const history = [{ actionType: 'ROLL' }];
    const results = [{ userId: 'user-1' }];
    useCases.getHistory.execute.mockResolvedValue(history);
    useCases.getResults.execute.mockResolvedValue(results);

    await expect(controller.getHistory('session-1')).resolves.toBe(history);
    await expect(controller.getResults('session-1')).resolves.toBe(results);
  });

  it('maps history and result read errors', async () => {
    useCases.getHistory.execute.mockRejectedValue(new SessionNotFoundError());
    useCases.getResults.execute.mockRejectedValue(new InvalidSessionStatusError());

    await expect(controller.getHistory('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.getResults('session-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rethrows unexpected history and result errors', async () => {
    const historyError = new Error('history');
    const resultsError = new Error('results');
    useCases.getHistory.execute.mockRejectedValue(historyError);
    useCases.getResults.execute.mockRejectedValue(resultsError);

    await expect(controller.getHistory('session-1')).rejects.toBe(historyError);
    await expect(controller.getResults('session-1')).rejects.toBe(resultsError);
  });

  it('updates lobby settings for the host', async () => {
    const settings = { numberOfPlayers: 4 };
    useCases.updateLobbySettings.execute.mockResolvedValue(settings);

    await expect(
      controller.updateLobbySettings('session-1', settings as any, user),
    ).resolves.toBe(settings);
    expect(useCases.updateLobbySettings.execute).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      settings,
    );
  });

  it.each([
    [new SessionNotFoundError(), NotFoundException],
    [new NotHostError(), ForbiddenException],
    [new InvalidSessionStatusError(), ConflictException],
  ])('maps update-lobby error to the expected exception', async (error, exceptionClass) => {
    useCases.updateLobbySettings.execute.mockRejectedValue(error);

    await expect(
      controller.updateLobbySettings('session-1', {} as any, user),
    ).rejects.toBeInstanceOf(exceptionClass);
  });

  it('rethrows unexpected update-lobby errors', async () => {
    const error = new Error('unexpected');
    useCases.updateLobbySettings.execute.mockRejectedValue(error);

    await expect(
      controller.updateLobbySettings('session-1', {} as any, user),
    ).rejects.toBe(error);
  });

  it('moves a figure', async () => {
    const result = { sessionId: 'session-1', moved: true };
    const request = { figureId: 1 };
    useCases.moveFigure.execute.mockResolvedValue(result);

    await expect(controller.moveFigure('session-1', request as any, user)).resolves.toBe(
      result,
    );
    expect(useCases.moveFigure.execute).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      request,
    );
  });

  it.each([
    [new InvalidMoveError(), BadRequestException],
    [new NotYourTurnError(), ForbiddenException],
    [new DiceNotRolledError(), ConflictException],
    [new SessionNotFoundError(), NotFoundException],
    [new InvalidSessionStatusError(), ConflictException],
  ])('maps move-figure error to the expected exception', async (error, exceptionClass) => {
    useCases.moveFigure.execute.mockRejectedValue(error);

    await expect(controller.moveFigure('session-1', {} as any, user)).rejects.toBeInstanceOf(
      exceptionClass,
    );
  });

  it('rethrows unexpected move-figure errors', async () => {
    const error = new Error('unexpected');
    useCases.moveFigure.execute.mockRejectedValue(error);

    await expect(controller.moveFigure('session-1', {} as any, user)).rejects.toBe(error);
  });

  it('returns possible moves', async () => {
    const possibleMoves = { moves: [] };
    useCases.getPossibleMoves.execute.mockResolvedValue(possibleMoves);

    await expect(controller.getPossibleMoves('session-1', user)).resolves.toBe(
      possibleMoves,
    );
  });

  it.each([
    [new DiceNotRolledError(), BadRequestException],
    [new NotYourTurnError(), ForbiddenException],
    [new SessionNotFoundError(), NotFoundException],
    [new InvalidSessionStatusError(), ConflictException],
  ])('maps possible-moves error to the expected exception', async (error, exceptionClass) => {
    useCases.getPossibleMoves.execute.mockRejectedValue(error);

    await expect(controller.getPossibleMoves('session-1', user)).rejects.toBeInstanceOf(
      exceptionClass,
    );
  });

  it('rethrows unexpected possible-moves errors', async () => {
    const error = new Error('unexpected');
    useCases.getPossibleMoves.execute.mockRejectedValue(error);

    await expect(controller.getPossibleMoves('session-1', user)).rejects.toBe(error);
  });

  it('rolls dice for the authenticated user', async () => {
    const result = { value: 6 };
    useCases.rollDice.execute.mockResolvedValue(result);

    await expect(controller.rollDice('session-1', {} as any, user)).resolves.toBe(result);
    expect(useCases.rollDice.execute).toHaveBeenCalledWith('session-1', 'user-1');
  });

  it.each([
    [new NotYourTurnError(), ForbiddenException],
    [new DiceAlreadyRolledError(), BadRequestException],
    [new SessionNotFoundError(), NotFoundException],
    [new InvalidSessionStatusError(), ConflictException],
  ])('maps roll-dice error to the expected exception', async (error, exceptionClass) => {
    useCases.rollDice.execute.mockRejectedValue(error);

    await expect(controller.rollDice('session-1', {} as any, user)).rejects.toBeInstanceOf(
      exceptionClass,
    );
  });

  it('rethrows unexpected roll-dice errors', async () => {
    const error = new Error('unexpected');
    useCases.rollDice.execute.mockRejectedValue(error);

    await expect(controller.rollDice('session-1', {} as any, user)).rejects.toBe(error);
  });

  it('creates a session for the authenticated user', async () => {
    const settings = { numberOfPlayers: 4 };
    const session = { id: 'session-1' };
    useCases.createSession.execute.mockResolvedValue(session);

    await expect(
      controller.createSession({ settings } as any, user),
    ).resolves.toBe(session);
    expect(useCases.createSession.execute).toHaveBeenCalledWith('user-1', settings);
  });

  it('lists open sessions with pagination', async () => {
    const result = { items: [], page: 2, size: 10, total: 0 };
    useCases.listOpenSessions.execute.mockResolvedValue(result);

    await expect(controller.listOpenSessions({ page: 2, size: 10 } as any)).resolves.toBe(
      result,
    );
    expect(useCases.listOpenSessions.execute).toHaveBeenCalledWith(2, 10);
  });

  it('joins a session using the invite token from the query parameter first', async () => {
    const gameState = { sessionId: 'session-1' };
    useCases.joinSession.execute.mockResolvedValue(gameState);

    await expect(
      controller.joinSession(
        'session-1',
        { color: PlayerColor.BLUE, inviteToken: 'body-token' },
        'query-token',
        user,
      ),
    ).resolves.toBe(gameState);

    expect(useCases.joinSession.execute).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      PlayerColor.BLUE,
      'query-token',
    );
  });

  it('joins a session using the invite token from the request body as fallback', async () => {
    useCases.joinSession.execute.mockResolvedValue({ sessionId: 'session-1' });

    await controller.joinSession(
      'session-1',
      { color: PlayerColor.RED, inviteToken: 'body-token' },
      undefined,
      user,
    );

    expect(useCases.joinSession.execute).toHaveBeenCalledWith(
      'session-1',
      'user-1',
      PlayerColor.RED,
      'body-token',
    );
  });

  it.each([
    [new SessionNotFoundError(), NotFoundException],
    [new InvalidSessionStatusError(), ConflictException],
    [new LobbyFullError(), ConflictException],
    [new ColorAlreadyTakenError(), ConflictException],
    [new InvalidInviteTokenError(), ForbiddenException],
    [new InviteTokenExpiredError(), ForbiddenException],
  ])('maps join-session error to the expected exception', async (error, exceptionClass) => {
    useCases.joinSession.execute.mockRejectedValue(error);

    await expect(
      controller.joinSession('session-1', { color: PlayerColor.RED }, undefined, user),
    ).rejects.toBeInstanceOf(exceptionClass);
  });

  it('rethrows unexpected join-session errors', async () => {
    const error = new Error('unexpected');
    useCases.joinSession.execute.mockRejectedValue(error);

    await expect(
      controller.joinSession('session-1', { color: PlayerColor.RED }, undefined, user),
    ).rejects.toBe(error);
  });

  it('generates an invite token', async () => {
    const invite = { inviteToken: 'token' };
    useCases.generateInvite.execute.mockResolvedValue(invite);

    await expect(controller.generateInvite('session-1', user)).resolves.toBe(invite);
  });

  it.each([
    [new SessionNotFoundError(), NotFoundException],
    [new InvalidSessionStatusError(), ConflictException],
    [new OnlyHostCanInviteError(), ForbiddenException],
  ])('maps generate-invite error to the expected exception', async (error, exceptionClass) => {
    useCases.generateInvite.execute.mockRejectedValue(error);

    await expect(controller.generateInvite('session-1', user)).rejects.toBeInstanceOf(
      exceptionClass,
    );
  });

  it('rethrows unexpected generate-invite errors', async () => {
    const error = new Error('unexpected');
    useCases.generateInvite.execute.mockRejectedValue(error);

    await expect(controller.generateInvite('session-1', user)).rejects.toBe(error);
  });

  it('starts a session', async () => {
    const started = { sessionId: 'session-1', figures: [] };
    useCases.startSession.execute.mockResolvedValue(started);

    await expect(controller.startSession('session-1', user)).resolves.toBe(started);
    expect(useCases.startSession.execute).toHaveBeenCalledWith('session-1', user);
  });

  it('rejects start-session without an authenticated user', async () => {
    await expect(controller.startSession('session-1', undefined as any)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it.each([
    [new NotEnoughPlayersError(), HttpException],
    [new NotHostError(), ForbiddenException],
    [new InvalidSessionStatusError(), ConflictException],
    [new SessionNotFoundError(), HttpException],
  ])('maps start-session error to the expected exception', async (error, exceptionClass) => {
    useCases.startSession.execute.mockRejectedValue(error);

    await expect(controller.startSession('session-1', user)).rejects.toBeInstanceOf(
      exceptionClass,
    );
  });

  it('rethrows unexpected start-session errors', async () => {
    const error = new Error('unexpected');
    useCases.startSession.execute.mockRejectedValue(error);

    await expect(controller.startSession('session-1', user)).rejects.toBe(error);
  });

  it('leaves and reconnects to sessions', async () => {
    const reconnectState = { sessionId: 'session-1' };
    useCases.reconnect.execute.mockResolvedValue(reconnectState);

    await expect(controller.leaveSession('session-1', user)).resolves.toEqual({
      message: 'Successfully left session',
    });
    await expect(controller.reconnectSession('session-1', user)).resolves.toBe(
      reconnectState,
    );
  });

  it.each([
    [new SessionNotFoundError(), NotFoundException],
    [new ParticipantNotFoundError(), NotFoundException],
  ])('maps leave-session error to the expected exception', async (error, exceptionClass) => {
    useCases.leaveSession.execute.mockRejectedValue(error);

    await expect(controller.leaveSession('session-1', user)).rejects.toBeInstanceOf(
      exceptionClass,
    );
  });

  it('rethrows unexpected leave-session errors', async () => {
    const error = new Error('unexpected');
    useCases.leaveSession.execute.mockRejectedValue(error);

    await expect(controller.leaveSession('session-1', user)).rejects.toBe(error);
  });

  it.each([
    [new SessionNotFoundError(), NotFoundException],
    [new ParticipantNotFoundError(), NotFoundException],
  ])('maps reconnect error to the expected exception', async (error, exceptionClass) => {
    useCases.reconnect.execute.mockRejectedValue(error);

    await expect(controller.reconnectSession('session-1', user)).rejects.toBeInstanceOf(
      exceptionClass,
    );
  });

  it('rethrows unexpected reconnect errors', async () => {
    const error = new Error('unexpected');
    useCases.reconnect.execute.mockRejectedValue(error);

    await expect(controller.reconnectSession('session-1', user)).rejects.toBe(error);
  });

  it('deletes a session', async () => {
    await expect(controller.deleteSession('session-1', user)).resolves.toBeUndefined();
    expect(useCases.deleteSession.execute).toHaveBeenCalledWith('session-1', 'user-1');
  });

  it.each([
    [new SessionNotFoundError(), NotFoundException],
    [new NotHostError(), ForbiddenException],
    [new InvalidSessionStatusError(), ConflictException],
  ])('maps delete-session error to the expected exception', async (error, exceptionClass) => {
    useCases.deleteSession.execute.mockRejectedValue(error);

    await expect(controller.deleteSession('session-1', user)).rejects.toBeInstanceOf(
      exceptionClass,
    );
  });

  it('rethrows unexpected delete-session errors', async () => {
    const error = new Error('unexpected');
    useCases.deleteSession.execute.mockRejectedValue(error);

    await expect(controller.deleteSession('session-1', user)).rejects.toBe(error);
  });
});
