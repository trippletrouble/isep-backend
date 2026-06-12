export class SessionNotFoundError extends Error {
  constructor() {
    super('SESSION_NOT_FOUND');
    this.name = 'SessionNotFoundError';
  }
}
