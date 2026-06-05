import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { ConfigurationEngine } from '@engines/config/configuration-engine.service';
import { RulesEngine } from '@engines/rules/rules-engine.service';
import { WorkflowEngine } from '@engines/workflow/workflow-engine.service';

/**
 * Admin service — provides all data operations for the backend-served admin UI.
 * Every operation uses the same engine APIs that customer frontends will consume.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configEngine: ConfigurationEngine,
    private readonly rulesEngine: RulesEngine,
    private readonly workflowEngine: WorkflowEngine,
  ) {}

  // ==========================================================================
  // Tenant
  // ==========================================================================

  async getTenants() {
    return this.prisma.tenant.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } });
  }

  async getTenant(tenantId: string) {
    return this.prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  // ==========================================================================
  // Attendance Statuses
  // ==========================================================================

  async getAttendanceStatuses(tenantId: string) {
    return this.prisma.attendanceStatus.findMany({
      where: { tenant_id: tenantId },
      orderBy: { sort_order: 'asc' },
    });
  }

  async saveAttendanceStatus(
    tenantId: string,
    data: {
      id?: string;
      code: string;
      label_en: string;
      label_hi?: string;
      color: string;
      icon?: string;
      weight: string;
      is_present: boolean;
      is_default: boolean;
      sort_order: string;
    },
  ) {
    const label: Record<string, string> = { en: data.label_en };
    if (data.label_hi) label.hi = data.label_hi;

    if (data.id) {
      return this.prisma.attendanceStatus.update({
        where: { id: data.id },
        data: {
          code: data.code,
          label,
          color: data.color,
          icon: data.icon || null,
          weight: parseFloat(data.weight),
          is_present: data.is_present,
          is_default: data.is_default,
          sort_order: parseInt(data.sort_order, 10),
        },
      });
    }

    return this.prisma.attendanceStatus.create({
      data: {
        tenant_id: tenantId,
        code: data.code,
        label,
        color: data.color,
        icon: data.icon || null,
        weight: parseFloat(data.weight),
        is_present: data.is_present,
        is_default: data.is_default,
        sort_order: parseInt(data.sort_order, 10),
      },
    });
  }

  async deleteAttendanceStatus(id: string) {
    return this.prisma.attendanceStatus.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async reorderAttendanceStatuses(tenantId: string, ids: string[]) {
    for (let i = 0; i < ids.length; i++) {
      await this.prisma.attendanceStatus.update({
        where: { id: ids[i] },
        data: { sort_order: i + 1 },
      });
    }
  }

  // ==========================================================================
  // Grading Scale
  // ==========================================================================

  async getGradingScale(tenantId: string) {
    return this.configEngine.get(tenantId, 'grading.scale');
  }

  async saveGradingScale(tenantId: string, value: any) {
    // Validate basic structure
    if (!value.type || !['grade_bands', 'percentage', 'gpa', 'rubric'].includes(value.type)) {
      throw new Error('Invalid grading scale type');
    }
    return this.configEngine.set(tenantId, 'grading.scale', value);
  }

  // ==========================================================================
  // Academic Calendar
  // ==========================================================================

  async getAcademicYears(tenantId: string) {
    return this.prisma.academicYear.findMany({
      where: { tenant_id: tenantId },
      include: { terms: { orderBy: { sort_order: 'asc' } } },
      orderBy: { start_date: 'desc' },
    });
  }

  async saveAcademicYear(tenantId: string, data: { name: string; start_date: string; end_date: string }) {
    return this.prisma.academicYear.create({
      data: {
        tenant_id: tenantId,
        name: data.name,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
      },
    });
  }

  async saveAcademicTerm(yearId: string, data: {
    code: string; name: string; start_date: string; end_date: string;
    term_type: string; sort_order: string;
  }) {
    return this.prisma.academicTerm.create({
      data: {
        academic_year_id: yearId,
        code: data.code,
        name: data.name,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        term_type: data.term_type,
        sort_order: parseInt(data.sort_order, 10),
      },
    });
  }

  // ==========================================================================
  // Workflows
  // ==========================================================================

  async getWorkflows(tenantId: string) {
    return this.prisma.workflowDefinition.findMany({
      where: { tenant_id: tenantId, is_active: true },
      include: {
        states: { orderBy: { sort_order: 'asc' } },
        transitions: {
          include: { from_state: true, to_state: true },
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  // ==========================================================================
  // Rules
  // ==========================================================================

  async getRuleSets(tenantId: string) {
    return this.rulesEngine.getRuleSets(tenantId);
  }

  // ==========================================================================
  // Seed Templates
  // ==========================================================================

  async getTemplates() {
    return this.prisma.configTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  async loadTemplate(tenantId: string, templateId: string, schemaKey: string) {
    return this.configEngine.setFromTemplate(tenantId, schemaKey, templateId);
  }
}
