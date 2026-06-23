import { User } from '$gen/prisma-class/user';
import { FinishedParticipationStats } from '../util';
import { CreateUserDto } from '../util';

export abstract class UserRepositoryPort {
  abstract findById(id: string): Promise<User | null>;
  abstract findByKeycloakSub(sub: string): Promise<User | null>;
  abstract create(dto: CreateUserDto): Promise<User>;
  abstract findFinishedParticipationsByUserId(
    userId: string,
  ): Promise<FinishedParticipationStats[]>;
}
