import { User } from '../../generated/prisma-class/user';
import { UserRole } from '../../generated/prisma-client/enums';

export interface CreateUserDto {
  keycloakSub: string;
  username: string;
  avatarUrl?: string | null;
  role?: UserRole;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository {
  findByKeycloakSub(sub: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(dto: CreateUserDto): Promise<User>;
}
