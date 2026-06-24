import { UserRole } from '$gen/prisma-client/enums';

export interface CreateUserDto {
  keycloakSub: string;
  username: string;
  avatarUrl?: string | null;
  role?: UserRole;
}
