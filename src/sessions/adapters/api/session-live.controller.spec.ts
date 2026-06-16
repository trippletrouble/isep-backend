import {
  InternalServerErrorException,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import { of } from 'rxjs';
import { SessionEventsService } from '../../application/services';
import { SessionNotFoundError } from '../../application/use-cases/errors';
import { SessionLiveController } from './session-live.controller';

describe('SessionLiveController', () => {
  let controller: SessionLiveController;
  let sessionEventsMock: jest.Mocked<SessionEventsService>;
  const request = { on: jest.fn() } as any;

  beforeEach(() => {
    sessionEventsMock = {
      getStream: jest.fn(),
    } as unknown as jest.Mocked<SessionEventsService>;
    request.on.mockClear();
    controller = new SessionLiveController(sessionEventsMock);
  });

  it('should return the session event stream', async () => {
    const stream = of({ type: 'heartbeat', data: '' } as MessageEvent);
    sessionEventsMock.getStream.mockResolvedValue(stream);

    await expect(controller.live('session-123', request)).resolves.toBe(stream);
    expect(sessionEventsMock.getStream).toHaveBeenCalledWith('session-123');
    expect(request.on).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('should map missing sessions to OpenAPI not found errors', async () => {
    sessionEventsMock.getStream.mockRejectedValue(new SessionNotFoundError());

    try {
      await controller.live('missing-session', request);
      fail('Expected live to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getResponse()).toEqual({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'Session not found',
        timestamp: expect.any(String),
      });
    }
  });

  it('should map unexpected errors to OpenAPI internal server errors', async () => {
    sessionEventsMock.getStream.mockRejectedValue(new Error('db unavailable'));

    try {
      await controller.live('session-123', request);
      fail('Expected live to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect((error as InternalServerErrorException).getResponse()).toEqual({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        timestamp: expect.any(String),
      });
    }
  });
});
