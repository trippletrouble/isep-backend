import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import {
  SessionRepositoryPort,
  DiceClientPort,
  QuizServicePort,
} from './ports';
import {
  SessionsController,
  SessionLiveController,
  PrismaSessionRepository,
  HttpDiceClientAdapter,
  HttpQuizServiceAdapter,
} from './adapters';
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
  GetGameStateUseCase,
  RollDiceUseCase,
  GetPossibleMovesUseCase,
  GetLobbyUseCase,
  MoveFigureUseCase,
  StartSessionUseCase,
  SessionEventsService,
  GameStateCacheService,
  PossibleMoveCalculatorUseCase,
  SubmitQuizAnswerUseCase,
  FlyDebuffCacheService,
} from './application';
import { AuthModule } from '../auth';
import { FlyDomainService, LudoEngine } from './domain';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { SessionSseService } from './session-sse.service';

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
    RollDiceUseCase,
    GetPossibleMovesUseCase,
    PossibleMoveCalculatorUseCase,
    GetLobbyUseCase,
    LudoEngine,
    MoveFigureUseCase,
    HttpDiceClientAdapter,
    HttpQuizServiceAdapter,
    UpdateLobbySettingsUseCase,
    JoinSessionUseCase,
    GenerateInviteUseCase,
    GetSessionPlayersUseCase,
    DeleteSessionUseCase,
    GetResultsUseCase,
    GetHistoryUseCase,
    GameStateCacheService,
    SessionEventsService,
    SessionSseService,
    FlyDomainService,
    FlyDebuffCacheService,
    SubmitQuizAnswerUseCase,
    {
      provide: SessionRepositoryPort,
      useClass: PrismaSessionRepository,
    },
    {
      provide: DiceClientPort,
      useClass: HttpDiceClientAdapter,
    },
    {
      provide: QuizServicePort,
      useClass: HttpQuizServiceAdapter,
    },
  ],
  exports: [
    SessionRepositoryPort,
    QuizServicePort,
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
    SessionSseService,
    JoinSessionUseCase,
    GenerateInviteUseCase,
    GetSessionPlayersUseCase,
    DeleteSessionUseCase,
    GetResultsUseCase,
    SessionEventsService,
    GameStateCacheService,
    SubmitQuizAnswerUseCase,
  ],
})
export class SessionModule {}
