export class OnlyHostCanInviteError extends Error {
  constructor() {
    super('ONLY_HOST_CAN_INVITE');
    this.name = 'OnlyHostCanInviteError';
  }
}
