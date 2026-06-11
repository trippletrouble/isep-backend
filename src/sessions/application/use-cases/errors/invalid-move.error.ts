export class InvalidMoveError extends Error {
  constructor() {
    super('The selected figure cannot perform a legal move');
    this.name = 'InvalidMoveError';
  }
}
