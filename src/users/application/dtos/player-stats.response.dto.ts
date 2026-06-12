import { ApiProperty } from '@nestjs/swagger';

export class PlayerStatsResponseDto {
  @ApiProperty({
    description: 'Anzahl der gespielten (beendeten) Sessions',
    minimum: 0,
    example: 42,
  })
  gamesPlayed: number;

  @ApiProperty({
    description: 'Anzahl der gewonnenen Sessions',
    minimum: 0,
    example: 17,
  })
  gamesWon: number;

  @ApiProperty({
    description: 'Anzahl der verlorenen Sessions',
    minimum: 0,
    example: 25,
  })
  gamesLost: number;

  @ApiProperty({
    description: 'Verhältnis Siege zu gespielte Spiele (0.0–1.0).',
    minimum: 0,
    maximum: 1,
    example: 0.4,
  })
  winRatio: number;

  @ApiProperty({
    description: 'Gegnerische Figuren insgesamt geschlagen.',
    minimum: 0,
    example: 183,
  })
  totalFiguresCaptured: number;

  constructor(
    gamesPlayed: number,
    gamesWon: number,
    gamesLost: number,
    winRatio: number,
    totalFiguresCaptured: number,
  ) {
    this.gamesPlayed = gamesPlayed;
    this.gamesWon = gamesWon;
    this.gamesLost = gamesLost;
    this.winRatio = winRatio;
    this.totalFiguresCaptured = totalFiguresCaptured;
  }
}
