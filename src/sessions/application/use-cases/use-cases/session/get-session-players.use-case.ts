import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../../../ports';
import { SessionNotFoundError } from '../../errors';
import { PlayerResponseDto } from '../../../dtos';

@Injectable()
export class GetSessionPlayersUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
  ) {}

  async execute(sessionId: string): Promise<PlayerResponseDto[]> {
    const session = await this.sessionRepo.findSessionById(sessionId);
    if (!session) throw new SessionNotFoundError();

    return session.participants.map((p) => PlayerResponseDto.fromEntity(p));
  }
}
