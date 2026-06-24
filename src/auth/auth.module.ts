import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController, PrismaUserRepository } from './adapters';
import { AuthService } from './application';
import { KeycloakStrategy } from './strategies';
import { ConfigModule } from '@nestjs/config';
import { SessionGuard } from './guards';
import { UserRepositoryPort } from './ports';

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
