import { GameStatus } from '../../util';

export class Game {
  constructor(
    public readonly id: string,
    public status: GameStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  start(): void {
    if (this.status !== 'WAITING') {
      throw new Error(`Cannot start game in status "${this.status}"`);
    }
    this.status = 'IN_PROGRESS';
    this.updatedAt = new Date();
  }

  finish(): void {
    if (this.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot finish game in status "${this.status}"`);
    }
    this.status = 'FINISHED';
    this.updatedAt = new Date();
  }
}
