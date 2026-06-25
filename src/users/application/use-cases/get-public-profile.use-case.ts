import { Injectable, NotFoundException } from '@nestjs/common';

import { PublicProfileResponseDto } from '../dtos';
import { UserRepositoryPort } from '../../../auth';

@Injectable()
export class GetPublicProfileUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async execute(userId: string): Promise<PublicProfileResponseDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    return {
      id: user.id,
      username: user.username,
    };
  }
}
