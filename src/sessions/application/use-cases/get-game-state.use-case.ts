import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports/session.repository.port';
import { GameStateType } from './types/game-state.type';
import { User } from '@prisma/client';

@Injectable()
export class GetGameStateUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
  ) {}

  async execute(user: User, sessionId: string): Promise<GameStateType> {
    const gameState = await this.sessionRepository.findGameStateById(sessionId);
    let isInGame: boolean;
    isInGame = false;
    gameState?.players.forEach((player) => {
      if (player.id == user.id) {
        isInGame = true;
      }
    });
    if (!isInGame) {
      throw new Error('You are not part of the game');
    }
    if (!gameState) {
      throw new NotFoundException({
        status: 'error',
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
        timestamp: new Date().toISOString(),
      });
    }

    return gameState;
  }
}
