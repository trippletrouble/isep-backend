export type PlayerColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
export type PlayerType = 'HUMAN';
export const ALL_PLAYER_COLORS: PlayerColor[] = [
  'RED',
  'BLUE',
  'GREEN',
  'YELLOW',
];
export class GameParticipant {
  constructor(
    public readonly id: string,
    public readonly sessionId: string,
    public readonly userId: string,
    public color: PlayerColor,
    public type: PlayerType,
    public isBot: boolean,
    public isCurrentTurn: boolean,
    public hasFinished: boolean,
    public figuresInGoal: number,
    public placement: number | null,
    public figuresCaptured: number,
    public readonly joinedAt: Date,
    public updatedAt: Date,
  ) {}

  hasWon(): boolean {
    return this.figuresInGoal >= 4;
  }

  isHuman(): boolean {
    return this.type === 'HUMAN' && !this.isBot;
  }

  static getNextAvailableColor(usedColors: PlayerColor[]): PlayerColor {
    for (const color of ALL_PLAYER_COLORS) {
      if (!usedColors.includes(color)) {
        return color;
      }
    }
    throw new Error('No available colors left');
  }

  toPlainObject(): Record<string, any> {
    return {
      id: this.id,
      sessionId: this.sessionId,
      userId: this.userId,
      color: this.color,
      type: this.type,
      isBot: this.isBot,
      isCurrentTurn: this.isCurrentTurn,
      hasFinished: this.hasFinished,
      figuresInGoal: this.figuresInGoal,
      placement: this.placement,
      figuresCaptured: this.figuresCaptured,
      joinedAt: this.joinedAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  static fromPlainObject(data: Record<string, any>): GameParticipant {
    return new GameParticipant(
      data.id,
      data.sessionId,
      data.userId,
      data.color,
      data.type,
      data.isBot,
      data.isCurrentTurn,
      data.hasFinished,
      data.figuresInGoal,
      data.placement,
      data.figuresCaptured,
      new Date(data.joinedAt),
      new Date(data.updatedAt),
    );
  }
}
