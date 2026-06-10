import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateSessionUseCase } from '../../application';
import { CreateSessionRequestDto } from '../../application';
import { SessionGuard } from '../../../auth/guards/session.guard';
import { AuthService } from '../../../auth/application/auth.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../generated/prisma-class/user';
import { GetGameStateUseCase } from '../../application/use-cases/get-game-state.use-case';
import { GameStateType } from '../../application/use-cases/types/game-state.type';
import { DiceRollResultType } from '../../application/use-cases/types/dice-roll-result.type';
import { RollDiceRequestType } from '../../application/use-cases/types/dice-roll-request.type';
import { RollDiceUseCase } from '../../application/use-cases/roll-dice.use-case';
import { MoveFigureRequestDto } from '../../application/dtos/move-figure-request.dto';
import { MoveFigureUseCase } from '../../application/use-cases/move-figure.use-case';
import {
  DiceAlreadyRolledError,
  DiceNotRolledError,
  InvalidMoveError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
} from '../../application/use-cases/errors';
import { MoveFigureResultType } from '../../application/use-cases/types/move-figure-result.type';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly getGameStateUseCase: GetGameStateUseCase,
    private readonly rollDiceUseCase: RollDiceUseCase,
    private readonly moveFigureUseCase: MoveFigureUseCase,
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

  @Post(':id/moves')
  @HttpCode(200)
  @UseGuards(SessionGuard)
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

  @Post(':id/rolls')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async rollDice(
    @Param('id') sessionId: string,
    @Body() request: RollDiceRequestType,
    @CurrentUser() user: User,
  ): Promise<DiceRollResultType> {
    try {
      return await this.rollDiceUseCase.execute(sessionId, user.id);
    } catch (error) {
      if (error instanceof NotYourTurnError) {
        throw new ForbiddenException({
          code: 'NOT_YOUR_TURN',
          message: error.message,
        });
      }

      if (error instanceof DiceAlreadyRolledError) {
        throw new ConflictException({
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
}
