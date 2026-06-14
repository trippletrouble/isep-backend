export class ColorAlreadyTakenError extends Error {
  constructor() {
    super('COLOR_ALREADY_TAKEN');
    this.name = 'ColorAlreadyTakenError';
  }
}
