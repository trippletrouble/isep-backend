export type GameStatus = 'WAITING' | 'IN_PROGRESS' | 'QUIZ_PENDING' | 'FINISHED';
export type GameMode = 'CLASSIC';
export type BoardTheme = 'CLASSIC';
export type AdditionalRule =
  | 'THROW_AGAIN_ON_6'
  | 'THREE_SIXES_LOSE_TURN'
  | 'PLAGUE_FLY';
export class Session {
  constructor(
    public readonly id: string,
    public status: GameStatus,
    public mode: GameMode,
    public boardTheme: BoardTheme,
    public numberOfPlayers: number,
    public isPrivate: boolean,
    public inviteToken: string | null,
    public turnTimeLimitSeconds: number | null,
    public additionalRules: AdditionalRule[],
    public hostId: string,
    public currentPlayerId: string | null,
    public turnNumber: number,
    public lastDiceValue: number | null,
    public diceRolledThisTurn: boolean,
    public consecutiveSixes: number,
    public winnerId: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}
  isWaiting(): boolean {
    return this.status === 'WAITING';
  }
  isInProgress(): boolean {
    return this.status === 'IN_PROGRESS';
  }
  isFinished(): boolean {
    return this.status === 'FINISHED';
  }
  isQuizPending(): boolean {
    return this.status === 'QUIZ_PENDING';
  }

  canStart(): boolean {
    return this.isWaiting(); // Additional checks will be added in BE-1-09
  }

  toPlainObject(): Record<string, any> {
    return {
      id: this.id,
      status: this.status,
      mode: this.mode,
      boardTheme: this.boardTheme,
      numberOfPlayers: this.numberOfPlayers,
      isPrivate: this.isPrivate,
      inviteToken: ***ENTFERNT***
      turnTimeLimitSeconds: this.turnTimeLimitSeconds,
      additionalRules: this.additionalRules,
      hostId: this.hostId,
      currentPlayerId: this.currentPlayerId,
      turnNumber: this.turnNumber,
      lastDiceValue: this.lastDiceValue,
      diceRolledThisTurn: this.diceRolledThisTurn,
      consecutiveSixes: this.consecutiveSixes,
      winnerId: this.winnerId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  static fromPlainObject(data: Record<string, any>): Session {
    return new Session(
      data.id,
      data.status,
      data.mode,
      data.boardTheme,
      data.numberOfPlayers,
      data.isPrivate,
      data.inviteToken,
      data.turnTimeLimitSeconds,
      data.additionalRules,
      data.hostId,
      data.currentPlayerId,
      data.turnNumber,
      data.lastDiceValue,
      data.diceRolledThisTurn,
      data.consecutiveSixes,
      data.winnerId,
      new Date(data.createdAt),
      new Date(data.updatedAt),
    );
  }
}
