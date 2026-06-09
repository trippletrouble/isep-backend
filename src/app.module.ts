import { Module } from '@nestjs/common';
import { TestController } from '../test/test.controller';
import { PrismaModule } from './prisma/prisma.module';
import { GameModule } from './game/game.module';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './sessions';

@Module({
  imports: [PrismaModule, GameModule, AuthModule, SessionModule],
  controllers: [TestController],
  providers: [],
})
export class AppModule {}
