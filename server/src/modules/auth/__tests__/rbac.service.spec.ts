import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RbacService } from '../rbac.service';
import { UserRole } from '@prisma/client';

// Mock PrismaService
const mockPrisma = {
  permission: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  rolePermission: {
    findMany: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  userPermission: {
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
};

describe('RbacService', () => {
  let service: RbacService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RbacService(mockPrisma as any);
  });

  // ==========================================================================
  // getUserPermissions
  // ==========================================================================
  describe('getUserPermissions', () => {
    it('should combine role and user permissions', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: { code: 'attendance:view' } },
        { permission: { code: 'attendance:mark' } },
      ]);
      mockPrisma.userPermission.findMany.mockResolvedValue([
        { permission: { code: 'report:export' } },
      ]);

      const perms = await service.getUserPermissions('user-1', 'TEACHER' as UserRole);

      expect(perms).toEqual(['attendance:mark', 'attendance:view', 'report:export']);
      expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledWith({
        where: { role: 'TEACHER' },
        include: { permission: true },
      });
      expect(mockPrisma.userPermission.findMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        include: { permission: true },
      });
    });

    it('should return only role permissions when no user overrides', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: { code: 'homework:view' } },
      ]);
      mockPrisma.userPermission.findMany.mockResolvedValue([]);

      const perms = await service.getUserPermissions('user-2', 'STUDENT' as UserRole);

      expect(perms).toEqual(['homework:view']);
    });

    it('should deduplicate permissions from both sources', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: { code: 'attendance:view' } },
        { permission: { code: 'attendance:mark' } },
      ]);
      mockPrisma.userPermission.findMany.mockResolvedValue([
        { permission: { code: 'attendance:view' } }, // Duplicate
        { permission: { code: 'report:view' } },
      ]);

      const perms = await service.getUserPermissions('user-1', 'TEACHER' as UserRole);

      // No duplicates, sorted alphabetically
      expect(perms).toEqual(['attendance:mark', 'attendance:view', 'report:view']);
    });

    it('should return empty array for role with no permissions', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([]);
      mockPrisma.userPermission.findMany.mockResolvedValue([]);

      const perms = await service.getUserPermissions('new-user', 'STAFF' as UserRole);

      expect(perms).toEqual([]);
    });
  });

  // ==========================================================================
  // hasPermission
  // ==========================================================================
  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: { code: 'attendance:mark' } },
      ]);
      mockPrisma.userPermission.findMany.mockResolvedValue([]);

      const result = await service.hasPermission('user-1', 'TEACHER' as UserRole, 'attendance:mark');

      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: { code: 'homework:view' } },
      ]);
      mockPrisma.userPermission.findMany.mockResolvedValue([]);

      const result = await service.hasPermission('user-1', 'STUDENT' as UserRole, 'attendance:mark');

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Admin: grant/revoke
  // ==========================================================================
  describe('grantPermissionToRole', () => {
    it('should create role_permission record', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue({ id: 'perm-1', code: 'report:export' });
      mockPrisma.rolePermission.create.mockResolvedValue({ id: 'rp-1' });

      await service.grantPermissionToRole('TEACHER' as UserRole, 'report:export');

      expect(mockPrisma.rolePermission.create).toHaveBeenCalledWith({
        data: { role: 'TEACHER', permission_id: 'perm-1' },
      });
    });

    it('should throw for unknown permission', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);

      await expect(
        service.grantPermissionToRole('TEACHER' as UserRole, 'nonexistent:perm'),
      ).rejects.toThrow('Permission nonexistent:perm not found');
    });
  });

  describe('revokePermissionFromRole', () => {
    it('should delete role_permission record', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue({ id: 'perm-1', code: 'report:export' });

      await service.revokePermissionFromRole('TEACHER' as UserRole, 'report:export');

      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { role: 'TEACHER', permission_id: 'perm-1' },
      });
    });

    it('should not throw for unknown permission', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);

      await expect(
        service.revokePermissionFromRole('TEACHER' as UserRole, 'nonexistent'),
      ).resolves.toBeUndefined();

      expect(mockPrisma.rolePermission.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('grantPermissionToUser', () => {
    it('should create user_permission override', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue({ id: 'perm-1', code: 'admin:settings' });
      mockPrisma.userPermission.create.mockResolvedValue({ id: 'up-1' });

      await service.grantPermissionToUser('user-1', 'admin:settings');

      expect(mockPrisma.userPermission.create).toHaveBeenCalledWith({
        data: { user_id: 'user-1', permission_id: 'perm-1' },
      });
    });
  });

  // ==========================================================================
  // Seed helpers
  // ==========================================================================
  describe('seedPermission', () => {
    it('should upsert a permission', async () => {
      mockPrisma.permission.upsert.mockResolvedValue({ id: 'p-1', code: 'test:action' });

      await service.seedPermission('test:action', 'Test Action', 'test');

      expect(mockPrisma.permission.upsert).toHaveBeenCalledWith({
        where: { code: 'test:action' },
        create: { code: 'test:action', name: 'Test Action', group_name: 'test', description: null },
        update: { name: 'Test Action', group_name: 'test', description: null },
      });
    });
  });

  describe('seedRolePermission', () => {
    it('should upsert a role-permission mapping', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue({ id: 'perm-1', code: 'attendance:view' });
      mockPrisma.rolePermission.upsert.mockResolvedValue({ id: 'rp-1' });

      await service.seedRolePermission('TEACHER' as UserRole, 'attendance:view');

      expect(mockPrisma.rolePermission.upsert).toHaveBeenCalledWith({
        where: { role_permission_id: { role: 'TEACHER', permission_id: 'perm-1' } },
        create: { role: 'TEACHER', permission_id: 'perm-1' },
        update: {},
      });
    });
  });
});
