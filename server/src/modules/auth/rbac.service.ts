import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { UserRole } from '@prisma/client';

/**
 * RBAC (Role-Based Access Control) Service
 * 
 * Centralizes permission resolution. Used by:
 * - JwtTokenService: embeds permissions in JWT at login
 * - PermissionGuard: validates permissions at request time
 * - Admin endpoints: CRUD for permissions and role assignments
 */
@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // Permission Resolution
  // ==========================================================================

  /**
   * Returns all permission codes for a user.
   * Combines role-based permissions + user-specific overrides.
   */
  async getUserPermissions(userId: string, role: UserRole): Promise<string[]> {
    const [rolePerms, userPerms] = await Promise.all([
      this.prisma.rolePermission.findMany({
        where: { role },
        include: { permission: true },
      }),
      this.prisma.userPermission.findMany({
        where: { user_id: userId },
        include: { permission: true },
      }),
    ]);

    const allPerms = new Set<string>();
    for (const rp of rolePerms) allPerms.add(rp.permission.code);
    for (const up of userPerms) allPerms.add(up.permission.code);

    return Array.from(allPerms).sort();
  }

  /**
   * Check if a user has a specific permission.
   */
  async hasPermission(userId: string, role: UserRole, permission: string): Promise<boolean> {
    const perms = await this.getUserPermissions(userId, role);
    return perms.includes(permission);
  }

  // ==========================================================================
  // Permission CRUD (Admin)
  // ==========================================================================

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { group_name: 'asc' },
    });
  }

  async getPermissionsByGroup(group: string) {
    return this.prisma.permission.findMany({
      where: { group_name: group },
      orderBy: { code: 'asc' },
    });
  }

  async getRolePermissions(role: UserRole) {
    return this.prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
      orderBy: { permission: { code: 'asc' } },
    });
  }

  async grantPermissionToRole(role: UserRole, permissionCode: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode },
    });
    if (!permission) throw new NotFoundException(`Permission ${permissionCode} not found`);

    return this.prisma.rolePermission.create({
      data: { role, permission_id: permission.id },
    });
  }

  async revokePermissionFromRole(role: UserRole, permissionCode: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode },
    });
    if (!permission) return;

    await this.prisma.rolePermission.deleteMany({
      where: { role, permission_id: permission.id },
    });
  }

  async grantPermissionToUser(userId: string, permissionCode: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode },
    });
    if (!permission) throw new NotFoundException(`Permission ${permissionCode} not found`);

    return this.prisma.userPermission.create({
      data: { user_id: userId, permission_id: permission.id },
    });
  }

  async revokePermissionFromUser(userId: string, permissionCode: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode },
    });
    if (!permission) return;

    await this.prisma.userPermission.deleteMany({
      where: { user_id: userId, permission_id: permission.id },
    });
  }

  async getUserPermissionOverrides(userId: string) {
    return this.prisma.userPermission.findMany({
      where: { user_id: userId },
      include: { permission: true },
    });
  }

  // ==========================================================================
  // Seed / Bootstrap
  // ==========================================================================

  async seedPermission(code: string, name: string, group: string, description?: string) {
    return this.prisma.permission.upsert({
      where: { code },
      create: { code, name, group_name: group, description: description || null },
      update: { name, group_name: group, description: description || null },
    });
  }

  async seedPermissions(permissions: Array<{ code: string; name: string; group: string; description?: string }>) {
    const results = [];
    for (const p of permissions) {
      results.push(await this.seedPermission(p.code, p.name, p.group, p.description));
    }
    return results;
  }

  async seedRolePermission(role: UserRole, permissionCode: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode },
    });
    if (!permission) throw new NotFoundException(`Permission ${permissionCode} not found`);

    return this.prisma.rolePermission.upsert({
      where: { role_permission_id: { role, permission_id: permission.id } },
      create: { role, permission_id: permission.id },
      update: {},
    });
  }
}
