import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async getAttendanceReport(tenantId: string, filters?: { class_id?: string; student_id?: string; from?: string; to?: string }) {
    const where: any = { tenant_id: tenantId };
    if (filters?.class_id) where.class_id = filters.class_id;
    if (filters?.student_id) where.student_id = filters.student_id;
    if (filters?.from || filters?.to) where.date = {};
    if (filters?.from) where.date.gte = new Date(filters.from);
    if (filters?.to) where.date.lte = new Date(filters.to);

    const records = await this.prisma.attendance.findMany({ where, orderBy: { date: 'desc' } });
    const byStatus: Record<string, number> = {};
    for (const r of records) { byStatus[r.status_code] = (byStatus[r.status_code] || 0) + 1; }

    return { data: { total_records: records.length, by_status: byStatus, records: records.slice(0, 100) } };
  }

  async getExamReport(tenantId: string, filters?: { exam_id?: string; class_id?: string; academic_term_id?: string; student_id?: string }) {
    const where: any = { tenant_id: tenantId };
    if (filters?.exam_id) where.id = filters.exam_id;
    if (filters?.class_id) where.class_id = filters.class_id;
    if (filters?.academic_term_id) where.academic_term_id = filters.academic_term_id;

    const exams = await this.prisma.exam.findMany({
      where, include: { scores: true }, orderBy: { date: 'desc' },
    });

    return { data: exams };
  }

  async getLeaveReport(tenantId: string, filters?: { student_id?: string; from?: string; to?: string }) {
    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (filters?.student_id) where.student_id = filters.student_id;
    if (filters?.from || filters?.to) where.created_at = {};
    if (filters?.from) where.created_at.gte = new Date(filters.from);
    if (filters?.to) where.created_at.lte = new Date(filters.to);

    const leaves = await this.prisma.leaveRequest.findMany({ where, orderBy: { created_at: 'desc' } });
    return { data: leaves };
  }

  async getDashboard(tenantId: string) {
    const [activeStudents, todayAttendance, pendingLeaves, activeHomework] = await Promise.all([
      this.prisma.student.count({ where: { tenant_id: tenantId, deleted_at: null } }),
      this.prisma.attendance.findMany({ where: { tenant_id: tenantId, date: new Date() } }),
      this.prisma.leaveRequest.count({ where: { tenant_id: tenantId, status: 'PENDING', deleted_at: null } }),
      this.prisma.homework.count({ where: { tenant_id: tenantId, status: 'PUBLISHED' } }),
    ]);

    const present = todayAttendance.filter((a) => {
      // Simple check — in production, load from ConfigEngine
      return a.status_code === 'PRESENT' || a.status_code === 'LATE' || a.status_code === 'MEDICAL';
    }).length;

    return {
      data: {
        students_count: activeStudents,
        attendance_today: { total: todayAttendance.length, present, absent: todayAttendance.length - present },
        pending_leaves: pendingLeaves,
        active_homework: activeHomework,
      },
    };
  }
}
