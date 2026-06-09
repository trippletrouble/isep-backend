import { Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../application/auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @Get('oauth')
  @UseGuards(AuthGuard('keycloak'))
  login(): void {
    // Passport übernimmt den Redirect
  }

  @Get('oauth/callback')
  @UseGuards(AuthGuard('keycloak'))
  callback(@Req() req: Request, @Res() res: Response): void {
    res.cookie('session', (req.user as any).keycloakSub, {
      httpOnly: true,
      secure:   this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge:   1000 * 60 * 60,
    });

    res.redirect('/');
  }

  @Get('session')
  async session(@Req() req: Request) {
    const sub = req.cookies?.session;
    if (!sub) throw new UnauthorizedException();

    const user = await this.authService.findByKeycloakSub(sub);
    if (!user) throw new UnauthorizedException();

    return {
      id:       user.id,
      username: user.username,
      role:     user.role,
    };
  }

  @Post('logout')
  logout(@Res() res: Response): void {
    res.cookie('session', '', {
      httpOnly: true,
      secure:   this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge:   0,
    });

    res.status(200).json({ message: 'Logged out' });
  }
}