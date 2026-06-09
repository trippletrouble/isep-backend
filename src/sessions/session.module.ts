import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
//import { Session, GameParticipant, LobbySettings } from './domain/model';
import { SessionRepositoryPort } from './ports';
import { PrismaSessionRepository } from './adapters';
import { SessionsController } from './adapters';
import { CreateSessionUseCase } from './application';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
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
