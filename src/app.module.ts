import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TestController } from '../test/test.controller';
import { PrismaModule } from './prisma/prisma.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [],
  controllers: [AppController, TestController],
  providers: [AppService],
  imports: [PrismaModule, GameModule],
})
export class AppModule {}
