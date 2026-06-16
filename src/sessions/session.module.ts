import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionRepositoryPort } from './ports';
import { PrismaSessionRepository } from './adapters';
import { SessionsController, SessionLiveController } from './adapters';
import {
  CreateSessionUseCase,
  LeaveSessionUseCase,
  ListOpenSessionsUseCase,
  ReconnectUseCase,
  UpdateLobbySettingsUseCase,
  GetHistoryUseCase,
  GetResultsUseCase,
  DeleteSessionUseCase,
  GetSessionPlayersUseCase,
  JoinSessionUseCase,
  GenerateInviteUseCase,
} from './application';
import { AuthModule } from '../auth/auth.module';
import { GetGameStateUseCase } from './application/use-cases/get-game-state.use-case';
import { RollDiceUseCase } from './application/use-cases/roll-dice.use-case';
import { GetPossibleMovesUseCase } from './application';
import { GetLobbyUseCase } from './application';
import { PossibleMoveCalculatorUseCase } from './application/use-cases/possible-move-calculator.use-case';
import { MoveFigureUseCase } from './application';
import { DiceClientPort } from './ports/dice-client.port';
import { HttpDiceClientAdapter } from './adapters/dice/http-dice-client.adapter';
import { StartSessionUseCase } from './application';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { SessionEventsService } from './application/services';

export class AppModule {}
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 10 * 60 * 1000,
        limit: 1000,
      },
    ]),
  ],
  controllers: [SessionsController, SessionLiveController],
  providers: [
    CreateSessionUseCase,
    GetGameStateUseCase,
    StartSessionUseCase,
    ListOpenSessionsUseCase,
    LeaveSessionUseCase,
    ReconnectUseCase,
    GetGameStateUseCase,
    RollDiceUseCase,
    GetPossibleMovesUseCase,
    GetLobbyUseCase,
    PossibleMoveCalculatorUseCase,
    MoveFigureUseCase,
    HttpDiceClientAdapter,
    UpdateLobbySettingsUseCase,
    JoinSessionUseCase,
    GenerateInviteUseCase,
    GetSessionPlayersUseCase,
    DeleteSessionUseCase,
    GetResultsUseCase,
    GetHistoryUseCase,
    SessionEventsService,
    {
      provide: SessionRepositoryPort,
      useClass: PrismaSessionRepository,
    },
    {
      provide: DiceClientPort,
      useClass: HttpDiceClientAdapter,
    },
  ],
  exports: [
    SessionRepositoryPort,
    StartSessionUseCase,
    CreateSessionUseCase,
    ListOpenSessionsUseCase,
    RollDiceUseCase,
    LeaveSessionUseCase,
    ReconnectUseCase,
    MoveFigureUseCase,
    GetPossibleMovesUseCase,
    GetLobbyUseCase,
    UpdateLobbySettingsUseCase,
    JoinSessionUseCase,
    GenerateInviteUseCase,
    GetSessionPlayersUseCase,
    DeleteSessionUseCase,
    GetResultsUseCase,
    SessionEventsService,
  ],
})
export class SessionModule {}
