import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
//import { Session, GameParticipant, LobbySettings } from './domain/model';
import { SessionRepositoryPort } from './ports/session-repository.port';
import { PrismaSessionRepository } from './adapters/persistence/prisma-session.repository';
import { SessionsController } from './adapters/api/sessions.controller';
import { CreateSessionUseCase } from './application/use-cases/create-session.use-case';
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
