import {
  BadRequestException,
  Controller,
  Post,
  Put,
  Body,
  UseGuards,
  Param,
  Get,
  HttpCode,
  HttpException,
  Query,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

import {
  CreateSessionUseCase,
  ListOpenSessionsUseCase,
  ListSessionsRequestDto,
  JoinSessionRequestDto,
  JoinSessionUseCase,
} from '../../application';
import { CreateSessionRequestDto } from '../../application';
import { SessionGuard } from '../../../auth/guards/session.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../generated/prisma-class/user';
import { StartSessionUseCase } from '../../application';
import { GetGameStateUseCase } from '../../application/use-cases/get-game-state.use-case';
import { GameStateType } from '../../application/use-cases/types/game-state.type';
import { DiceRollResultType } from '../../application/use-cases/types/dice-roll-result.type';
import { RollDiceRequestType } from '../../application/use-cases/types/dice-roll-request.type';
import { RollDiceUseCase } from '../../application/use-cases/roll-dice.use-case';
import { MoveFigureRequestDto } from '../../application';
import { MoveFigureUseCase } from '../../application';
import { GetPossibleMovesUseCase } from '../../application';
import { GetLobbyUseCase } from '../../application';
import { UpdateLobbySettingsUseCase } from '../../application';
import { LobbyDto } from '../../application';
import { LobbySettingsDto } from '../../application/dtos/lobby-settings.dto';
import { PossibleMovesResultType } from '../../application/use-cases/types/possible-moves-result.type';
import {
  DiceAlreadyRolledError,
  DiceNotRolledError,
  InvalidSessionStatusError,
  NotEnoughPlayersError,
  NotHostError,
  SessionNotFoundError,
  InvalidMoveError,
  NotYourTurnError,
  LobbyFullError,
  ColorAlreadyTakenError,
  InvalidInviteTokenError,
} from '../../application/use-cases/errors';
import { MoveFigureResultType } from '../../application/use-cases/types/move-figure-result.type';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly listOpenSessionsUseCase: ListOpenSessionsUseCase,
    private readonly getGameStateUseCase: GetGameStateUseCase,
    private readonly rollDiceUseCase: RollDiceUseCase,
    private readonly moveFigureUseCase: MoveFigureUseCase,
    private readonly startSessionUseCase: StartSessionUseCase,
    private readonly getPossibleMovesUseCase: GetPossibleMovesUseCase,
    private readonly getLobbyUseCase: GetLobbyUseCase,
    private readonly updateLobbySettingsUseCase: UpdateLobbySettingsUseCase,
    private readonly joinSessionUseCase: JoinSessionUseCase,
  ) {}

  @Get(':id')
  @UseGuards(SessionGuard)
  async getSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
  ): Promise<GameStateType> {
    try {
      return this.getGameStateUseCase.execute(user, sessionId);
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: error.message,
        });
      }
      throw error;
    }
  }

  @Get(':id/lobby')
  @UseGuards(SessionGuard)
  async getLobby(@Param('id') sessionId: string): Promise<LobbyDto> {
    try {
      return await this.getLobbyUseCase.execute(sessionId);
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: error.message,
        });
      }
      if (error instanceof InvalidSessionStatusError) {
        throw new ConflictException({
          code: 'INVALID_SESSION_STATUS',
          message: error.message,
        });
      }
      throw error;
    }
  }

  @Put(':id/lobby')
  @UseGuards(SessionGuard)
  async updateLobbySettings(
    @Param('id') sessionId: string,
    @Body() settings: LobbySettingsDto,
    @CurrentUser() user: User,
  ): Promise<LobbySettingsDto> {
    try {
      return await this.updateLobbySettingsUseCase.execute(
        sessionId,
        user.id,
        settings,
      );
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: error.message,
        });
      }
      if (error instanceof NotHostError) {
        throw new ForbiddenException({
          code: 'NOT_HOST',
          message: error.message,
        });
      }
      if (error instanceof InvalidSessionStatusError) {
        throw new ConflictException({
          code: 'INVALID_SESSION_STATUS',
          message: error.message,
        });
      }
      throw error;
    }
  }

  @Post(':id/moves')
  @HttpCode(200)
  @Throttle({ default: { limit: 1000, ttl: 10 * 60 * 1000 } })
  @UseGuards(ThrottlerGuard, SessionGuard)
  async moveFigure(
    @Param('id') sessionId: string,
    @Body() request: MoveFigureRequestDto,
    @CurrentUser() user: User,
  ): Promise<MoveFigureResultType> {
    try {
      return await this.moveFigureUseCase.execute(sessionId, user.id, request);
    } catch (error) {
      if (error instanceof InvalidMoveError) {
        throw new BadRequestException({
          code: 'INVALID_MOVE',
          message: error.message,
        });
      }
      if (error instanceof NotYourTurnError) {
        throw new ForbiddenException({
          code: 'NOT_YOUR_TURN',
          message: error.message,
        });
      }

      if (error instanceof DiceNotRolledError) {
        throw new ConflictException({
          code: 'DICE_NOT_ROLLED',
          message: error.message,
        });
      }

      if (error instanceof SessionNotFoundError) {
        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: error.message,
        });
      }

      if (error instanceof InvalidSessionStatusError) {
        throw new ConflictException({
          code: 'INVALID_SESSION_STATUS',
          message: error.message,
        });
      }

      throw error;
    }
  }

  @Get(':id/possible-moves')
  @UseGuards(SessionGuard)
  async getPossibleMoves(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
  ): Promise<PossibleMovesResultType> {
    try {
      return await this.getPossibleMovesUseCase.execute(sessionId, user.id);
    } catch (error) {
      if (error instanceof DiceNotRolledError) {
        throw new BadRequestException({
          code: 'DICE_NOT_ROLLED',
          message: error.message,
        });
      }

      if (error instanceof NotYourTurnError) {
        throw new ForbiddenException({
          code: 'NOT_YOUR_TURN',
          message: error.message,
        });
      }

      if (error instanceof SessionNotFoundError) {
        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: error.message,
        });
      }

      if (error instanceof InvalidSessionStatusError) {
        throw new ConflictException({
          code: 'INVALID_SESSION_STATUS',
          message: error.message,
        });
      }

      throw error;
    }
  }

  @Post(':id/rolls')
  @HttpCode(200)
  @Throttle({ default: { limit: 1000, ttl: 10 * 60 * 1000 } })
  @UseGuards(ThrottlerGuard, SessionGuard)
  async rollDice(
    @Param('id') sessionId: string,
    @Body() request: RollDiceRequestType,
    @CurrentUser() user: User,
  ): Promise<DiceRollResultType> {
    try {
      return await this.rollDiceUseCase.execute(sessionId, user.id);
    } catch (error) {
      if (error instanceof NotYourTurnError) {
        throw new BadRequestException({
          code: 'NOT_YOUR_TURN',
          message: error.message,
        });
      }
      if (error instanceof InvalidSessionStatusError) {
        throw new ConflictException('is not in Progress');
      }
      if (error instanceof DiceAlreadyRolledError) {
        throw new BadRequestException({
          code: 'DICE_ALREADY_ROLLED',
          message: error.message,
        });
      }

      if (error instanceof SessionNotFoundError) {
        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: error.message,
        });
      }

      if (error instanceof InvalidSessionStatusError) {
        throw new ConflictException({
          code: 'INVALID_SESSION_STATUS',
          message: error.message,
        });
      }

      throw error;
    }
  }

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
  @Post(':id/join')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async joinSession(
    @Param('id') sessionId: string,
    @Body() body: JoinSessionRequestDto,
    @CurrentUser() user: User,
  ): Promise<GameStateType> {
    try {
      return await this.joinSessionUseCase.execute(
        sessionId,
        user.id,
        body.color,
        body.inviteToken,
      );
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: error.message,
        });
      }
      if (error instanceof InvalidSessionStatusError) {
        throw new ConflictException({
          code: 'INVALID_SESSION_STATUS',
          message: error.message,
        });
      }
      if (error instanceof LobbyFullError) {
        throw new ConflictException({
          code: 'LOBBY_FULL',
          message: error.message,
        });
      }
      if (error instanceof ColorAlreadyTakenError) {
        throw new ConflictException({
          code: 'COLOR_ALREADY_TAKEN',
          message: error.message,
        });
      }
      if (error instanceof InvalidInviteTokenError) {
        throw new ForbiddenException({
          code: 'INVALID_INVITE_TOKEN',
          message: error.message,
        });
      }
      throw error;
    }
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
        throw new ForbiddenException('Only the host can start the game');
      }
      if (error instanceof InvalidSessionStatusError) {
        throw new ConflictException('Session is not in WAITING status');
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
