import { Game } from './domain';
import { GamePersistenceModel, GameStatus } from './util';

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
