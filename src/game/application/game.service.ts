import { Inject, Injectable } from '@nestjs/common';
import { Game } from '../domain/model/game';
import { GameRepositoryPort } from '../ports/game-repository.port';
import { randomUUID } from 'crypto';

@Injectable()
export class GameService {
  constructor(
    @Inject(GameRepositoryPort)
    private readonly gameRepository: GameRepositoryPort,
  ) {}

  async createGame(): Promise<Game> {
    const now = new Date();
    const game = new Game(randomUUID(), 'WAITING', now, now);
    return this.gameRepository.save(game);
  }

  async findGameById(id: string): Promise<Game | null> {
    return this.gameRepository.findById(id);
  }
}
