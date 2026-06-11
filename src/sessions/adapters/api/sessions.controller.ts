import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import {
  CreateSessionUseCase,
  ListOpenSessionsUseCase,
  ListSessionsRequestDto,
} from '../../application';
import { CreateSessionRequestDto } from '../../application';
import { SessionGuard } from '../../../auth/guards/session.guard';
import { AuthService } from '../../../auth/application/auth.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../generated/prisma-class/user';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly listOpenSessionsUseCase: ListOpenSessionsUseCase,
    private readonly authService: AuthService,
  ) {}
  @Post()
  @UseGuards(SessionGuard)
  async createSession(
    @Body() request: CreateSessionRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.createSessionUseCase.execute(user.id, request.settings);
  }

  @Get()
  async listOpenSessions(@Query() query: ListSessionsRequestDto) {
    return this.listOpenSessionsUseCase.execute(query.page, query.size);
  }
}
