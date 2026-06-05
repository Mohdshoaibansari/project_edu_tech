import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportingService } from './services/reporting.service';
import { RequirePermission } from '@modules/auth/guards/auth.guards';

@Controller(':tenantId/reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('attendance') @RequirePermission('report:view')
  async attendanceReport(@Param('tenantId') tid: string, @Query('class_id') c?: string, @Query('student_id') s?: string, @Query('from') f?: string, @Query('to') t?: string) {
    return this.reportingService.getAttendanceReport(tid, { class_id: c, student_id: s, from: f, to: t });
  }

  @Get('exams') @RequirePermission('report:view')
  async examReport(@Param('tenantId') tid: string, @Query('exam_id') e?: string, @Query('class_id') c?: string, @Query('academic_term_id') at?: string) {
    return this.reportingService.getExamReport(tid, { exam_id: e, class_id: c, academic_term_id: at });
  }

  @Get('leaves') @RequirePermission('report:view')
  async leaveReport(@Param('tenantId') tid: string, @Query('student_id') s?: string, @Query('from') f?: string, @Query('to') t?: string) {
    return this.reportingService.getLeaveReport(tid, { student_id: s, from: f, to: t });
  }

  @Get('dashboard') @RequirePermission('report:view')
  async dashboard(@Param('tenantId') tid: string) { return this.reportingService.getDashboard(tid); }
}
