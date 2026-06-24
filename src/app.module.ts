import { Module } from '@nestjs/common';
import { TestController } from '../test/test.controller';
import { PrismaModule } from './prisma';
import { GameModule } from './game';
import { AuthModule } from './auth';
import { SessionModule } from './sessions';
import { UsersModule } from './users';
import { RedisModule } from './redis';

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
