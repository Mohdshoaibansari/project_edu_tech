import { Controller, Get, Post, Put, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ExamService } from './services/exam.service';
import { RequirePermission } from '@modules/auth/guards/auth.guards';

@Controller(':tenantId/exams')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post() @HttpCode(HttpStatus.CREATED) @RequirePermission('exam:create')
  async createExam(@Param('tenantId') tid: string, @Body() b: any) { return { data: await this.examService.createExam(tid, b) }; }

  @Get() @RequirePermission('exam:view')
  async getExams(@Param('tenantId') tid: string, @Query('class_id') c?: string, @Query('academic_term_id') t?: string, @Query('type_code') tc?: string, @Query('page') p?: string, @Query('pageSize') ps?: string) {
    return this.examService.getExams(tid, { class_id: c, academic_term_id: t, type_code: tc, page: p ? parseInt(p) : 1, pageSize: ps ? parseInt(ps) : 20 });
  }

  @Put(':examId/scores') @RequirePermission('exam:enter-scores')
  async enterScores(@Param('tenantId') tid: string, @Param('examId') eid: string, @Body() b: { scores: any[] }) { return { data: await this.examService.enterScores(tid, eid, b.scores) }; }

  @Get(':examId/scores') @RequirePermission('exam:view')
  async getScores(@Param('tenantId') tid: string, @Param('examId') eid: string) { return { data: await this.examService.getExamScores(tid, eid) }; }

  @Get(':examId/statistics') @RequirePermission('exam:view')
  async getStatistics(@Param('tenantId') tid: string, @Param('examId') eid: string) { return this.examService.getClassStatistics(tid, eid); }

  @Get('promotion/:studentId') @RequirePermission('exam:view')
  async checkPromotion(@Param('tenantId') tid: string, @Param('studentId') sid: string) { return { data: await this.examService.checkPromotion(tid, sid) }; }

  @Post('convert-score') @RequirePermission('exam:view')
  async convertScore(@Param('tenantId') tid: string, @Body() b: { score: number; max_score: number }) { return { data: await this.examService.convertScoreToGrade(tid, b.score, b.max_score) }; }

  @Post('calculate-gpa') @RequirePermission('exam:view')
  async calculateGPA(@Param('tenantId') tid: string, @Body() b: { subjects: any[] }) { return { data: await this.examService.calculateGPA(tid, b.subjects) }; }
}
