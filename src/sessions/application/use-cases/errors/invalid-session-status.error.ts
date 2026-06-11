export class InvalidSessionStatusError extends Error {
  constructor() {
    super('Session is not in WAITING status');
    this.name = 'InvalidSessionStatusError';
  }
}
