import { UserRole } from '@prisma/client';

export interface OidcProfile {
  sub: string;
  username: string;
  avatarUrl?: string | null;
  role?: UserRole;
}
