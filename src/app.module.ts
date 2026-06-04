import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [PrismaModule, GameModule],
})
export class AppModule {}
