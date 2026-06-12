import { Module } from '@nestjs/common';
import { GetPublicProfileUseCase } from './application/use-cases/get-public-profile.use-case';
import { UserRepositoryPort } from '../auth/ports/user-repository.port';
import { PrismaUserRepository } from '../auth/adapters/persistence/prisma-user.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './adapters/api/user.controller';
import { GetUserStatsUseCase } from './application/use-cases/get-user-stats.use-case';

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
