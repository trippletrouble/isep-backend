import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(private readonly config: ConfigService) {}

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
}