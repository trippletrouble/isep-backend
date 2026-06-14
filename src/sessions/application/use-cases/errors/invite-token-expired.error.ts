export class InviteTokenExpiredError extends Error {
  constructor() {
    super('INVITE_TOKEN_EXPIRED');
    this.name = 'InviteTokenExpiredError';
  }
}
