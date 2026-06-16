import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionRepositoryPort } from '../../ports';
import {
  SessionNotFoundError,
  InvalidSessionStatusError,
  OnlyHostCanInviteError,
} from './errors';
import { InviteResponseDto } from '../dtos';
import * as crypto from 'crypto';

@Injectable()
export class GenerateInviteUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
    private readonly configService: ConfigService,
  ) {}

  async execute(sessionId: string, userId: string): Promise<InviteResponseDto> {
    const session = await this.sessionRepo.findSessionById(sessionId);
    if (!session) throw new SessionNotFoundError();

    if (session.status !== 'WAITING') {
      throw new InvalidSessionStatusError();
    }

    if (session.hostId !== userId) {
      throw new OnlyHostCanInviteError();
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.sessionRepo.updateSessionInvite(sessionId, token, expiresAt);

    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const inviteUrl = baseUrl + '/join?token=' + token;

    return new InviteResponseDto(token, inviteUrl, expiresAt);
  }
}
