import { Module } from '@nestjs/common';
import { GetPublicProfileUseCase, GetUserStatsUseCase } from './application';
import { UserRepositoryPort, PrismaUserRepository, AuthModule } from '../auth';
import { PrismaModule } from '../prisma';
import { UsersController } from './adapters';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsersController],
  providers: [
    GetPublicProfileUseCase,
    GetUserStatsUseCase,
    {
      provide: UserRepositoryPort,
      useClass: PrismaUserRepository,
    },
  ],
})
export class UsersModule {}
