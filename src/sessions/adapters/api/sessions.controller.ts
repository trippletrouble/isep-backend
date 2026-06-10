import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  CreateSessionUseCase,
  CreateSessionRequestDto,
  StartSessionUseCase,
  GetSessionStateUseCase,
  RollDiceUseCase,
  MoveFigureUseCase,
  GetPossibleMovesUseCase,
} from '../../application';
import { SessionGuard } from '../../../auth/guards/session.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../generated/prisma-class/user';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly startSessionUseCase: StartSessionUseCase,
    private readonly getSessionStateUseCase: GetSessionStateUseCase,
    private readonly rollDiceUseCase: RollDiceUseCase,
    private readonly moveFigureUseCase: MoveFigureUseCase,
    private readonly getPossibleMovesUseCase: GetPossibleMovesUseCase,
  ) {}

  @Post()
  @UseGuards(SessionGuard)
  async createSession(
    @Body() request: CreateSessionRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.createSessionUseCase.execute(user.id, request.settings);
  }

  @Post(':id/start')
  @UseGuards(SessionGuard)
  async startSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
  ) {
    return this.startSessionUseCase.execute(sessionId, user.id);
  }

  @Get(':id')
  @UseGuards(SessionGuard)
  async getSessionState(
    @Param('id') sessionId: string,
  ) {
    return this.getSessionStateUseCase.execute(sessionId);
  }

  @Post(':id/rolls')
  @UseGuards(SessionGuard)
  async rollDice(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
    @Body() request: { playerId: string },
  ) {
    return this.rollDiceUseCase.execute(sessionId, user.id, request);
  }

  @Post(':id/moves')
  @UseGuards(SessionGuard)
  async moveFigure(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
    @Body() request: { playerId: string; figureId: number; targetFieldId: number },
  ) {
    return this.moveFigureUseCase.execute(sessionId, user.id, request);
  }

  @Get(':id/possible-moves')
  @UseGuards(SessionGuard)
  async getPossibleMoves(
    @Param('id') sessionId: string,
    @Query('playerId') playerId: string,
  ) {
    return this.getPossibleMovesUseCase.execute(sessionId, playerId);
  }
}
