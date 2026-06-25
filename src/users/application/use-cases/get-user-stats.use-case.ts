import { Injectable, NotFoundException } from '@nestjs/common';

import { PlayerStatsResponseDto } from '../dtos';
import { UserRepositoryPort } from '../../../auth';

@Injectable()
export class GetUserStatsUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async execute(userId: string): Promise<PlayerStatsResponseDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const participations =
      await this.userRepository.findFinishedParticipationsByUserId(userId);

    const gamesPlayed = participations.length;
    const gamesWon = participations.filter(
      (participation) => participation.winnerId === userId,
    ).length;
    const gamesLost = gamesPlayed - gamesWon;
    const winRatio = gamesPlayed > 0 ? gamesWon / gamesPlayed : 0;
    const totalFiguresCaptured = participations.reduce(
      (sum, participation) => sum + participation.figuresCaptured,
      0,
    );

    return new PlayerStatsResponseDto(
      gamesPlayed,
      gamesWon,
      gamesLost,
      winRatio,
      totalFiguresCaptured,
    );
  }
}
