import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { ConfigurationEngine } from '@engines/config/configuration-engine.service';
import { RulesEngine } from '@engines/rules/rules-engine.service';
import { EventBus } from '@core/event-bus/event-bus.service';

/**
 * Homework lifecycle: DRAFT → SCHEDULED → PUBLISHED → ARCHIVED
 */
const HOMEWORK_STATES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const;

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configEngine: ConfigurationEngine,
    private readonly rulesEngine: RulesEngine,
    private readonly eventBus: EventBus,
  ) {}

  // ==========================================================================
  // Homework CRUD
  // ==========================================================================

  async createHomework(tenantId: string, teacherId: string, data: {
    title: string; description?: string; category_code: string;
    class_id: string; subject_id: string; due_date?: string; max_score?: number;
  }) {
    // Validate category against tenant's configured categories
    const categories = await this.configEngine.getHomeworkCategories(tenantId);
    if (!categories.find((c: any) => c.code === data.category_code)) {
      throw new Error(`Invalid homework category: ${data.category_code}`);
    }

    const homework = await this.prisma.homework.create({
      data: {
        tenant_id: tenantId,
        title: data.title,
        description: data.description || null,
        category_code: data.category_code,
        class_id: data.class_id,
        subject_id: data.subject_id,
        teacher_id: teacherId,
        due_date: data.due_date ? new Date(data.due_date) : null,
        max_score: data.max_score ? parseFloat(String(data.max_score)) : null,
        status: 'DRAFT',
      },
    });

    return homework;
  }

  async getHomework(tenantId: string, filters?: {
    class_id?: string; subject_id?: string; status?: string; page?: number; pageSize?: number;
  }) {
    const where: any = { tenant_id: tenantId };
    if (filters?.class_id) where.class_id = filters.class_id;
    if (filters?.subject_id) where.subject_id = filters.subject_id;
    if (filters?.status) where.status = filters.status;

    const page = filters?.page || 1;
    const pageSize = Math.min(filters?.pageSize || 20, 100);

    const [homework, total] = await Promise.all([
      this.prisma.homework.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: { submissions: { select: { id: true, student_id: true, status: true, score: true, grade: true } } },
      }),
      this.prisma.homework.count({ where }),
    ]);

    return {
      data: homework,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getHomeworkById(tenantId: string, homeworkId: string) {
    const homework = await this.prisma.homework.findFirst({
      where: { id: homeworkId, tenant_id: tenantId },
      include: { submissions: true },
    });
    if (!homework) throw new Error('Homework not found');
    return homework;
  }

  async updateHomeworkStatus(tenantId: string, homeworkId: string, status: string) {
    if (!HOMEWORK_STATES.includes(status as any)) {
      throw new Error(`Invalid status: ${status}. Valid: ${HOMEWORK_STATES.join(', ')}`);
    }

    const homework = await this.prisma.homework.update({
      where: { id: homeworkId },
      data: { status, updated_at: new Date() },
    });

    if (status === 'PUBLISHED') {
      this.eventBus.emit('homework.assigned', {
        tenantId,
        homeworkId,
        classId: homework.class_id,
        dueDate: homework.due_date?.toISOString() || '',
      });
    }

    return homework;
  }

  // ==========================================================================
  // Submissions (Student-facing)
  // ==========================================================================

  async submitHomework(tenantId: string, homeworkId: string, studentId: string, submission: {
    content?: string; file_urls?: string[];
  }) {
    // Check homework exists and is published
    const homework = await this.getHomeworkById(tenantId, homeworkId);
    if (homework.status !== 'PUBLISHED') {
      throw new Error('Cannot submit to homework that is not published');
    }

    const result = await this.prisma.homeworkSubmission.upsert({
      where: { homework_id_student_id: { homework_id: homeworkId, student_id: studentId } },
      create: {
        tenant_id: tenantId,
        homework_id: homeworkId,
        student_id: studentId,
        content: submission.content || null,
        ...(submission.file_urls && { file_urls: submission.file_urls }),
        status: 'SUBMITTED',
        submitted_at: new Date(),
      },
      update: {
        content: submission.content || null,
        ...(submission.file_urls && { file_urls: submission.file_urls }),
        status: 'SUBMITTED',
        submitted_at: new Date(),
        updated_at: new Date(),
      },
    });

    this.eventBus.emit('homework.submitted', {
      tenantId,
      submissionId: result.id,
      studentId,
    });

    return result;
  }

  // ==========================================================================
  // Grading (Teacher-facing, RulesEngine-driven)
  // ==========================================================================

  async gradeSubmission(tenantId: string, submissionId: string, score: number, feedback?: string) {
    const submission = await this.prisma.homeworkSubmission.findFirst({
      where: { id: submissionId, tenant_id: tenantId },
      include: { homework: true },
    });
    if (!submission) throw new Error('Submission not found');

    // Use RulesEngine to convert score to grade based on tenant's grading scale
    let grade: string | null = null;
    let gradePoint: number | null = null;

    try {
      const gradeResult = await this.rulesEngine.evaluate<{ grade: string; grade_point: number }>(
        tenantId, 'grading.convert_score',
        {
          score,
          max_score: Number(submission.homework.max_score || 100),
        },
      );
      if (gradeResult) {
        grade = gradeResult.grade || null;
        gradePoint = gradeResult.grade_point || null;
      }
    } catch {
      // RulesEngine might not have grading rules for all tenants — use score as-is
      grade = null;
      gradePoint = null;
    }

    const result = await this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        score: parseFloat(String(score)),
        grade,
        grade_point: gradePoint,
        feedback: feedback || null,
        status: 'GRADED',
        updated_at: new Date(),
      },
    });

    this.eventBus.emit('homework.graded', {
      tenantId,
      submissionId,
      score,
      grade: grade || '',
    });

    return result;
  }

  async returnSubmission(tenantId: string, submissionId: string) {
    const result = await this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: { status: 'RETURNED', updated_at: new Date() },
    });
    return result;
  }

  // ==========================================================================
  // Submissions listing
  // ==========================================================================

  async getSubmissions(tenantId: string, homeworkId: string) {
    return this.prisma.homeworkSubmission.findMany({
      where: { tenant_id: tenantId, homework_id: homeworkId },
      orderBy: { submitted_at: 'asc' },
    });
  }

  async getStudentSubmissions(tenantId: string, studentId: string, status?: string) {
    return this.prisma.homeworkSubmission.findMany({
      where: {
        tenant_id: tenantId,
        student_id: studentId,
        ...(status && { status }),
      },
      include: { homework: true },
      orderBy: { created_at: 'desc' },
    });
  }

  // ==========================================================================
  // AI Homework Generator (Stub)
  // ==========================================================================

  async aiGenerateHomework(tenantId: string, params: {
    subject_id: string; grade_level: string; topic?: string; count?: number;
  }) {
    // Stub — real AI integration in Phase 3
    const questions = [
      { question: `Define key concepts related to ${params.topic || 'this topic'}.`, type: 'short_answer', marks: 5 },
      { question: `Explain the main principles of ${params.topic || 'the subject'} with examples.`, type: 'long_answer', marks: 10 },
      { question: `Multiple choice question about ${params.topic || 'the topic'}.`, type: 'mcq', options: ['A', 'B', 'C', 'D'], marks: 1 },
      { question: `Solve a problem related to ${params.topic || 'the topic'}.`, type: 'problem', marks: 5 },
    ];

    const count = params.count || 4;
    return {
      data: questions.slice(0, count),
      meta: { generated_by: 'stub', model: 'none', timestamp: new Date().toISOString() },
    };
  }
}
