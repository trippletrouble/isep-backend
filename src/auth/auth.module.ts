import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './adapters/api/auth.controller';
import { AuthService } from './application/auth.service';
import { PrismaUserRepository } from './adapters/persistence/prisma-user.repository';
import { KeycloakStrategy } from './strategies/keycloak.strategy';
import { USER_REPOSITORY } from './ports/user-repository.port';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PassportModule, ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    KeycloakStrategy,
    {
      provide:  USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
})
export class AuthModule {}