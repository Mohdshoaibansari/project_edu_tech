import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const REQUIRE_PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // In production, verify JWT from Authorization header
    // For Phase 1, extract user from request (set by middleware or auth controller)
    if (!request.user) {
      // Allow unauthenticated access to auth endpoints
      const path = request.route?.path || request.url;
      if (path.includes('/auth/')) return true;
      throw new Error('UNAUTHORIZED');
    }
    return true;
  }
}

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new Error('UNAUTHORIZED');

    const tenantParam = request.params.tenantId;
    if (!tenantParam) return true; // No tenant in URL

    // SUPER_ADMIN can access any tenant
    if (user.role === 'SUPER_ADMIN') return true;

    if (tenantParam !== user.tenant) {
      throw new Error('TENANT_ACCESS_DENIED');
    }
    return true;
  }
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>(
      REQUIRE_PERMISSION_KEY,
      context.getHandler(),
    );
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.permissions) throw new Error('UNAUTHORIZED');

    if (!user.permissions.includes(requiredPermission)) {
      throw new Error(`FORBIDDEN: Missing permission "${requiredPermission}"`);
    }
    return true;
  }
}
