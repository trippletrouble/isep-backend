import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../../../ports';
import { LudoEngine } from '../../../../domain';
import {
  DiceNotRolledError,
  InvalidSessionStatusError,
  NotYourTurnError,
  SessionNotFoundError,
} from '../../errors';
import { PossibleMovesResultType } from '../../types';
import { FlyDebuffCacheService } from '../../../services';

@Injectable()
export class GetPossibleMovesUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly ludoEngine: LudoEngine,
    private readonly flyDebuffCache: FlyDebuffCacheService,
  ) {}

  async execute(
    sessionId: string,
    playerId: string,
  ): Promise<PossibleMovesResultType> {
    const gameState = await this.sessionRepository.findGameStateById(sessionId);

    if (!gameState) {
      throw new SessionNotFoundError();
    }

    if (gameState.status !== 'IN_PROGRESS') {
      throw new InvalidSessionStatusError();
    }

    if (gameState.currentPlayerId !== playerId) {
      throw new NotYourTurnError();
    }

    if (!gameState.diceRolledThisTurn || gameState.lastDiceValue === null) {
      throw new DiceNotRolledError();
    }

    const flyDebuffMap = await this.flyDebuffCache.get(sessionId);

    return {
      diceValue: gameState.lastDiceValue,
      possibleMoves: this.ludoEngine.getPossibleMoves(
        gameState,
        playerId,
        gameState.lastDiceValue,
        flyDebuffMap,
      ),
    };
  }
}
