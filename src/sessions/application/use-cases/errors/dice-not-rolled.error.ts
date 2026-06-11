export class DiceNotRolledError extends Error {
  constructor() {
    super('You must roll the dice before moving a figure');
    this.name = 'DiceNotRolledError';
  }
}
