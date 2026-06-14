export class InvalidInviteTokenError extends Error {
  constructor() {
    super('INVALID_INVITE_TOKEN');
    this.name = 'InvalidInviteTokenError';
  }
}
