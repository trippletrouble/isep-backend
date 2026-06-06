import { Game } from '../../domain/model/game';

export class GameResponseDto {
  readonly id: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(game: Game) {
    this.id = game.id;
    this.status = game.status;
    this.createdAt = game.createdAt.toISOString();
    this.updatedAt = game.updatedAt.toISOString();
  }

  static fromDomain(game: Game): GameResponseDto {
    return new GameResponseDto(game);
  }
}
