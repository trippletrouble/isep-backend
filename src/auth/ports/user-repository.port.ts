import {User} from '../../generated/prisma-class/user';

export interface CreateUserDto {
  keycloakSub: string;
  username: string;
  avatarUrl?: string | null;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository {
  findByKeycloakSub(sub: string): Promise<User | null>;
  create(dto: CreateUserDto): Promise<User>;
}