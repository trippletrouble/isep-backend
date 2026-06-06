import { Module } from '@nestjs/common';
import { TestController } from '../test/test.controller';
import { PrismaModule } from './prisma/prisma.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [PrismaModule, GameModule],
  controllers: [TestController],
  providers: [],
})
export class AppModule {}
