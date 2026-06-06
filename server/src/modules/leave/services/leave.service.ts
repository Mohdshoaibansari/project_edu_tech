import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { ConfigurationEngine } from '@engines/config/configuration-engine.service';
import { WorkflowEngine } from '@engines/workflow/workflow-engine.service';
import { EventBus } from '@core/event-bus/event-bus.service';

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configEngine: ConfigurationEngine,
    private readonly workflowEngine: WorkflowEngine,
    private readonly eventBus: EventBus,
  ) {}

  async applyLeave(tenantId: string, data: {
    type_code: string; start_date: string; end_date: string; reason: string; student_id?: string; staff_id?: string; parent_id?: string;
  }) {
    const types = await this.configEngine.getLeaveTypes(tenantId);
    if (!types.find((t: any) => t.code === data.type_code)) throw new BadRequestException(`Invalid leave type: ${data.type_code}`);

    const leave = await this.prisma.leaveRequest.create({
      data: { tenant_id: tenantId, type_code: data.type_code, start_date: new Date(data.start_date), end_date: new Date(data.end_date), reason: data.reason, student_id: data.student_id || null, staff_id: data.staff_id || null, parent_id: data.parent_id || null, status: 'PENDING' },
    });

    const diffDays = Math.ceil((new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const instance = await this.workflowEngine.startWorkflow(tenantId, 'leave_approval', 'LeaveRequest', leave.id, { leave_days: diffDays }, data.parent_id);

    await this.prisma.leaveRequest.update({ where: { id: leave.id }, data: { workflow_instance_id: instance.id } });
    this.eventBus.emit('leave.applied', { tenantId, leaveId: leave.id, workflowInstanceId: instance.id });

    // Return fresh leave with workflow attached
    const updated = await this.prisma.leaveRequest.findUnique({ where: { id: leave.id } });
    return updated!;
  }

  async getLeaves(tenantId: string, filters?: { student_id?: string; status?: string; page?: number; pageSize?: number }) {
    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (filters?.student_id) where.student_id = filters.student_id;
    if (filters?.status) where.status = filters.status;
    const page = filters?.page || 1; const pageSize = Math.min(filters?.pageSize || 20, 100);
    const [leaves, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { created_at: 'desc' } }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return { data: leaves, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async getLeave(tenantId: string, leaveId: string) {
    const leave = await this.prisma.leaveRequest.findFirst({ where: { id: leaveId, tenant_id: tenantId } });
    if (!leave) throw new NotFoundException('Leave not found');
    let transitions: any[] = [];
    if (leave.workflow_instance_id) {
      try { transitions = await this.workflowEngine.getAvailableTransitions(leave.workflow_instance_id); } catch {}
    }
    return { ...leave, available_transitions: transitions };
  }

  async actionLeave(tenantId: string, leaveId: string, transition: string, actorId?: string, comment?: string, actorRole?: string) {
    const leave = await this.prisma.leaveRequest.findFirst({ where: { id: leaveId, tenant_id: tenantId } });
    if (!leave || !leave.workflow_instance_id) throw new BadRequestException('Leave has no active workflow');

    const result = await this.workflowEngine.transition(leave.workflow_instance_id, transition, actorId, comment, actorRole);
    await this.prisma.leaveRequest.update({ where: { id: leaveId }, data: { status: result.toState?.code || leave.status, reviewed_by: actorId, review_notes: comment || null } });

    if (result.toState?.is_final && result.toState.code === 'APPROVED') {
      this.eventBus.emit('leave.approved', { tenantId, leaveId });
    }
    return result;
  }
}
