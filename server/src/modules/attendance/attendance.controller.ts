import { Controller, Get, Post, Put, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AttendanceService } from './services/attendance.service';
import { MarkAttendanceDto, AttendanceRateDto, CorrectionRequestDto, CorrectionActionDto } from './dto/attendance.dto';
import { RequirePermission } from '@modules/auth/guards/auth.guards';

@Controller(':tenantId/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('statuses')
  async getStatuses(@Param('tenantId') tenantId: string) {
    return { data: await this.attendanceService.getValidStatuses(tenantId) };
  }

  @Post('mark')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('attendance:mark')
  async markAttendance(@Param('tenantId') tenantId: string, @Body() dto: MarkAttendanceDto) {
    const results = await this.attendanceService.markAttendance(
      tenantId, dto.class_id, dto.date, dto.records,
    );
    return { data: results };
  }

  @Get('students/:studentId')
  @RequirePermission('attendance:view')
  async getStudentAttendance(
    @Param('tenantId') tenantId: string,
    @Param('studentId') studentId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.attendanceService.getStudentAttendance(
      tenantId, studentId, from, to,
      page ? parseInt(page) : 1, pageSize ? parseInt(pageSize) : 50,
    );
  }

  @Get('class/:classId/date/:date')
  @RequirePermission('attendance:view')
  async getClassAttendance(
    @Param('tenantId') tenantId: string,
    @Param('classId') classId: string,
    @Param('date') date: string,
  ) {
    const records = await this.attendanceService.getClassAttendance(tenantId, classId, date);
    return { data: records };
  }

  @Get('calculate-rate')
  @RequirePermission('attendance:view')
  async calculateRate(@Param('tenantId') tenantId: string, @Query() dto: AttendanceRateDto) {
    const rate = await this.attendanceService.calculateAttendanceRate(
      tenantId, dto.student_id, dto.from, dto.to,
    );
    return { data: rate };
  }

  @Post('corrections')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('attendance:correct')
  async requestCorrection(@Param('tenantId') tenantId: string, @Body() dto: CorrectionRequestDto) {
    const result = await this.attendanceService.requestCorrection(
      tenantId, dto.attendance_id, dto.new_status_code, dto.reason,
    );
    return { data: result };
  }

  @Get('corrections')
  @RequirePermission('attendance:correct')
  async getCorrections(@Param('tenantId') tenantId: string, @Query('status') status?: string) {
    const corrections = await this.attendanceService.getCorrections(tenantId, status);
    return { data: corrections };
  }

  @Post('corrections/:correctionId/action')
  @RequirePermission('attendance:correct')
  async actionCorrection(
    @Param('tenantId') tenantId: string,
    @Param('correctionId') correctionId: string,
    @Body() dto: CorrectionActionDto,
  ) {
    const result = await this.attendanceService.actionCorrection(
      correctionId, dto.action, undefined, dto.comment,
    );
    return { data: result };
  }
}
