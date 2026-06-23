import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../application';
import { User } from '@common';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ cookies: Record<string, string>; user: User }>();
    const sub = request.cookies?.session;

    if (!sub) throw new UnauthorizedException();

    const user = await this.authService.findByKeycloakSub(sub);
    if (!user) throw new UnauthorizedException();

    request.user = user;
    return true;
  }
}
