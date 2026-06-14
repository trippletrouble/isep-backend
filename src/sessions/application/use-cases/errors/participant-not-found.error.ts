export class ParticipantNotFoundError extends Error {
  constructor() {
    super('PARTICIPANT_NOT_FOUND');
    this.name = 'ParticipantNotFoundError';
  }
}
