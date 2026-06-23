import { Module } from '@nestjs/common';
import { TestController } from '../test/test.controller';
import { PrismaModule } from './prisma/prisma.module';
import { GameModule } from './game/game.module';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './sessions';
import { UsersModule } from './users/users.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    GameModule,
    AuthModule,
    SessionModule,
    UsersModule,
    RedisModule,
  ],
  controllers: [TestController],
  providers: [],
})
export class AppModule {}
