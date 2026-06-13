import { PlayerColor, PlayerType } from 'src/generated/prisma-client/client';
import { GameParticipant } from '../../../generated/prisma-class/game_participant';

export class PlayerResponseDto {
  id: string;
  sessionId: string;
  userId: string;
  color: PlayerColor;
  type: PlayerType;
  isBot: boolean;
  isCurrentTurn: boolean;
  hasFinished: boolean;
  figuresInGoal: number;
  figuresCaptured: number;
  placement: number | null;
  joinedAt: Date;

  static fromEntity(p: GameParticipant): PlayerResponseDto {
    const dto = new PlayerResponseDto();
    dto.id = p.id;
    dto.sessionId = p.sessionId;
    dto.userId = p.userId;
    dto.color = p.color;
    dto.type = p.type;
    dto.isBot = p.isBot;
    dto.isCurrentTurn = p.isCurrentTurn;
    dto.hasFinished = p.hasFinished;
    dto.figuresInGoal = p.figuresInGoal;
    dto.figuresCaptured = p.figuresCaptured;
    dto.placement = p.placement;
    dto.joinedAt = p.joinedAt;
    return dto;
  }
}
