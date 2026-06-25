export class InviteResponseDto {
  inviteToken: ***ENTFERNT***
  inviteUrl: string;
  expiresAt: Date;

  constructor(inviteToken: string, inviteUrl: string, expiresAt: Date) {
    this.inviteToken = inviteToken;
    this.inviteUrl = inviteUrl;
    this.expiresAt = expiresAt;
  }
}
