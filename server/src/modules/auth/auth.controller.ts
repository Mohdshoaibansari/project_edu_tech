import { Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtTokenService } from './jwt-token.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly jwtService: JwtTokenService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; supertokens_token?: string; password?: string }, @Res({ passthrough: true }) res: Response) {
    // Accept both 'supertokens_token' (production) and 'password' (dev fallback)
    const stToken = body.supertokens_token || body.password || '';
    const { user, tokens } = await this.jwtService.login(body.email, stToken);

    // Set refresh token as HttpOnly cookie
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: false, // true in production
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return {
      data: {
        access_token: tokens.accessToken,
        expires_in: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          role: user.role,
          tenant_id: user.tenantId,
          tenant_name: user.tenantName,
          permissions: user.permissions,
        },
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      res.status(HttpStatus.UNAUTHORIZED);
      return { error: { code: 'UNAUTHORIZED', message: 'Refresh token not provided' } };
    }

    try {
      const tokens = await this.jwtService.refreshTokens(refreshToken);

      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return {
        data: {
          access_token: tokens.accessToken,
          expires_in: tokens.expiresIn,
        },
      };
    } catch {
      res.status(HttpStatus.UNAUTHORIZED);
      return { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' } };
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.jwtService.revokeRefreshToken(refreshToken);
    }
    res.clearCookie('refresh_token');
    return { data: { message: 'Logged out' } };
  }

  @Get('me')
  async me(@Req() req: Request) {
    // Extract user from JWT (in production, this comes from AuthGuard)
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = authHeader.substring(7);
    const payload = await this.jwtService.verifyAccessToken(token);
    const profile = await this.jwtService.getUserProfile(payload.sub);

    return {
      data: {
        id: profile.id,
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        role: profile.role,
        tenant_id: profile.tenantId,
        tenant_name: profile.tenantName,
        permissions: profile.permissions,
      },
    };
  }
}
