import { Module } from '@nestjs/common';
import { GameController } from './adapters/api/game.controller';
import { GameService } from './application/game.service';
import { PrismaGameRepository } from './adapters/persistence/prisma-game.repository';
import { GameRepositoryPort } from './ports/game-repository.port';

@Module({
  controllers: [GameController],
  providers: [
    GameService,
    {
      provide: GameRepositoryPort,  // ← the Symbol token
      useClass: PrismaGameRepository,
    },
  ],
  exports: [GameService],
})
export class GameModule {}
