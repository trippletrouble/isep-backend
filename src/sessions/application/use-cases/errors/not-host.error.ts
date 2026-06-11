export class NotHostError extends Error {
  constructor() {
    super('NOT_HOST');
    this.name = 'NotHostError';
  }
}