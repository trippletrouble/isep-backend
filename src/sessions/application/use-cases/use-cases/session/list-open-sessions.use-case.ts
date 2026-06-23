import { Inject, Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../../../ports';
import { ListSessionsResponseDto } from '../../../dtos';

@Injectable()
export class ListOpenSessionsUseCase {
  constructor(
    @Inject(SessionRepositoryPort)
    private readonly sessionRepo: SessionRepositoryPort,
  ) {}

  /**
   * Returns a paginated list of open public sessions (status = WAITING, isPrivate = false).
   */
  async execute(page: number, size: number): Promise<ListSessionsResponseDto> {
    const { items, total } = await this.sessionRepo.findOpenPublicSessions(
      page,
      size,
    );

    return new ListSessionsResponseDto(items, page, size, total);
  }
}
