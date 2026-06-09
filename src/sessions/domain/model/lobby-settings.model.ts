type GameMode = 'CLASSIC';
type BoardTheme = 'CLASSIC';
type AdditionalRule = 'THROW_AGAIN_ON_6' | 'THREE_SIXES_LOSE_TURN';
const VALID_ADDITIONAL_RULES: AdditionalRule[] = [
  'THROW_AGAIN_ON_6',
  'THREE_SIXES_LOSE_TURN',
];
export class LobbySettings {
  constructor(
    public readonly numberOfPlayers: number,
    public readonly mode: GameMode = 'CLASSIC',
    public readonly boardTheme: BoardTheme = 'CLASSIC',
    public readonly isPrivate: boolean = false,
    public readonly turnTimeLimitSeconds: number | null = null,
    public readonly additionalRules: AdditionalRule[] = [],
  ) {
    this.validate();
  }
  private validate(): void {
    if (this.numberOfPlayers < 2 || this.numberOfPlayers > 4) {
      throw new Error('numberOfPlayers must be between 2 and 4');
    }
    if (this.turnTimeLimitSeconds !== null) {
      if (this.turnTimeLimitSeconds < 10 || this.turnTimeLimitSeconds > 120) {
        throw new Error('turnTimeLimitSeconds must be between 10 and 120 or null');
      }
    }

    for (const rule of this.additionalRules) {
      if (!VALID_ADDITIONAL_RULES.includes(rule)) {
        throw new Error(`Invalid additional rule: ${rule}. Valid rules are: ${VALID_ADDITIONAL_RULES.join(', ')}`);
      }
    }
  }

  isPrivateLobby(): boolean {
    return this.isPrivate;
  }

  canThrowAgainOnSix(): boolean {
    return this.additionalRules.includes('THROW_AGAIN_ON_6');
  }

  doesThreeSixesLoseTurn(): boolean {
    return this.additionalRules.includes('THREE_SIXES_LOSE_TURN');
  }

  toPlainObject(): Record<string, any> {
    return {
      numberOfPlayers: this.numberOfPlayers,
      mode: this.mode,
      boardTheme: this.boardTheme,
      isPrivate: this.isPrivate,
      turnTimeLimitSeconds: this.turnTimeLimitSeconds,
      additionalRules: this.additionalRules,
    };
  }

  static fromPlainObject(data: Record<string, any>): LobbySettings {
    return new LobbySettings(
      data.numberOfPlayers,
      data.mode,
      data.boardTheme,
      data.isPrivate ?? false,
      data.turnTimeLimitSeconds ?? null,
      data.additionalRules ?? [],
    );
  }
}
