import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtTokenService, TokenPayload } from '../jwt-token.service';

export const REQUIRE_PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Paths that don't require JWT authentication (matched against request.url)
const PUBLIC_PATHS = ['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/logout', '/admin'];

/**
 * AuthGuard — Extracts JWT from Authorization header, verifies it, sets request.user.
 * Skips routes starting with public paths (auth endpoints, admin routes).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const url: string = request.url || '';

    // Skip auth for public routes
    if (PUBLIC_PATHS.some((p) => url.startsWith(p))) {
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    try {
      const payload = await this.jwtService.verifyAccessToken(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

/**
 * TenantGuard — Ensures the tenant in the URL matches the user's JWT claim.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return true;

    const tenantParam = request.params.tenantId;
    if (!tenantParam) return true;
    if (user.role === 'SUPER_ADMIN') return true;

    if (tenantParam !== user.tenant) {
      throw new ForbiddenException('TENANT_ACCESS_DENIED');
    }
    return true;
  }
}

/**
 * PermissionGuard — Checks if the user has the required permission.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.permissions) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.permissions.includes(requiredPermission)) {
      throw new ForbiddenException(
        `Missing required permission: "${requiredPermission}"`,
      );
    }
    return true;
  }
}
