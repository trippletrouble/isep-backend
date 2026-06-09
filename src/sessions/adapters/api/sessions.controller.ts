import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CreateSessionUseCase } from '../../application/use-cases/create-session.use-case';
import { CreateSessionRequestDto } from '../../application/dtos/create-session.request.dto';
import { LobbyDto } from '../../application/dtos/lobby.dto';
// Import the SessionCookieAuthGuard from BE-1-07
// Note: This needs to be implemented in the auth module
import { SessionGuard } from '../../../auth/guards/session.guard';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
  ) {}
  @Post()
  @UseGuards(SessionGuard) // Authentication via Session Cookie (BE-1-07)
  async createSession(@Body() request: CreateSessionRequestDto): Promise<LobbyDto> {
    return this.createSessionUseCase.execute(
      request.hostId,
      request.settings,
    );
  }
}
