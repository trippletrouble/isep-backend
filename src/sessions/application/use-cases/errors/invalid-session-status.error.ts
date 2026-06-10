export class InvalidSessionStatusError extends Error {
  constructor() {
    super('Session is not in progress');
    this.name = 'InvalidSessionStatusError';
  }
}
