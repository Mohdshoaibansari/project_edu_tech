import {
  Controller, Get, Post, Param, Query, Body, HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { AcademicStructureService } from './academic-structure.service';
import { RequirePermission } from '@modules/auth/guards/auth.guards';

@Controller(':tenantId/academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicStructureService) {}

  @Get('grades')
  async getGrades(@Param('tenantId') tenantId: string) {
    return { data: await this.academicService.getGrades(tenantId) };
  }

  @Post('grades')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('subject:manage')
  async createGrade(@Param('tenantId') tenantId: string, @Body() body: any) {
    return { data: await this.academicService.createGrade(tenantId, body) };
  }

  @Get('sections')
  async getSections(@Param('tenantId') tenantId: string, @Query('grade_id') gradeId?: string) {
    return { data: await this.academicService.getSections(tenantId, gradeId) };
  }

  @Post('sections')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('subject:manage')
  async createSection(@Param('tenantId') tenantId: string, @Body() body: any) {
    return { data: await this.academicService.createSection(tenantId, body) };
  }

  @Get('subjects')
  async getSubjects(@Param('tenantId') tenantId: string) {
    return { data: await this.academicService.getSubjects(tenantId) };
  }

  @Post('subjects')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('subject:manage')
  async createSubject(@Param('tenantId') tenantId: string, @Body() body: any) {
    return { data: await this.academicService.createSubject(tenantId, body) };
  }

  @Get('classes')
  async getClasses(
    @Param('tenantId') tenantId: string,
    @Query('grade_id') gradeId?: string,
    @Query('section_id') sectionId?: string,
    @Query('teacher_id') teacherId?: string,
  ) {
    return { data: await this.academicService.getClasses(tenantId, { grade_id: gradeId, section_id: sectionId, teacher_id: teacherId }) };
  }

  @Post('classes')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('subject:manage')
  async assignClass(@Param('tenantId') tenantId: string, @Body() body: any) {
    return { data: await this.academicService.assignClass(tenantId, body) };
  }

  @Get('students')
  async getStudents(
    @Param('tenantId') tenantId: string,
    @Query('grade_level') gradeLevel?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.academicService.getStudents(tenantId, {
      grade_level: gradeLevel,
      search,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }

  @Get('students/:studentId')
  async getStudent(@Param('tenantId') tenantId: string, @Param('studentId') studentId: string) {
    const student = await this.academicService.getStudent(tenantId, studentId);
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    return { data: student };
  }

  @Post('students')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('student:manage')
  async enrollStudent(@Param('tenantId') tenantId: string, @Body() body: any) {
    return {
      data: await this.academicService.enrollStudent(tenantId, body),
    };
  }

  @Get('staff')
  async getStaff(
    @Param('tenantId') tenantId: string,
    @Query('designation') designation?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.academicService.getStaff(tenantId, {
      designation,
      search,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }

  @Post('staff')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('student:manage')
  async addStaff(@Param('tenantId') tenantId: string, @Body() body: any) {
    return { data: await this.academicService.addStaff(tenantId, body) };
  }
}
