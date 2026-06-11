import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionRepositoryPort } from './ports';
import { PrismaSessionRepository } from './adapters';
import { SessionsController } from './adapters';
import { CreateSessionUseCase, ListOpenSessionsUseCase } from './application';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SessionsController],
  providers: [
    CreateSessionUseCase,
    ListOpenSessionsUseCase,
    {
      provide: SessionRepositoryPort,
      useClass: PrismaSessionRepository,
    },
  ],
  exports: [
    SessionRepositoryPort,
    CreateSessionUseCase,
    ListOpenSessionsUseCase,
  ],
})
export class SessionModule {}
