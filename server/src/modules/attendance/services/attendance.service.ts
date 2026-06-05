import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { ConfigurationEngine } from '@engines/config/configuration-engine.service';
import { RulesEngine } from '@engines/rules/rules-engine.service';
import { WorkflowEngine } from '@engines/workflow/workflow-engine.service';
import { EventBus } from '@core/event-bus/event-bus.service';

export interface AttendanceRecordInput {
  student_id: string;
  status_code: string;
  period?: number;
  notes?: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configEngine: ConfigurationEngine,
    private readonly rulesEngine: RulesEngine,
    private readonly workflowEngine: WorkflowEngine,
    private readonly eventBus: EventBus,
  ) {}

  // ==========================================================================
  // Status Loading (Config-Driven)
  // ==========================================================================

  async getValidStatuses(tenantId: string) {
    return this.configEngine.getAttendanceStatuses(tenantId);
  }

  // ==========================================================================
  // Mark Attendance (Batch)
  // ==========================================================================

  async markAttendance(tenantId: string, classId: string, date: string, records: AttendanceRecordInput[], markedBy?: string) {
    const statuses = await this.getValidStatuses(tenantId);
    const validCodes = new Set(statuses.filter((s: any) => s.is_active).map((s: any) => s.code));
    const results: any[] = [];

    for (const record of records) {
      if (!validCodes.has(record.status_code)) {
        throw new Error(`Invalid status "${record.status_code}". Valid: ${[...validCodes].join(', ')}`);
      }

      try {
        const attendance = await this.prisma.attendance.upsert({
          where: {
            student_id_class_id_date_period: {
              student_id: record.student_id,
              class_id: classId,
              date: new Date(date + 'T00:00:00Z'),
              period: record.period ?? 0,
            },
          },
          create: {
            tenant_id: tenantId,
            student_id: record.student_id,
            class_id: classId,
            date: new Date(date + 'T00:00:00Z'),
            status_code: record.status_code,
            period: record.period ?? null,
            notes: record.notes || null,
            marked_by: markedBy,
          },
          update: {
            status_code: record.status_code,
            notes: record.notes || null,
            marked_by: markedBy,
          },
        });
        results.push(attendance);
        this.eventBus.emit('attendance.marked', { tenantId, studentId: record.student_id, classId, statusCode: record.status_code, date });
      } catch (e: any) {
        throw new Error(`Attendance mark failed for student ${record.student_id}: ${e.message}`);
      }
    }
    return results;
  }

  // ==========================================================================
  // Attendance Query
  // ==========================================================================

  async getStudentAttendance(tenantId: string, studentId: string, from?: string, to?: string, page = 1, pageSize = 50) {
    const where: any = {
      tenant_id: tenantId,
      student_id: studentId,
    };
    if (from) where.date = { ...where.date, gte: new Date(from) };
    if (to) where.date = { ...where.date, lte: new Date(to) };

    const [records, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { date: 'desc' },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return {
      data: records,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getClassAttendance(tenantId: string, classId: string, date: string) {
    return this.prisma.attendance.findMany({
      where: {
        tenant_id: tenantId,
        class_id: classId,
        date: new Date(date),
      },
    });
  }

  // ==========================================================================
  // Attendance Rate Calculation (RulesEngine-Driven)
  // ==========================================================================

  async calculateAttendanceRate(tenantId: string, studentId: string, from: string, to: string): Promise<{
    rate: number;
    daysPresent: number;
    daysTotal: number;
    breakdown: Record<string, number>;
  }> {
    const records = await this.prisma.attendance.findMany({
      where: {
        tenant_id: tenantId,
        student_id: studentId,
        date: { gte: new Date(from), lte: new Date(to) },
      },
    });

    const statuses = await this.getValidStatuses(tenantId);
    const statusMap = new Map(statuses.map((s: any) => [s.code, s]));

    // Build context for RulesEngine
    const enrichedRecords = records.map((r) => {
      const status = statusMap.get(r.status_code);
      return {
        weight: status?.weight ?? 0,
        is_present: status?.is_present ?? false,
        counts_toward_attendance: true,
      };
    });

    // Try rules engine first, fallback to simple calculation
    try {
      const rate = await this.rulesEngine.evaluate<number>(tenantId, 'attendance.calculate_rate', {
        records: enrichedRecords,
      });
      const daysPresent = enrichedRecords.filter((r) => r.is_present).length;
      const daysTotal = enrichedRecords.length;

      const breakdown: Record<string, number> = {};
      for (const r of records) {
        breakdown[r.status_code] = (breakdown[r.status_code] || 0) + 1;
      }

      return { rate: rate ?? 0, daysPresent, daysTotal, breakdown };
    } catch {
      // Fallback: weighted calculation
      const totalWeight = enrichedRecords.reduce((sum, r) => sum + Number(r.weight), 0);
      const total = enrichedRecords.length;
      const rate = total > 0 ? (totalWeight / total) * 100 : 0;
      const daysPresent = enrichedRecords.filter((r) => r.is_present).length;

      const breakdown: Record<string, number> = {};
      for (const r of records) {
        breakdown[r.status_code] = (breakdown[r.status_code] || 0) + 1;
      }

      return { rate: Math.round(rate * 100) / 100, daysPresent, daysTotal: total, breakdown };
    }
  }

  // ==========================================================================
  // Attendance Corrections (WorkflowEngine-Driven)
  // ==========================================================================

  async requestCorrection(tenantId: string, attendanceId: string, newStatusCode: string, reason: string, requesterId?: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id: attendanceId, tenant_id: tenantId },
    });
    if (!attendance) throw new Error(`Attendance record ${attendanceId} not found`);

    // Validate new status
    const statuses = await this.getValidStatuses(tenantId);
    if (!statuses.find((s: any) => s.code === newStatusCode)) {
      throw new Error(`Invalid status "${newStatusCode}"`);
    }

    // Start correction workflow
    const instance = await this.workflowEngine.startWorkflow(
      tenantId,
      'attendance_correction',
      'AttendanceCorrection',
      attendanceId,
      { old_status: attendance.status_code, new_status: newStatusCode, reason },
      requesterId,
    );

    // Emit event
    this.eventBus.emit('attendance.corrected', {
      tenantId,
      attendanceId,
      oldStatus: attendance.status_code,
      newStatus: newStatusCode,
    });

    return { correction: attendance, workflow: instance };
  }

  async getCorrections(tenantId: string, status?: string) {
    return this.prisma.workflowInstance.findMany({
      where: {
        tenant_id: tenantId,
        workflow_code: 'attendance_correction',
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async actionCorrection(instanceId: string, action: 'Approve' | 'Reject', actorId?: string, comment?: string, actorRole?: string) {
    const result = await this.workflowEngine.transition(instanceId, action, actorId, comment, actorRole);

    // If approved, update the actual attendance record
    if (action === 'Approve' && result.toState?.is_final) {
      const instance = await this.workflowEngine.getInstance(instanceId);
      if (instance) {
        const context = instance.context as any;
        await this.prisma.attendance.update({
          where: { id: instance.entity_id },
          data: {
            status_code: context.new_status,
            updated_at: new Date(),
          },
        });
      }
    }

    return result;
  }
}
