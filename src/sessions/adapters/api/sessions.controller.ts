import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CreateSessionUseCase } from '../../application/use-cases/create-session.use-case';
import { CreateSessionRequestDto } from '../../application/dtos/create-session.request.dto';
import { LobbyDto } from '../../application/dtos/lobby.dto';
import { SessionGuard } from '../../../auth/guards/session.guard';
import { AuthService } from '../../../auth/application/auth.service';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly authService: AuthService,
  ) {}
  @Post()
  @UseGuards(SessionGuard)
  async createSession(
    @Body() request: CreateSessionRequestDto,
  ): Promise<LobbyDto> {
    return this.createSessionUseCase.execute(request.hostId, request.settings);
  }
}
