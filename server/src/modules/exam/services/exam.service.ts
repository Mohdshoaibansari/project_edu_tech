import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { ConfigurationEngine } from '@engines/config/configuration-engine.service';
import { RulesEngine } from '@engines/rules/rules-engine.service';
import { EventBus } from '@core/event-bus/event-bus.service';

@Injectable()
export class ExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configEngine: ConfigurationEngine,
    private readonly rulesEngine: RulesEngine,
    private readonly eventBus: EventBus,
  ) {}

  async createExam(tenantId: string, data: {
    title: string; type_code: string; class_id: string; subject_id?: string;
    academic_term_id?: string; date: string; max_score: number; pass_score?: number; description?: string;
  }) {
    const types = await this.configEngine.getAssessmentTypes(tenantId);
    if (!types.find((t: any) => t.code === data.type_code)) {
      throw new BadRequestException(`Invalid exam type: ${data.type_code}`);
    }
    return this.prisma.exam.create({ data: { tenant_id: tenantId, ...data, date: new Date(data.date) } });
  }

  async getExams(tenantId: string, filters?: { class_id?: string; academic_term_id?: string; type_code?: string; page?: number; pageSize?: number }) {
    const where: any = { tenant_id: tenantId };
    if (filters?.class_id) where.class_id = filters.class_id;
    if (filters?.academic_term_id) where.academic_term_id = filters.academic_term_id;
    if (filters?.type_code) where.type_code = filters.type_code;
    const page = filters?.page || 1; const pageSize = Math.min(filters?.pageSize || 20, 100);
    const [exams, total] = await Promise.all([
      this.prisma.exam.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { date: 'desc' } }),
      this.prisma.exam.count({ where }),
    ]);
    return { data: exams, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async enterScores(tenantId: string, examId: string, scores: { student_id: string; score: number; is_absent?: boolean; remarks?: string }[]) {
    const exam = await this.prisma.exam.findFirst({ where: { id: examId, tenant_id: tenantId } });
    if (!exam) throw new NotFoundException('Exam not found');

    const results = [];
    for (const s of scores) {
      // Use RulesEngine to convert score to grade
      let grade: string | null = null;
      let gradePoint: number | null = null;
      try {
        const result = await this.rulesEngine.evaluate<{ grade: string; grade_point: number }>(
          tenantId, 'grading.convert_score', { score: s.score, max_score: Number(exam.max_score) },
        );
        if (result) { grade = result.grade || null; gradePoint = result.grade_point || null; }
      } catch { /* grading rules optional */ }

      const score = await this.prisma.examScore.upsert({
        where: { exam_id_student_id: { exam_id: examId, student_id: s.student_id } },
        create: { tenant_id: tenantId, exam_id: examId, student_id: s.student_id, score: s.score, grade, grade_point: gradePoint, is_absent: s.is_absent || false, remarks: s.remarks || null },
        update: { score: s.score, grade, grade_point: gradePoint, is_absent: s.is_absent || false, remarks: s.remarks || null },
      });
      results.push(score);
      this.eventBus.emit('exam.score_entered', { tenantId, examId, studentId: s.student_id });
    }
    return results;
  }

  async getExamScores(tenantId: string, examId: string) {
    return this.prisma.examScore.findMany({ where: { tenant_id: tenantId, exam_id: examId }, orderBy: { student_id: 'asc' } });
  }

  async getClassStatistics(tenantId: string, examId: string) {
    const scores = await this.getExamScores(tenantId, examId);
    const numericScores = scores.filter((s) => !s.is_absent).map((s) => Number(s.score));
    numericScores.sort((a, b) => a - b);
    const total = scores.length;
    const present = numericScores.length;
    const avg = present > 0 ? numericScores.reduce((a, b) => a + b, 0) / present : 0;
    const median = present > 0 ? numericScores[Math.floor(numericScores.length / 2)] : 0;
    const exam = await this.prisma.exam.findFirst({ where: { id: examId } });
    const passRate = exam?.pass_score && present > 0
      ? (numericScores.filter((s) => s >= Number(exam.pass_score)).length / present) * 100 : 0;
    return { data: { total_students: total, present, absent: total - present, average: Math.round(avg * 100) / 100, median, pass_rate: Math.round(passRate * 100) / 100 } };
  }

  async checkPromotion(tenantId: string, studentId: string) {
    try {
      return await this.rulesEngine.evaluate(tenantId, 'promotion.eligibility', { tenantId, studentId });
    } catch { return { eligible: true, reason: 'No promotion rules configured' }; }
  }

  async convertScoreToGrade(tenantId: string, score: number, maxScore: number) {
    try {
      return await this.rulesEngine.evaluate(tenantId, 'grading.convert_score', { score, max_score: maxScore });
    } catch { return null; }
  }

  async calculateGPA(tenantId: string, subjects: { subject: string; grade_point: number; credit_hours?: number }[]) {
    try {
      return await this.rulesEngine.evaluate(tenantId, 'grading.calculate_gpa', { subjects });
    } catch {
      const total = subjects.reduce((s, c) => s + c.grade_point * (c.credit_hours || 1), 0);
      const weights = subjects.reduce((s, c) => s + (c.credit_hours || 1), 0);
      return weights > 0 ? Math.round((total / weights) * 100) / 100 : 0;
    }
  }
}
