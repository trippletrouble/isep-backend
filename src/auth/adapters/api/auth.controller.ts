import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from '../../application';
import { appConfig } from '@common';
import { AuthRequest } from '../../util';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('test-login')
  async testLogin(
    @Query('username') username: string,
    @Query('sub') sub: string,
    @Res() res: Response,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not allowed in production');
    }

    if (!username || !sub) {
      throw new BadRequestException('username and sub are required');
    }

    const user = await this.authService.findOrCreateUser({
      sub,
      username,
      role: 'PLAYER',
    });

    res.cookie('session', sub, {
      httpOnly: true,
      secure: appConfig.node_env === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60,
    });

    res.status(200).json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  }

  @Get('oauth')
  @UseGuards(AuthGuard('keycloak'))
  login(): void {
    // Passport übernimmt den Redirect
  }

  @Get('oauth/callback')
  @UseGuards(AuthGuard('keycloak'))
  callback(@Req() req: AuthRequest, @Res() res: Response): void {
    res.cookie('session', req.user.keycloakSub, {
      httpOnly: true,
      secure: appConfig.node_env === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60,
    });

    res.redirect(appConfig.after_login_redirect_url);
  }

  @Get('session')
  async session(@Req() req: AuthRequest) {
    const sub = req.cookies?.session;
    if (!sub) throw new UnauthorizedException();

    const user = await this.authService.findByKeycloakSub(sub);
    if (!user) throw new UnauthorizedException();

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  @Post('logout')
  logout(@Res() res: Response): void {
    res.cookie('session', '', {
      httpOnly: true,
      secure: appConfig.node_env === 'production',
      sameSite: 'lax',
      maxAge: 0,
    });

    res.status(200).json({ message: 'Logged out' });
  }
}

