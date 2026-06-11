export class NotEnoughPlayersError extends Error {
  constructor() {
    super('NOT_ENOUGH_PLAYERS');
    this.name = 'NotEnoughPlayersError';
  }
}