export class LobbyFullError extends Error {
  constructor() {
    super('LOBBY_FULL');
    this.name = 'LobbyFullError';
  }
}
