import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
//import { Session, GameParticipant, LobbySettings } from './domain/model';
import { SessionRepositoryPort } from './ports';
import { PrismaSessionRepository } from './adapters';
import { SessionsController } from './adapters';
import { CreateSessionUseCase } from './application';
import { AuthModule } from '../auth/auth.module';
import { StartSessionUseCase } from './application/use-cases/start-session.use-case';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SessionsController],
  providers: [
    CreateSessionUseCase,
    StartSessionUseCase,
    {
      provide: SessionRepositoryPort,
      useClass: PrismaSessionRepository,
    },
  ],
  exports: [SessionRepositoryPort, CreateSessionUseCase, StartSessionUseCase],
})
export class SessionModule {}
