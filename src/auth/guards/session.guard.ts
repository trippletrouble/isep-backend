import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../application/auth.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sub = request.cookies?.session;

    if (!sub) throw new UnauthorizedException();

    const user = await this.authService.findByKeycloakSub(sub);
    if (!user) throw new UnauthorizedException();

    request.user = user;
    return true;
  }
}