import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CreateSessionUseCase } from '../../application/use-cases/create-session.use-case';
import { CreateSessionRequestDto } from '../../application/dtos/create-session.request.dto';
import { LobbyDto } from '../../application/dtos/lobby.dto';
import { SessionGuard } from '../../../auth/guards/session.guard';
import { AuthService } from '../../../auth/application/auth.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../generated/prisma-class/user';

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
    @CurrentUser() user: User,
  ): Promise<LobbyDto> {
    return this.createSessionUseCase.execute(user.id, request.settings);
  }
}
