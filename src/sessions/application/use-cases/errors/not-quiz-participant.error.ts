export class NotQuizParticipantError extends Error {
  constructor() {
    super('You are not a participant in this quiz duel.');
    this.name = 'NotQuizParticipantError';
  }
}
