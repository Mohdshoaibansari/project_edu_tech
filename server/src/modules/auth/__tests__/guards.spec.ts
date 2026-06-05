import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthGuard, TenantGuard, PermissionGuard } from '../guards/auth.guards';
import { JwtTokenService } from '../jwt-token.service';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockJwtService: any;

  beforeEach(() => {
    mockJwtService = {
      verifyAccessToken: vi.fn(),
    };
    guard = new AuthGuard(mockJwtService);
  });

  it('should allow public paths without token', async () => {
    for (const path of ['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/logout', '/admin/dashboard']) {
      const context = createMockContext(path);
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    }
  });

  it('should throw 401 when no Authorization header on protected route', async () => {
    const context = createMockContext('/api/v1/tenant-1/attendance/statuses');
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw 401 when token is invalid', async () => {
    mockJwtService.verifyAccessToken.mockRejectedValue(new Error('Invalid token'));
    const context = createMockContext('/api/v1/tenant-1/students', 'Bearer bad-token');
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should set request.user on valid token', async () => {
    const payload = { sub: 'user-1', tenant: 'tenant-1', role: 'TEACHER', permissions: ['attendance:view'] };
    mockJwtService.verifyAccessToken.mockResolvedValue(payload);
    const context = createMockContext('/api/v1/tenant-1/attendance/statuses', 'Bearer valid-token');

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(context.switchToHttp().getRequest().user).toEqual(payload);
  });
});

describe('TenantGuard', () => {
  const guard = new TenantGuard();

  it('should allow when no user on request (public route)', () => {
    const context = createMockContext('/api/v1/tenant-1/data');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow when no tenantId in params', () => {
    const context = createMockContext('/api/v1/data', '', { sub: 'u1', tenant: 't1', role: 'TEACHER', permissions: [] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow SUPER_ADMIN to access any tenant', () => {
    const context = createMockContext('/api/v1/tenant-other/data', '', { sub: 'u1', tenant: 't1', role: 'SUPER_ADMIN', permissions: [] });
    context.switchToHttp().getRequest().params = { tenantId: 'tenant-other' };
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny if tenant in URL does not match JWT claim', () => {
    const context = createMockContext('/api/v1/tenant-other/data', '', { sub: 'u1', tenant: 't1', role: 'TEACHER', permissions: [] });
    context.switchToHttp().getRequest().params = { tenantId: 'tenant-other' };
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow if tenant matches JWT claim', () => {
    const context = createMockContext('/api/v1/t1/data', '', { sub: 'u1', tenant: 't1', role: 'TEACHER', permissions: [] });
    context.switchToHttp().getRequest().params = { tenantId: 't1' };
    expect(guard.canActivate(context)).toBe(true);
  });
});

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let mockReflector: any;

  beforeEach(() => {
    mockReflector = { getAllAndOverride: vi.fn() };
    guard = new PermissionGuard(mockReflector);
  });

  it('should allow when no permission required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext('/api/v1/t1/data', '', { sub: 'u1', tenant: 't1', role: 'TEACHER', permissions: ['attendance:view'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw 401 when user not authenticated but permission required', () => {
    mockReflector.getAllAndOverride.mockReturnValue('attendance:mark');
    const context = createMockContext('/api/v1/t1/attendance/mark');
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw 403 when user lacks required permission', () => {
    mockReflector.getAllAndOverride.mockReturnValue('admin:settings');
    const context = createMockContext('/api/v1/t1/admin/settings', '', {
      sub: 'u1', tenant: 't1', role: 'TEACHER', permissions: ['attendance:view'],
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow when user has required permission', () => {
    mockReflector.getAllAndOverride.mockReturnValue('attendance:mark');
    const context = createMockContext('/api/v1/t1/attendance/mark', '', {
      sub: 'u1', tenant: 't1', role: 'TEACHER', permissions: ['attendance:view', 'attendance:mark'],
    });
    expect(guard.canActivate(context)).toBe(true);
  });
});

// Helper
function createMockContext(url: string, authHeader?: string, user?: any) {
  const request: any = {
    url,
    headers: authHeader ? { authorization: authHeader } : {},
    user: user || undefined,
    params: {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}
