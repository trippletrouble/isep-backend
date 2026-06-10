export class NotYourTurnError extends Error {
  constructor() {
    super('This is not Your turn');
    this.name = 'NotYourTurnError';
  }
}
