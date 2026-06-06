import { Game, GameStatus } from './domain/model/game';

// Placeholder type until Prisma model is generated.
// Will be replaced with `import { Game as GameRecord } from '@prisma/client'`
export interface GamePersistenceModel {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GameMapper {
  static toDomain(record: GamePersistenceModel): Game {
    return new Game(
      record.id,
      record.status as GameStatus,
      record.createdAt,
      record.updatedAt,
    );
  }

  static toPersistence(game: Game): GamePersistenceModel {
    return {
      id: game.id,
      status: game.status,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }
}
