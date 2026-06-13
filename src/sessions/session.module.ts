import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionRepositoryPort } from './ports';
import { PrismaSessionRepository } from './adapters';
import { SessionsController } from './adapters';
import {
  CreateSessionUseCase,
  ListOpenSessionsUseCase,
  UpdateLobbySettingsUseCase,
} from './application';
import { AuthModule } from '../auth/auth.module';
import { GetGameStateUseCase } from './application/use-cases/get-game-state.use-case';
import { RollDiceUseCase } from './application/use-cases/roll-dice.use-case';
import { GetPossibleMovesUseCase } from './application';
import { GetLobbyUseCase } from './application';
import { LudoEngine } from './domain';
import { MoveFigureUseCase } from './application';
import { DiceClientPort } from './ports/dice-client.port';
import { HttpDiceClientAdapter } from './adapters/dice/http-dice-client.adapter';
import { StartSessionUseCase } from './application';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

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
  controllers: [SessionsController],
  providers: [
    CreateSessionUseCase,
    GetGameStateUseCase,
    StartSessionUseCase,
    ListOpenSessionsUseCase,
    GetGameStateUseCase,
    RollDiceUseCase,
    GetPossibleMovesUseCase,
    GetLobbyUseCase,
    LudoEngine,
    MoveFigureUseCase,
    HttpDiceClientAdapter,
    UpdateLobbySettingsUseCase,
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
    MoveFigureUseCase,
    GetPossibleMovesUseCase,
    GetLobbyUseCase,
    UpdateLobbySettingsUseCase,
  ],
})
export class SessionModule {}
