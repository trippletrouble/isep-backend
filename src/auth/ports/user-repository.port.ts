import { User } from '../../generated/prisma-class/user';
import { UserRole } from '../../generated/prisma-client/enums';

export interface CreateUserDto {
  keycloakSub: string;
  username: string;
  avatarUrl?: string | null;
  role?: UserRole;
}

export abstract class UserRepositoryPort {
  abstract findById(id: string): Promise<User | null>;
  abstract findByKeycloakSub(sub: string): Promise<User | null>;
  abstract create(dto: CreateUserDto): Promise<User>;
}
