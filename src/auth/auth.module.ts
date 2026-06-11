import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './adapters/api/auth.controller';
import { AuthService } from './application/auth.service';
import { PrismaUserRepository } from './adapters/persistence/prisma-user.repository';
import { KeycloakStrategy } from './strategies/keycloak.strategy';
import { ConfigModule } from '@nestjs/config';
import { SessionGuard } from './guards/session.guard';
import { UserRepositoryPort } from './ports/user-repository.port';

@Module({
  imports: [PassportModule, ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    KeycloakStrategy,
    SessionGuard,
    {
      provide: UserRepositoryPort,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
