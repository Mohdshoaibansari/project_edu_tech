import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEventName, DomainEvents } from '@core/event-bus/event-bus.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async send(tenantId: string, recipientId: string, typeCode: string, title: string, body: string, channel = 'in_app') {
    return this.prisma.notification.create({ data: { tenant_id: tenantId, recipient_id: recipientId, type_code: typeCode, title, body, channel } });
  }

  async getInbox(tenantId: string, userId: string, isRead?: boolean, page = 1, pageSize = 20) {
    const where: any = { tenant_id: tenantId, recipient_id: userId };
    if (isRead !== undefined) where.is_read = isRead;
    pageSize = Math.min(pageSize, 100);
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { created_at: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);
    return { data: notifications, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async markRead(notificationId: string) {
    return this.prisma.notification.update({ where: { id: notificationId }, data: { is_read: true, read_at: new Date() } });
  }

  async markAllRead(tenantId: string, userId: string) {
    await this.prisma.notification.updateMany({ where: { tenant_id: tenantId, recipient_id: userId, is_read: false }, data: { is_read: true, read_at: new Date() } });
  }

  // ==========================================================================
  // Event Subscribers — Listen to domain events and send notifications
  // ==========================================================================

  @OnEvent('attendance.marked')
  async onAttendanceMarked(event: DomainEvents['attendance.marked']) {
    // In production, load parent/student info and send absence alert
    await this.send(event.tenantId, 'system', 'ABSENCE_ALERT', 'Attendance Marked', `Student ${event.studentId} marked as ${event.statusCode}`);
  }

  @OnEvent('homework.assigned')
  async onHomeworkAssigned(event: DomainEvents['homework.assigned']) {
    await this.send(event.tenantId, 'system', 'HOMEWORK_DUE', 'New Homework', `Homework ${event.homeworkId} assigned`);
  }

  @OnEvent('homework.graded')
  async onHomeworkGraded(event: DomainEvents['homework.graded']) {
    await this.send(event.tenantId, 'system', 'RESULT_PUBLISHED', 'Homework Graded', `Score: ${event.score}, Grade: ${event.grade}`);
  }

  @OnEvent('leave.applied')
  async onLeaveApplied(event: DomainEvents['leave.applied']) {
    await this.send(event.tenantId, 'system', 'LEAVE_STATUS', 'Leave Requested', `Leave ${event.leaveId} applied`);
  }

  @OnEvent('student.risk_flagged')
  async onStudentRiskFlagged(event: DomainEvents['student.risk_flagged']) {
    await this.send(event.tenantId, 'system', 'GENERAL', 'Student At Risk', `Student ${event.studentId} flagged as ${event.riskLevel}`);
  }
}
