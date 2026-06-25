import { Module } from '@nestjs/common';
import { GameController } from './adapters';
import { GameService } from './application';
import { PrismaGameRepository } from './adapters';
import { GameRepositoryPort } from './ports';

@Module({
  controllers: [GameController],
  providers: [
    GameService,
    {
      provide: GameRepositoryPort, // ← the Symbol token
      useClass: PrismaGameRepository,
    },
  ],
  exports: [GameService],
})
export class GameModule {}
