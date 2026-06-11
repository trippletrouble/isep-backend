import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpException,
  Param,
  Get,
} from '@nestjs/common';
import { CreateSessionUseCase } from '../../application/use-cases/create-session.use-case';
import { CreateSessionRequestDto } from '../../application/dtos/create-session.request.dto';
import { SessionGuard } from '../../../auth/guards/session.guard';
import { AuthService } from '../../../auth/application/auth.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../generated/prisma-class/user';
import { GetGameStateUseCase } from '../../application/use-cases/get-game-state.use-case';
import { GameStateType } from '../../application/use-cases/types/game-state.type';
import {
  InvalidSessionStatusError,
  NotEnoughPlayersError,
  NotHostError,
  SessionNotFoundError,
  StartSessionUseCase,
} from '../../application/use-cases/start-session.use-case';
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly startSessionUseCase: StartSessionUseCase,
    private readonly getGameStateUseCase: GetGameStateUseCase,
    private readonly authService: AuthService,
  ) {}
  @Get(':id')
  @UseGuards(SessionGuard)
  async getSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
  ): Promise<GameStateType> {
    return this.getGameStateUseCase.execute(user, sessionId);
  }
  @Post()
  @UseGuards(SessionGuard)
  async createSession(
    @Body() request: CreateSessionRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.createSessionUseCase.execute(user.id, request.settings);
  }
  @Post(':id/start')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async startSession(
    //@Body() request: sessionId,
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
  ): Promise<{
    sessionId: string;
    status: string;
    currentPlayerId: string;
    playerIdOrder: string[];
    figures: Array<{
      id: number;
      sessionId: string;
      participantId: string;
      position: number;
      status: string;
    }>;
  }> {
    if (!user) {
      throw new HttpException(
        {
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
        401,
      );
    }

    try {
      return await this.startSessionUseCase.execute(sessionId, user);
    } catch (error) {
      if (error instanceof NotEnoughPlayersError) {
        throw new HttpException(
          {
            status: 'error',
            code: 'NOT_ENOUGH_PLAYERS',
            message: 'At least 2 players are required to start the game',
            timestamp: new Date().toISOString(),
          },
          400,
        );
      }
      if (error instanceof NotHostError) {
        throw new HttpException(
          {
            status: 'error',
            code: 'NOT_HOST',
            message: 'Only the host can start the game',
            timestamp: new Date().toISOString(),
          },
          403,
        );
      }
      if (error instanceof InvalidSessionStatusError) {
        throw new HttpException(
          {
            status: 'error',
            code: 'INVALID_STATUS',
            message: 'Session is not in WAITING status',
            timestamp: new Date().toISOString(),
          },
          400,
        );
      }
      if (error instanceof SessionNotFoundError) {
        throw new HttpException(
          {
            status: 'error',
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found',
            timestamp: new Date().toISOString(),
          },
          404,
        );
      }
      throw error;
    }
  }
}
