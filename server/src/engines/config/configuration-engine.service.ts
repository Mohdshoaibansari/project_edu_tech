import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

/**
 * Configuration Engine — hierarchical, type-safe configuration engine.
 *
 * Features:
 *  - JSON Schema validation at write time (AJV)
 *  - Version history with rollback support
 *  - Config inheritance from templates (deep merge with overrides)
 *  - Typed convenience accessors for known schemas
 */
@Injectable()
export class ConfigurationEngine {
  private readonly ajv: Ajv;
  private validators = new Map<string, ValidateFunction>();

  constructor(private readonly prisma: PrismaService) {
    this.ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: true });
    addFormats(this.ajv);
  }

  // ==========================================================================
  // PUBLIC API — Read
  // ==========================================================================

  /**
   * Get the active configuration for a tenant and schema key.
   * Supports inheritance — resolves from templates if inherited_from is set.
   */
  async get(tenantId: string, schemaKey: string): Promise<any> {
    const config = await this.prisma.tenantConfig.findFirst({
      where: { tenant_id: tenantId, schema_key: schemaKey, is_active: true },
      orderBy: { version: 'desc' },
    });

    if (!config) return null;

    // Resolve inheritance chain
    if (config.inherited_from) {
      const template = await this.prisma.configTemplate.findUnique({
        where: { id: config.inherited_from },
      });
      if (template) {
        return this.deepMerge(template.config_value as any, config.overrides as any);
      }
    }

    return config.config_value;
  }

  /**
   * Get all active configurations for a tenant.
   */
  async getAll(tenantId: string): Promise<Record<string, any>> {
    const configs = await this.prisma.tenantConfig.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { version: 'desc' },
    });

    const result: Record<string, any> = {};
    for (const c of configs) {
      if (!result[c.schema_key]) {
        result[c.schema_key] = await this.get(tenantId, c.schema_key);
      }
    }
    return result;
  }

  // ==========================================================================
  // PUBLIC API — Write
  // ==========================================================================

  /**
   * Set a configuration value for a tenant (creates new version).
   * Validates against registered JSON Schema before saving.
   */
  async set(tenantId: string, schemaKey: string, value: any, userId?: string): Promise<any> {
    // Validate against registered schema
    await this.validate(schemaKey, value);

    // Deactivate all previous versions
    await this.prisma.tenantConfig.updateMany({
      where: { tenant_id: tenantId, schema_key: schemaKey, is_active: true },
      data: { is_active: false },
    });

    const latest = await this.prisma.tenantConfig.findFirst({
      where: { tenant_id: tenantId, schema_key: schemaKey },
      orderBy: { version: 'desc' },
    });

    return this.prisma.tenantConfig.create({
      data: {
        tenant_id: tenantId,
        schema_key: schemaKey,
        config_value: value,
        version: (latest?.version ?? 0) + 1,
        created_by: userId,
      },
    });
  }

  /**
   * Set a config that inherits from a template, with optional overrides.
   */
  async setFromTemplate(
    tenantId: string,
    schemaKey: string,
    templateId: string,
    overrides?: any,
    userId?: string,
  ): Promise<any> {
    const template = await this.prisma.configTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error(`Template ${templateId} not found`);

    const mergedValue = this.deepMerge(template.config_value as any, overrides);

    // Validate merged value
    await this.validate(schemaKey, mergedValue);

    // Deactivate previous
    await this.prisma.tenantConfig.updateMany({
      where: { tenant_id: tenantId, schema_key: schemaKey, is_active: true },
      data: { is_active: false },
    });

    const latest = await this.prisma.tenantConfig.findFirst({
      where: { tenant_id: tenantId, schema_key: schemaKey },
      orderBy: { version: 'desc' },
    });

    return this.prisma.tenantConfig.create({
      data: {
        tenant_id: tenantId,
        schema_key: schemaKey,
        config_value: mergedValue,
        inherited_from: templateId,
        overrides: overrides || null,
        version: (latest?.version ?? 0) + 1,
        created_by: userId,
      },
    });
  }

  // ==========================================================================
  // PUBLIC API — History & Rollback
  // ==========================================================================

  /**
   * Get version history for a config.
   */
  async getHistory(tenantId: string, schemaKey: string) {
    return this.prisma.tenantConfig.findMany({
      where: { tenant_id: tenantId, schema_key: schemaKey },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        config_value: true,
        inherited_from: true,
        overrides: true,
        is_active: true,
        created_at: true,
        created_by: true,
      },
    });
  }

  /**
   * Rollback to a specific version.
   */
  async rollback(tenantId: string, schemaKey: string, targetVersion: number, userId?: string) {
    const target = await this.prisma.tenantConfig.findFirst({
      where: { tenant_id: tenantId, schema_key: schemaKey, version: targetVersion },
    });
    if (!target) throw new Error(`Version ${targetVersion} not found for ${schemaKey}`);

    return this.set(tenantId, schemaKey, target.config_value, userId);
  }

  // ==========================================================================
  // PUBLIC API — Templates
  // ==========================================================================

  async getTemplates(schemaKey?: string) {
    return this.prisma.configTemplate.findMany({
      where: schemaKey ? { schema_key: schemaKey } : {},
      orderBy: { name: 'asc' },
    });
  }

  async getTemplate(templateId: string) {
    return this.prisma.configTemplate.findUnique({ where: { id: templateId } });
  }

  // ==========================================================================
  // CONVENIENCE ACCESSORS — Typed helpers for known schemas
  // ==========================================================================

  async getAttendanceStatuses(tenantId: string) {
    return this.prisma.attendanceStatus.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  }

  async getGradingScale(tenantId: string) {
    return this.get(tenantId, 'grading.scale');
  }

  async getLeaveTypes(tenantId: string) {
    return this.prisma.leaveType.findMany({
      where: { tenant_id: tenantId, is_active: true },
    });
  }

  async getAssessmentTypes(tenantId: string) {
    return this.prisma.assessmentType.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  }

  async getAcademicCalendar(tenantId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { tenant_id: tenantId, is_active: true },
      include: { terms: { orderBy: { sort_order: 'asc' }, where: { is_active: true } } },
      orderBy: { start_date: 'desc' },
    });
    return year;
  }

  async getNotificationTypes(tenantId: string) {
    return this.prisma.notificationTypeDef.findMany({
      where: { tenant_id: tenantId, is_active: true },
    });
  }

  async getHomeworkCategories(tenantId: string) {
    return this.prisma.homeworkCategory.findMany({
      where: { tenant_id: tenantId, is_active: true },
    });
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validate a config value against its registered JSON Schema.
   * Caches compiled validators per schema_key.
   */
  async validate(schemaKey: string, value: any): Promise<boolean> {
    let validator = this.validators.get(schemaKey);

    if (!validator) {
      const schema = await this.prisma.configSchema.findUnique({
        where: { schema_key: schemaKey },
      });
      if (!schema) {
        // No schema registered — accept any value (legacy mode)
        return true;
      }
      validator = this.ajv.compile(schema.json_schema as any);
      this.validators.set(schemaKey, validator);
    }

    const valid = validator(value);
    if (!valid) {
      const errors = (validator.errors || [])
        .map((e) => `${e.instancePath} ${e.message}`)
        .join('; ');
      throw new Error(`Config validation failed for "${schemaKey}": ${errors}`);
    }

    return true;
  }

  /**
   * Rebuild all cached validators (call after updating a config_schema).
   */
  async refreshValidators(): Promise<void> {
    this.validators.clear();
    const schemas = await this.prisma.configSchema.findMany({ where: { is_active: true } });
    for (const schema of schemas) {
      try {
        const validator = this.ajv.compile(schema.json_schema as any);
        this.validators.set(schema.schema_key, validator);
      } catch {
        // Skip invalid schemas — they'll be caught on next validate call
      }
    }
  }

  // ==========================================================================
  // INTERNAL — Deep Merge for inheritance
  // ==========================================================================

  /**
   * Deep merge two objects. Arrays from `overrides` replace entire arrays from `base`.
   */
  private deepMerge(base: Record<string, any> | null, overrides: Record<string, any> | null): any {
    if (!base) return overrides ?? {};
    if (!overrides) return base;

    const result = { ...base };

    for (const key of Object.keys(overrides)) {
      if (
        typeof overrides[key] === 'object' &&
        overrides[key] !== null &&
        !Array.isArray(overrides[key]) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = this.deepMerge(result[key], overrides[key]);
      } else {
        result[key] = overrides[key];
      }
    }

    return result;
  }
}
