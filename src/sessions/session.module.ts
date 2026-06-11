import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionRepositoryPort } from './ports';
import { PrismaSessionRepository } from './adapters';
import { SessionsController } from './adapters';
import { CreateSessionUseCase, ListOpenSessionsUseCase } from './application';
import { AuthModule } from '../auth/auth.module';
import { GetGameStateUseCase } from './application/use-cases/get-game-state.use-case';
import { RollDiceUseCase } from './application/use-cases/roll-dice.use-case';
import { PossibleMoveCalculatorUseCase } from './application/use-cases/possible-move-calculator.use-case';
import { MoveFigureUseCase } from './application/use-cases/move-figure.use-case';
import { DiceClientPort } from './ports/dice-client.port';
import { HttpDiceClientAdapter } from './adapters/dice/http-dice-client.adapter';
import { StartSessionUseCase } from './application/use-cases/start-session.use-case';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule.forRoot()],
  controllers: [SessionsController],
  providers: [
    CreateSessionUseCase,
    GetGameStateUseCase,
    StartSessionUseCase,
    ListOpenSessionsUseCase,
    GetGameStateUseCase,
    RollDiceUseCase,
    PossibleMoveCalculatorUseCase,
    MoveFigureUseCase,
    HttpDiceClientAdapter,
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
  ],
})
export class SessionModule {}
