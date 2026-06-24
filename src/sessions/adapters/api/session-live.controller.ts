import {
  Controller,
  InternalServerErrorException,
  MessageEvent,
  NotFoundException,
  Param,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { SessionGuard } from '../../../auth';
import { SessionEventsService, SessionNotFoundError } from '../../application';

@Controller('sessions')
export class SessionLiveController {
  constructor(private readonly sessionEvents: SessionEventsService) {}

  @Sse(':id/live')
  @UseGuards(SessionGuard)
  async live(
    @Param('id') sessionId: string,
    @Req() request: Request,
  ): Promise<Observable<MessageEvent>> {
    request.on('close', () => undefined);

    try {
      return await this.sessionEvents.getStream(sessionId);
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        throw new NotFoundException({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Session not found',
          timestamp: new Date().toISOString(),
        });
      }

      throw new InternalServerErrorException({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
