import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../ports';
import { GameStateCacheService } from '../services/game-state-cache.service';
import {
  SessionNotFoundError,
  InvalidSessionStatusError,
  LobbyFullError,
  ColorAlreadyTakenError,
  InvalidInviteTokenError,
  InviteTokenExpiredError,
} from './errors';
import {
  PlayerColor,
  PlayerType,
} from '../../../generated/prisma-client/enums';
import { ParticipantDto } from '../dtos/participant.dto';
import { GameStateType } from './types/game-state.type';

@Injectable()
export class JoinSessionUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    private readonly cache: GameStateCacheService,
  ) {}

  async execute(
    sessionId: string,
    userId: string,
    preferredColor?: PlayerColor,
    inviteToken?: string,
  ): Promise<GameStateType> {
    const session = await this.sessionRepo.findSessionById(sessionId);
    if (!session) throw new SessionNotFoundError();

    if (session.status !== 'WAITING') {
      throw new InvalidSessionStatusError();
    }

    const isAlreadyParticipant = session.participants.some(
      (p) => p.userId === userId,
    );
    if (isAlreadyParticipant) {
      const gameState = await this.sessionRepo.findGameStateById(sessionId);
      if (!gameState) throw new SessionNotFoundError();
      this.cache.set(sessionId, gameState).catch(() => {});
      return gameState;
    }

    if (session.participants.length >= session.numberOfPlayers) {
      throw new LobbyFullError();
    }

    if (session.isPrivate) {
      if (!inviteToken || inviteToken !== session.inviteToken) {
        throw new InvalidInviteTokenError();
      }
      if (
        session.inviteTokenExpiresAt &&
        new Date() > session.inviteTokenExpiresAt
      ) {
        throw new InviteTokenExpiredError();
      }
    }

    const takenColors = session.participants.map((p) => p.color);
    let assignedColor: PlayerColor;

    if (preferredColor) {
      if (takenColors.includes(preferredColor)) {
        throw new ColorAlreadyTakenError();
      }
      assignedColor = preferredColor;
    } else {
      const allColors = [
        PlayerColor.RED,
        PlayerColor.BLUE,
        PlayerColor.YELLOW,
        PlayerColor.GREEN,
      ];
      const availableColor = allColors.find((c) => !takenColors.includes(c));
      if (!availableColor) {
        throw new LobbyFullError();
      }
      assignedColor = availableColor;
    }

    const now = new Date();
    const participant = new ParticipantDto(
      now,
      sessionId,
      userId,
      assignedColor,
      PlayerType.HUMAN,
      false,
      false,
      false,
      0,
      null,
      0,
      now,
    );

    await this.sessionRepo.createParticipant(participant);

    const gameState = await this.sessionRepo.findGameStateById(sessionId);
    if (!gameState) throw new SessionNotFoundError();

    this.cache.set(sessionId, gameState).catch(() => {});

    return gameState;
  }
}
