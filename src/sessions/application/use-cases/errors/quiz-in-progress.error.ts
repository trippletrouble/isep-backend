export class QuizInProgressError extends Error {
  constructor() {
    super('A quiz duel is in progress. No moves or rolls are allowed.');
    this.name = 'QuizInProgressError';
  }
}
