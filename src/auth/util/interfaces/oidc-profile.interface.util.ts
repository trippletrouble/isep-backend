import { UserRole } from '@common';

export interface OidcProfile {
  sub: string;
  username: string;
  avatarUrl?: string | null;
  role?: UserRole;
}
