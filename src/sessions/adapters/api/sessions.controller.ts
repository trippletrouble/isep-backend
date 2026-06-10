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
import { GetPossibleMovesUseCase } from '../../application/use-cases/get-possible-moves.use-case';
import { PossibleMovesResultType } from '../../application/use-cases/types/possible-moves-result.type';
import {
  DiceAlreadyRolledError,
  DiceNotRolledError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
} from '../../application/use-cases/errors';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly getGameStateUseCase: GetGameStateUseCase,
    private readonly rollDiceUseCase: RollDiceUseCase,
    private readonly getPossibleMovesUseCase: GetPossibleMovesUseCase,
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
