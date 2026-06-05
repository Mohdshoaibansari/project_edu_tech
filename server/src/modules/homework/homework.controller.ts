import { Controller, Get, Post, Put, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { HomeworkService } from './services/homework.service';
import { CreateHomeworkDto, SubmitHomeworkDto, GradeHomeworkDto } from './dto/homework.dto';
import { RequirePermission } from '@modules/auth/guards/auth.guards';

@Controller(':tenantId/homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('homework:create')
  async createHomework(@Param('tenantId') tenantId: string, @Body() dto: CreateHomeworkDto) {
    const result = await this.homeworkService.createHomework(tenantId, 'teacher-1', dto);
    return { data: result };
  }

  @Get()
  @RequirePermission('homework:view')
  async listHomework(
    @Param('tenantId') tenantId: string,
    @Query('class_id') classId?: string,
    @Query('subject_id') subjectId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.homeworkService.getHomework(tenantId, {
      class_id: classId, subject_id: subjectId, status,
      page: page ? parseInt(page) : 1, pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }

  @Get(':homeworkId')
  @RequirePermission('homework:view')
  async getHomework(@Param('tenantId') tenantId: string, @Param('homeworkId') homeworkId: string) {
    const hw = await this.homeworkService.getHomeworkById(tenantId, homeworkId);
    return { data: hw };
  }

  @Put(':homeworkId/status')
  @RequirePermission('homework:edit')
  async updateStatus(
    @Param('tenantId') tenantId: string,
    @Param('homeworkId') homeworkId: string,
    @Body('status') status: string,
  ) {
    const result = await this.homeworkService.updateHomeworkStatus(tenantId, homeworkId, status);
    return { data: result };
  }

  @Post(':homeworkId/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('homework:submit')
  async submitHomework(
    @Param('tenantId') tenantId: string,
    @Param('homeworkId') homeworkId: string,
    @Body() dto: SubmitHomeworkDto,
  ) {
    const result = await this.homeworkService.submitHomework(tenantId, homeworkId, 'student-1', dto);
    return { data: result };
  }

  @Get(':homeworkId/submissions')
  @RequirePermission('homework:view')
  async getSubmissions(@Param('tenantId') tenantId: string, @Param('homeworkId') homeworkId: string) {
    const submissions = await this.homeworkService.getSubmissions(tenantId, homeworkId);
    return { data: submissions };
  }

  @Put('submissions/:submissionId/grade')
  @RequirePermission('homework:grade')
  async gradeSubmission(
    @Param('tenantId') tenantId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeHomeworkDto,
  ) {
    const result = await this.homeworkService.gradeSubmission(tenantId, submissionId, dto.score, dto.feedback);
    return { data: result };
  }

  @Put('submissions/:submissionId/return')
  @RequirePermission('homework:grade')
  async returnSubmission(@Param('tenantId') tenantId: string, @Param('submissionId') submissionId: string) {
    const result = await this.homeworkService.returnSubmission(tenantId, submissionId);
    return { data: result };
  }

  @Post('ai-generate')
  @RequirePermission('homework:ai-generate')
  async aiGenerate(
    @Param('tenantId') tenantId: string,
    @Body() params: { subject_id: string; grade_level: string; topic?: string; count?: number },
  ) {
    return this.homeworkService.aiGenerateHomework(tenantId, params);
  }
}
