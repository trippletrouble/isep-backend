export class AlreadyAnsweredError extends Error {
  constructor() {
    super('You have already submitted an answer for this quiz duel.');
    this.name = 'AlreadyAnsweredError';
  }
}
