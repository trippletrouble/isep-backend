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
  Sse,
  MessageEvent,
  Delete,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import {
  CreateSessionUseCase,
  ListOpenSessionsUseCase,
  ListSessionsRequestDto,
  DeleteSessionUseCase,
  LeaveSessionUseCase,
  ReconnectUseCase,
  JoinSessionRequestDto,
  JoinSessionUseCase,
  GenerateInviteUseCase,
  InviteResponseDto,
  GetSessionPlayersUseCase,
  PlayerResponseDto,
  GetResultsUseCase,
  GameResultDto,
  CreateSessionRequestDto,
  StartSessionUseCase,
  GetGameStateUseCase,
  RollDiceUseCase,
  MoveFigureRequestDto,
  MoveFigureUseCase,
  GetPossibleMovesUseCase,
  GetLobbyUseCase,
  UpdateLobbySettingsUseCase,
  GetHistoryUseCase,
  GameHistoryEventDto,
  LobbyDto,
  LobbySettingsDto,
  SubmitQuizAnswerUseCase,
  SubmitQuizAnswerRequestDto,
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
  OnlyHostCanInviteError,
  InviteTokenExpiredError,
  ParticipantNotFoundError,
  QuizInProgressError,
  NotInQuizError,
  NotQuizParticipantError,
  AlreadyAnsweredError,
  GameStateType,
  DiceRollResultType,
  RollDiceRequestType,
  PossibleMovesResultType,
  MoveFigureResultType,
  SubmitQuizAnswerResult,
} from '../../application';
import { SessionGuard, CurrentUser } from '../../../auth';
import { User } from '$gen/prisma-class/user';
import { SessionSseService } from '../../session-sse.service';
import { ApiQuery } from '@nestjs/swagger';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly listOpenSessionsUseCase: ListOpenSessionsUseCase,
    private readonly getGameStateUseCase: GetGameStateUseCase,
    private readonly leaveSessionUseCase: LeaveSessionUseCase,
    private readonly reconnectUseCase: ReconnectUseCase,
    private readonly rollDiceUseCase: RollDiceUseCase,
    private readonly moveFigureUseCase: MoveFigureUseCase,
    private readonly startSessionUseCase: StartSessionUseCase,
    private readonly getPossibleMovesUseCase: GetPossibleMovesUseCase,
    private readonly getLobbyUseCase: GetLobbyUseCase,
    private readonly updateLobbySettingsUseCase: UpdateLobbySettingsUseCase,
    private readonly sseService: SessionSseService,
    private readonly deleteSessionUseCase: DeleteSessionUseCase,
    private readonly getSessionPlayersUseCase: GetSessionPlayersUseCase,
    private readonly joinSessionUseCase: JoinSessionUseCase,
    private readonly generateInviteUseCase: GenerateInviteUseCase,
    private readonly getResultsUseCase: GetResultsUseCase,
    private readonly getHistoryUseCase: GetHistoryUseCase,
    private readonly submitQuizAnswerUseCase: SubmitQuizAnswerUseCase,
  ) {}

  @Sse(':id/updates')
  @UseGuards(SessionGuard)
  async updates(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
  ): Promise<Observable<MessageEvent>> {
    return this.sseService.connect(sessionId, user.id);
  }

  @Get(':id')
  @UseGuards(SessionGuard)
  async getSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
  ): Promise<GameStateType> {
    try {
      return await this.getGameStateUseCase.execute(user, sessionId);
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

  @Get(':id/players')
  @UseGuards(SessionGuard)
  async getSessionPlayers(
    @Param('id') sessionId: string,
  ): Promise<PlayerResponseDto[]> {
    try {
      return await this.getSessionPlayersUseCase.execute(sessionId);
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

  @Get(':id/history')
  @UseGuards(SessionGuard)
  async getHistory(
    @Param('id') sessionId: string,
  ): Promise<GameHistoryEventDto[]> {
    try {
      return await this.getHistoryUseCase.execute(sessionId);
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

  @Get(':id/results')
  @UseGuards(SessionGuard)
  async getResults(@Param('id') sessionId: string): Promise<GameResultDto[]> {
    try {
      return await this.getResultsUseCase.execute(sessionId);
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
      const result = await this.updateLobbySettingsUseCase.execute(
        sessionId,
        user.id,
        settings,
      );
      await this.sseService.emitState(sessionId);
      return result;
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
      const result = await this.moveFigureUseCase.execute(
        sessionId,
        user.id,
        request,
      );
      await this.sseService.emitState(sessionId, result.gameState);
      return result;
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

      if (error instanceof QuizInProgressError) {
        throw new ConflictException({
          code: 'QUIZ_IN_PROGRESS',
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
      const result = await this.rollDiceUseCase.execute(sessionId, user.id);
      await this.sseService.emitState(sessionId, result.gameState);
      return result;
    } catch (error) {
      if (error instanceof NotYourTurnError) {
        throw new ForbiddenException({
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

      if (error instanceof QuizInProgressError) {
        throw new ConflictException({
          code: 'QUIZ_IN_PROGRESS',
          message: error.message,
        });
      }

      throw error;
    }
  }

  @Post(':id/cheat-roll')
  @HttpCode(200)
  async cheatRoll(
    @Param('id') sessionId: string,
    @Body() body: { values: number[] },
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }
    if (!(global as any).cheatRolls) {
      (global as any).cheatRolls = {};
    }
    (global as any).cheatRolls[sessionId] = body.values;
    return { success: true, queued: body.values };
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
  @ApiQuery({
    name: 'inviteToken',
    required: false,
    type: 'string',
  })
  async joinSession(
    @Param('id') sessionId: string,
    @Body() body: JoinSessionRequestDto,
    @Query('inviteToken') queryInviteToken: string | undefined,
    @CurrentUser() user: User,
  ): Promise<GameStateType> {
    try {
      const inviteToken = queryInviteToken || body.inviteToken;
      return await this.joinSessionUseCase.execute(
        sessionId,
        user.id,
        body.color,
        inviteToken,
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
      if (error instanceof InviteTokenExpiredError) {
        throw new ForbiddenException({
          code: 'INVITE_TOKEN_EXPIRED',
          message: error.message,
        });
      }
      throw error;
    }
  }

  @Post(':id/invite')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async generateInvite(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
  ): Promise<InviteResponseDto> {
    try {
      return await this.generateInviteUseCase.execute(sessionId, user.id);
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
      if (error instanceof OnlyHostCanInviteError) {
        throw new ForbiddenException({
          code: 'ONLY_HOST_CAN_INVITE',
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
      const result = await this.startSessionUseCase.execute(sessionId, user);
      await this.sseService.emitState(sessionId);
      return result;
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

  @Delete(':id/leave')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async leaveSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
  ) {
    try {
      await this.leaveSessionUseCase.execute(sessionId, user.id);
      return { message: 'Successfully left session' };
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: error.message,
        });
      }
      if (error instanceof ParticipantNotFoundError) {
        throw new NotFoundException({
          code: 'PARTICIPANT_NOT_FOUND',
          message: error.message,
        });
      }
      throw error;
    }
  }

  @Post(':id/reconnect')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async reconnectSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
  ) {
    try {
      return await this.reconnectUseCase.execute(sessionId, user.id);
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: error.message,
        });
      }
      if (error instanceof ParticipantNotFoundError) {
        throw new NotFoundException({
          code: 'PARTICIPANT_NOT_FOUND',
          message: error.message,
        });
      }
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async deleteSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    try {
      await this.deleteSessionUseCase.execute(sessionId, user.id);
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

  @Post(':id/quiz-answer')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async submitQuizAnswer(
    @Param('id') sessionId: string,
    @Body() body: SubmitQuizAnswerRequestDto,
    @CurrentUser() user: User,
  ): Promise<SubmitQuizAnswerResult> {
    try {
      const result = await this.submitQuizAnswerUseCase.execute(
        sessionId,
        user.id,
        body.answerId,
      );
      if (result.resolved) {
        await this.sseService.emitState(sessionId);
      }
      return result;
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        throw new NotFoundException({
          code: 'SESSION_NOT_FOUND',
          message: error.message,
        });
      }
      if (error instanceof NotInQuizError) {
        throw new ConflictException({
          code: 'NOT_IN_QUIZ',
          message: error.message,
        });
      }
      if (error instanceof NotQuizParticipantError) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: error.message,
        });
      }
      if (error instanceof AlreadyAnsweredError) {
        throw new ConflictException({
          code: 'ALREADY_ANSWERED',
          message: error.message,
        });
      }
      throw error;
    }
  }
}
