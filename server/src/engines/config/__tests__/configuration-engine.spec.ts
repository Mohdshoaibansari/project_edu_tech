import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigurationEngine } from '../configuration-engine.service';

// Mock PrismaService
const mockPrisma = {
  configSchema: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  tenantConfig: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  configTemplate: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  attendanceStatus: {
    findMany: vi.fn(),
  },
  leaveType: {
    findMany: vi.fn(),
  },
  assessmentType: {
    findMany: vi.fn(),
  },
  academicYear: {
    findFirst: vi.fn(),
  },
  notificationTypeDef: {
    findMany: vi.fn(),
  },
  homeworkCategory: {
    findMany: vi.fn(),
  },
};

describe('ConfigurationEngine', () => {
  let engine: ConfigurationEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ConfigurationEngine(mockPrisma as any);
  });

  // ==========================================================================
  // get()
  // ==========================================================================
  describe('get', () => {
    it('should return config_value for a standalone config', async () => {
      mockPrisma.tenantConfig.findFirst.mockResolvedValue({
        config_value: { foo: 'bar' },
        inherited_from: null,
      });

      const result = await engine.get('tenant-1', 'test.key');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null when no config exists', async () => {
      mockPrisma.tenantConfig.findFirst.mockResolvedValue(null);

      const result = await engine.get('tenant-1', 'test.key');
      expect(result).toBeNull();
    });

    it('should resolve inheritance — deep merge template + overrides', async () => {
      mockPrisma.tenantConfig.findFirst.mockResolvedValue({
        config_value: { from_template: true },
        inherited_from: 'template-1',
        overrides: { custom_field: 'override_value' },
      });
      mockPrisma.configTemplate.findUnique.mockResolvedValue({
        config_value: {
          from_template: true,
          default_field: 'default',
          nested: { key: 'original' },
        },
      });

      const result = await engine.get('tenant-1', 'test.key');
      expect(result).toEqual({
        from_template: true,
        default_field: 'default',
        nested: { key: 'original' },
        custom_field: 'override_value',
      });
    });
  });

  // ==========================================================================
  // set()
  // ==========================================================================
  describe('set', () => {
    it('should validate against registered schema and create new version', async () => {
      // Register schema first
      mockPrisma.configSchema.findUnique.mockResolvedValue({
        json_schema: {
          type: 'object',
          properties: { name: { type: 'string' }, max_students: { type: 'integer', minimum: 1 } },
          required: ['name'],
        },
      });

      mockPrisma.tenantConfig.findFirst.mockResolvedValue({ version: 2 });
      mockPrisma.tenantConfig.create.mockResolvedValue({
        id: 'new-config-id',
        version: 3,
        config_value: { name: 'Test Config', max_students: 30 },
      });

      const result = await engine.set('tenant-1', 'test.key', { name: 'Test Config', max_students: 30 }, 'user-1');

      expect(mockPrisma.tenantConfig.updateMany).toHaveBeenCalled();
      expect(result.version).toBe(3);
    });

    it('should throw validation error for invalid config', async () => {
      mockPrisma.configSchema.findUnique.mockResolvedValue({
        json_schema: {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
      });

      await expect(
        engine.set('tenant-1', 'test.key', { wrong_field: 'value' }),
      ).rejects.toThrow('Config validation failed');
    });

    it('should accept any value when no schema is registered (legacy mode)', async () => {
      mockPrisma.configSchema.findUnique.mockResolvedValue(null);
      mockPrisma.tenantConfig.findFirst.mockResolvedValue(null);
      mockPrisma.tenantConfig.create.mockResolvedValue({ version: 1 });

      const result = await engine.set('tenant-1', 'test.key', { anything: 'goes' });
      expect(result.version).toBe(1);
    });
  });

  // ==========================================================================
  // setFromTemplate()
  // ==========================================================================
  describe('setFromTemplate', () => {
    it('should merge template value with overrides', async () => {
      mockPrisma.configTemplate.findUnique.mockResolvedValue({
        id: 'template-1',
        config_value: {
          statuses: [
            { code: 'PRESENT', label: { en: 'Present' }, weight: 1.0 },
            { code: 'ABSENT', label: { en: 'Absent' }, weight: 0.0 },
          ],
          attendance_formula: 'SUM(weight)/COUNT',
        },
      });

      mockPrisma.configSchema.findUnique.mockResolvedValue(null); // No validation

      mockPrisma.tenantConfig.findFirst.mockResolvedValue(null);
      mockPrisma.tenantConfig.create.mockResolvedValue({ version: 1 });

      const overrides = {
        statuses: [{ code: 'LATE', label: { en: 'Late' }, weight: 0.5 }],
      };

      const result = await engine.setFromTemplate('tenant-1', 'attendance.statuses', 'template-1', overrides);

      expect(mockPrisma.tenantConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inherited_from: 'template-1',
            overrides,
            config_value: expect.objectContaining({
              attendance_formula: 'SUM(weight)/COUNT',
              statuses: [{ code: 'LATE', label: { en: 'Late' }, weight: 0.5 }],
            }),
          }),
        }),
      );
    });

    it('should throw if template not found', async () => {
      mockPrisma.configTemplate.findUnique.mockResolvedValue(null);

      await expect(
        engine.setFromTemplate('tenant-1', 'test.key', 'nonexistent'),
      ).rejects.toThrow('Template nonexistent not found');
    });
  });

  // ==========================================================================
  // Version History & Rollback
  // ==========================================================================
  describe('getHistory', () => {
    it('should return all versions ordered by desc', async () => {
      mockPrisma.tenantConfig.findMany.mockResolvedValue([
        { id: '3', version: 3, config_value: { v: 3 }, created_at: new Date() },
        { id: '2', version: 2, config_value: { v: 2 }, created_at: new Date() },
        { id: '1', version: 1, config_value: { v: 1 }, created_at: new Date() },
      ]);

      const history = await engine.getHistory('tenant-1', 'test.key');
      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(3);
    });
  });

  describe('rollback', () => {
    it('should rollback to a specific version', async () => {
      mockPrisma.tenantConfig.findFirst
        .mockResolvedValueOnce({ version: 1, config_value: { old: 'value' } }) // target version
        .mockResolvedValueOnce({ version: 3 }); // latest version for increment

      mockPrisma.configSchema.findUnique.mockResolvedValue(null);
      mockPrisma.tenantConfig.create.mockResolvedValue({ version: 4, config_value: { old: 'value' } });

      const result = await engine.rollback('tenant-1', 'test.key', 1);
      expect(result.version).toBe(4);
    });

    it('should throw if target version not found', async () => {
      mockPrisma.tenantConfig.findFirst.mockResolvedValue(null);

      await expect(engine.rollback('tenant-1', 'test.key', 999)).rejects.toThrow(
        'Version 999 not found',
      );
    });
  });

  // ==========================================================================
  // Convenience Accessors
  // ==========================================================================
  describe('getAttendanceStatuses', () => {
    it('should return active statuses sorted by sort_order', async () => {
      const statuses = [
        { code: 'PRESENT', sort_order: 1, is_active: true },
        { code: 'ABSENT', sort_order: 2, is_active: true },
        { code: 'LATE', sort_order: 3, is_active: true },
      ];
      mockPrisma.attendanceStatus.findMany.mockResolvedValue(statuses);

      const result = await engine.getAttendanceStatuses('tenant-1');
      expect(result).toEqual(statuses);
      expect(mockPrisma.attendanceStatus.findMany).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-1', is_active: true },
        orderBy: { sort_order: 'asc' },
      });
    });
  });

  // ==========================================================================
  // Deep Merge (internal)
  // ==========================================================================
  describe('deep merge (via get with inheritance)', () => {
    it('should merge nested objects deeply', async () => {
      mockPrisma.tenantConfig.findFirst.mockResolvedValue({
        config_value: {},
        inherited_from: 'template-1',
        overrides: { nested: { b: 2 }, arr: [3] },
      });
      mockPrisma.configTemplate.findUnique.mockResolvedValue({
        config_value: {
          top: 'from-template',
          nested: { a: 1, b: 99 },
          arr: [1, 2],
        },
      });

      const result = await engine.get('tenant-1', 'test.key');
      expect(result).toEqual({
        top: 'from-template',
        nested: { a: 1, b: 2 },
        arr: [3], // Arrays replaced entirely
      });
    });
  });

  // ==========================================================================
  // getGradingScale
  // ==========================================================================
  describe('getGradingScale', () => {
    it('should delegate to get() with grading.scale key', async () => {
      mockPrisma.tenantConfig.findFirst.mockResolvedValue({
        config_value: { type: 'grade_bands' },
        inherited_from: null,
      });

      const result = await engine.getGradingScale('tenant-1');
      expect(result).toEqual({ type: 'grade_bands' });
    });
  });

  // ==========================================================================
  // getAcademicCalendar
  // ==========================================================================
  describe('getAcademicCalendar', () => {
    it('should return active academic year with terms', async () => {
      const calendar = {
        id: 'year-1',
        name: '2026-2027',
        terms: [
          { id: 'term-1', code: 'SEM1', name: 'Semester 1', sort_order: 1 },
          { id: 'term-2', code: 'SEM2', name: 'Semester 2', sort_order: 2 },
        ],
      };
      mockPrisma.academicYear.findFirst.mockResolvedValue(calendar);

      const result = await engine.getAcademicCalendar('tenant-1');
      expect(result).toEqual(calendar);
      expect(mockPrisma.academicYear.findFirst).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-1', is_active: true },
        include: { terms: { orderBy: { sort_order: 'asc' }, where: { is_active: true } } },
        orderBy: { start_date: 'desc' },
      });
    });
  });
});
