import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionRepositoryPort } from './ports';
import { PrismaSessionRepository } from './adapters';
import { SessionsController } from './adapters';
import {
  CreateSessionUseCase,
  StartSessionUseCase,
  GetSessionStateUseCase,
  RollDiceUseCase,
  MoveFigureUseCase,
  GetPossibleMovesUseCase,
} from './application';
import { LudoEngine } from './domain/model';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SessionsController],
  providers: [
    LudoEngine,
    CreateSessionUseCase,
    StartSessionUseCase,
    GetSessionStateUseCase,
    RollDiceUseCase,
    MoveFigureUseCase,
    GetPossibleMovesUseCase,

    {
      provide: SessionRepositoryPort,
      useClass: PrismaSessionRepository,
    },
  ],
  exports: [
    SessionRepositoryPort,
    LudoEngine,
    CreateSessionUseCase,
    StartSessionUseCase,
    GetSessionStateUseCase,
    RollDiceUseCase,
    MoveFigureUseCase,
    GetPossibleMovesUseCase,
  ],
})
export class SessionModule {}
