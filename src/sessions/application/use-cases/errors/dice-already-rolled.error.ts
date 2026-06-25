export class DiceAlreadyRolledError extends Error {
  constructor() {
    super('You already rolled your dice');
    this.name = 'DiceAlreadyRolledError';
  }
}
