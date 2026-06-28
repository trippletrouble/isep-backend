export class NotInQuizError extends Error {
  constructor() {
    super('Session is not in a quiz duel state.');
    this.name = 'NotInQuizError';
  }
}
