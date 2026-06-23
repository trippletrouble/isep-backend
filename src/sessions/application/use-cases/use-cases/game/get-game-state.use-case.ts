import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionRepositoryPort } from '../../../../ports';
import { GameStateType } from '../../types';
import { User } from '$gen/prisma-class/user';
import { GameStateCacheService } from '../../../services';

@Injectable()
export class GetGameStateUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly cache: GameStateCacheService,
  ) {}

  async execute(user: User, sessionId: string): Promise<GameStateType> {
    let gameState = await this.cache.get(sessionId);

    if (!gameState) {
      gameState = await this.sessionRepository.findGameStateById(sessionId);
      if (!gameState) {
        throw new NotFoundException({
          status: 'error',
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
          timestamp: new Date().toISOString(),
        });
      }
      this.cache.set(sessionId, gameState).catch(() => {});
    }

    const isInGame = gameState.players.some((player) => player.id === user.id);
    if (!isInGame) {
      throw new ForbiddenException({
        status: 'error',
        code: 'NOT_IN_GAME',
        message: 'You are not part of this game',
        timestamp: new Date().toISOString(),
      });
    }
    return gameState;
  }
}
