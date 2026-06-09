import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
//import { Session, GameParticipant, LobbySettings } from './domain/model';
import { SessionRepositoryPort } from './ports/session-repository.port';
import { PrismaSessionRepository } from './adapters/persistence/prisma-session.repository';
import { SessionsController } from './adapters/api/sessions.controller';
import { CreateSessionUseCase } from './application/use-cases/create-session.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [SessionsController],
  providers: [
    CreateSessionUseCase,

    {
      provide: SessionRepositoryPort,
      useClass: PrismaSessionRepository,
    },
  ],
  exports: [SessionRepositoryPort, CreateSessionUseCase],
})
export class SessionModule {}
