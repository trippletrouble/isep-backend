import type { Request } from 'express';
import { AuthenticatedUser } from './authenticated-user.interface.util';

export interface AuthRequest extends Request {
  user: AuthenticatedUser;
  cookies: Record<string, string>;
}
