import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';

@Injectable()
export class AcademicStructureService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // Grades
  // ==========================================================================

  async getGrades(tenantId: string) {
    return this.prisma.grade.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  }

  async createGrade(tenantId: string, data: { code: string; name: string; sort_order?: number }) {
    return this.prisma.grade.create({ data: { tenant_id: tenantId, ...data } });
  }

  // ==========================================================================
  // Sections
  // ==========================================================================

  async getSections(tenantId: string, gradeId?: string) {
    return this.prisma.section.findMany({
      where: { tenant_id: tenantId, is_active: true, ...(gradeId && { grade_id: gradeId }) },
      include: { grade: true },
      orderBy: { name: 'asc' },
    });
  }

  async createSection(tenantId: string, data: { grade_id: string; code: string; name: string; class_teacher_id?: string; capacity?: number }) {
    return this.prisma.section.create({ data: { tenant_id: tenantId, ...data } });
  }

  // ==========================================================================
  // Subjects
  // ==========================================================================

  async getSubjects(tenantId: string) {
    return this.prisma.subject.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  async createSubject(tenantId: string, data: { code: string; name: string; is_core?: boolean }) {
    return this.prisma.subject.create({ data: { tenant_id: tenantId, ...data } });
  }

  // ==========================================================================
  // Classes (Grade + Section + Subject + Teacher assignments)
  // ==========================================================================

  async getClasses(tenantId: string, filters?: { grade_id?: string; section_id?: string; teacher_id?: string }) {
    const where: any = { tenant_id: tenantId, is_active: true };
    if (filters?.grade_id) where.grade_id = filters.grade_id;
    if (filters?.section_id) where.section_id = filters.section_id;
    if (filters?.teacher_id) where.teacher_id = filters.teacher_id;

    return this.prisma.class.findMany({ where });
  }

  async assignClass(tenantId: string, data: {
    grade_id: string; section_id: string; subject_id: string;
    teacher_id?: string; academic_term_id?: string;
  }) {
    return this.prisma.class.create({ data: { tenant_id: tenantId, ...data } });
  }

  // ==========================================================================
  // Students
  // ==========================================================================

  async getStudents(tenantId: string, filters?: {
    grade_level?: string; search?: string; page?: number; pageSize?: number;
  }) {
    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (filters?.grade_level) where.grade_level = filters.grade_level;

    const page = filters?.page || 1;
    const pageSize = Math.min(filters?.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where: {
          ...where,
          ...(filters?.search && {
            OR: [
              { first_name: { contains: filters.search, mode: 'insensitive' } },
              { last_name: { contains: filters.search, mode: 'insensitive' } },
              { student_id_card: { contains: filters.search, mode: 'insensitive' } },
            ],
          }),
        },
        skip,
        take: pageSize,
        orderBy: { first_name: 'asc' },
      }),
      this.prisma.student.count({ where: this.buildSearchWhere(where, filters?.search) }),
    ]);

    return {
      data: students,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getStudent(tenantId: string, studentId: string) {
    return this.prisma.student.findFirst({
      where: { id: studentId, tenant_id: tenantId, deleted_at: null },
    });
  }

  async enrollStudent(tenantId: string, data: {
    first_name: string; last_name: string; date_of_birth: string;
    grade_level: string; parent_id?: string; metadata?: any;
  }) {
    const studentIdCard = `STU-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return this.prisma.student.create({
      data: {
        tenant_id: tenantId,
        user_id: crypto.randomUUID(), // Placeholder — real user created via auth flow
        student_id_card: studentIdCard,
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: new Date(data.date_of_birth),
        grade_level: data.grade_level,
        parent_id: data.parent_id || null,
        metadata: data.metadata || {},
      },
    });
  }

  // ==========================================================================
  // Staff
  // ==========================================================================

  async getStaff(tenantId: string, filters?: { designation?: string; search?: string; page?: number; pageSize?: number }) {
    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (filters?.designation) where.designation = filters.designation;

    const page = filters?.page || 1;
    const pageSize = Math.min(filters?.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const [staff, total] = await Promise.all([
      this.prisma.staff.findMany({
        where: {
          ...where,
          ...(filters?.search && {
            OR: [
              { first_name: { contains: filters.search, mode: 'insensitive' } },
              { last_name: { contains: filters.search, mode: 'insensitive' } },
            ],
          }),
        },
        skip,
        take: pageSize,
        orderBy: { first_name: 'asc' },
      }),
      this.prisma.staff.count({ where: this.buildSearchWhere(where, filters?.search) }),
    ]);

    return {
      data: staff,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async addStaff(tenantId: string, data: {
    first_name: string; last_name: string; designation: string;
    qualifications?: string; metadata?: any;
  }) {
    const staffIdCard = `STF-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return this.prisma.staff.create({
      data: {
        tenant_id: tenantId,
        user_id: crypto.randomUUID(),
        staff_id_card: staffIdCard,
        first_name: data.first_name,
        last_name: data.last_name,
        designation: data.designation,
        qualifications: data.qualifications || null,
        metadata: data.metadata || {},
      },
    });
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private buildSearchWhere(baseWhere: any, search?: string): any {
    if (!search) return baseWhere;
    return {
      ...baseWhere,
      OR: [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
      ],
    };
  }
}
