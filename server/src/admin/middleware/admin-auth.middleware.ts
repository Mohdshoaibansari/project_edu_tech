import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtTokenService } from '@modules/auth/jwt-token.service';

// Paths allowed without admin authentication
const ADMIN_PUBLIC_PATHS = ['/admin/login'];

@Injectable()
export class AdminAuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtTokenService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip auth for public admin paths (login page + POST)
    if (ADMIN_PUBLIC_PATHS.some((p) => req.path === p)) {
      return next();
    }

    const adminToken = req.cookies?.admin_token;
    if (!adminToken) {
      return res.redirect('/admin/login');
    }

    try {
      const payload = await this.jwtService.verifyAccessToken(adminToken);
      req.user = payload;
      next();
    } catch {
      // Token expired or invalid — clear cookie and redirect to login
      res.clearCookie('admin_token');
      return res.redirect('/admin/login');
    }
  }
}
