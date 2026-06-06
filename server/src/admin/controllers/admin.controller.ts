import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Render,
  Redirect,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminService } from '../services/admin.service';
import { JwtTokenService } from '@modules/auth/jwt-token.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtTokenService,
  ) {}

  // ==========================================================================
  // Authentication
  // ==========================================================================

  @Get('login')
  @Render('login')
  loginForm(@Query('error') error: string) {
    return { title: 'Admin Login', error: error || null };
  }

  @Post('login')
  async loginSubmit(
    @Body() body: { email: string; password: string },
    @Res() res: Response,
  ) {
    try {
      const { tokens } = await this.jwtService.login(body.email, body.password);
      res.cookie('admin_token', tokens.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      return res.redirect('/admin');
    } catch (e: any) {
      return res.redirect(`/admin/login?error=${encodeURIComponent(e.message || 'Login failed')}`);
    }
  }

  @Get('logout')
  logout(@Res() res: Response) {
    res.clearCookie('admin_token');
    return res.redirect('/admin/login');
  }

  // ==========================================================================
  // Dashboard
  // ==========================================================================

  @Get()
  @Render('dashboard')
  async dashboard(@Query('tenant_id') tenantId: string) {
    const tenants = await this.adminService.getTenants();
    const activeTenantId = tenantId || tenants[0]?.id;
    return {
      title: 'EduTech Admin',
      tenants: tenants.map((t) => ({ ...t, selected: t.id === activeTenantId })),
      activeTenant: tenants.find((t) => t.id === activeTenantId) || tenants[0],
      activeTenantId,
      message: 'Phase 0 — Engine Foundation',
    };
  }

  // ==========================================================================
  // Attendance Statuses Editor
  // ==========================================================================

  @Get('attendance-statuses')
  @Render('attendance-statuses')
  async attendanceStatuses(@Query('tenant_id') tenantId: string) {
    const tenants = await this.adminService.getTenants();
    const activeTenantId = tenantId || tenants[0]?.id;
    const statuses = activeTenantId ? await this.adminService.getAttendanceStatuses(activeTenantId) : [];
    return {
      title: 'Attendance Statuses',
      tenants: tenants.map((t) => ({ ...t, selected: t.id === activeTenantId })),
      activeTenant: tenants.find((t) => t.id === activeTenantId) || tenants[0],
      activeTenantId,
      statuses,
      success: null,
      error: null,
    };
  }

  @Post('attendance-statuses')
  @Render('attendance-statuses')
  async saveAttendanceStatus(
    @Query('tenant_id') tenantId: string,
    @Body() body: any,
  ) {
    const tenants = await this.adminService.getTenants();
    try {
      if (body.action === 'delete') {
        await this.adminService.deleteAttendanceStatus(body.id);
      } else {
        await this.adminService.saveAttendanceStatus(tenantId, {
          id: body.id || undefined,
          code: body.code,
          label_en: body.label_en,
          label_hi: body.label_hi || undefined,
          color: body.color || '#10B981',
          icon: body.icon || undefined,
          weight: body.weight || '1.0',
          is_present: body.is_present === 'true' || body.is_present === 'on',
          is_default: body.is_default === 'true' || body.is_default === 'on',
          sort_order: body.sort_order || '0',
        });
      }
      const statuses = await this.adminService.getAttendanceStatuses(tenantId);
      return {
        title: 'Attendance Statuses',
        tenants: tenants.map((t) => ({ ...t, selected: t.id === tenantId })),
        activeTenant: tenants.find((t) => t.id === tenantId),
        activeTenantId: tenantId,
        statuses,
        success: 'Status saved successfully',
        error: null,
      };
    } catch (e: any) {
      const statuses = await this.adminService.getAttendanceStatuses(tenantId);
      return {
        title: 'Attendance Statuses',
        tenants: tenants.map((t) => ({ ...t, selected: t.id === tenantId })),
        activeTenant: tenants.find((t) => t.id === tenantId),
        activeTenantId: tenantId,
        statuses,
        success: null,
        error: e.message,
      };
    }
  }

  // ==========================================================================
  // Grading Scale Editor
  // ==========================================================================

  @Get('grading-scale')
  @Render('grading-scale')
  async gradingScale(@Query('tenant_id') tenantId: string) {
    const tenants = await this.adminService.getTenants();
    const activeTenantId = tenantId || tenants[0]?.id;
    const scale = activeTenantId ? await this.adminService.getGradingScale(activeTenantId) : null;
    return {
      title: 'Grading Scale',
      tenants: tenants.map((t) => ({ ...t, selected: t.id === activeTenantId })),
      activeTenant: tenants.find((t) => t.id === activeTenantId) || tenants[0],
      activeTenantId,
      scale,
      scaleJson: JSON.stringify(scale || {}),
      scaleType: scale?.type || null,
      isGradeBands: scale?.type === 'grade_bands',
      isPercentage: scale?.type === 'percentage',
      isGpa: scale?.type === 'gpa',
      bandsJson: scale?.bands ? JSON.stringify(scale.bands, null, 2) : '[]',
      success: null,
      error: null,
    };
  }

  @Post('grading-scale')
  @Render('grading-scale')
  async saveGradingScale(
    @Query('tenant_id') tenantId: string,
    @Body() body: any,
  ) {
    const tenants = await this.adminService.getTenants();
    try {
      const value = JSON.parse(body.config_json);
      await this.adminService.saveGradingScale(tenantId, value);
      const scale = await this.adminService.getGradingScale(tenantId);
      return {
        title: 'Grading Scale',
        tenants: tenants.map((t) => ({ ...t, selected: t.id === tenantId })),
        activeTenant: tenants.find((t) => t.id === tenantId),
        activeTenantId: tenantId,
        scale,
        scaleType: scale?.type || null,
        isGradeBands: scale?.type === 'grade_bands',
        isPercentage: scale?.type === 'percentage',
        isGpa: scale?.type === 'gpa',
        bandsJson: scale?.bands ? JSON.stringify(scale.bands, null, 2) : '[]',
        scaleJson: JSON.stringify(scale || {}),
        success: 'Grading scale saved successfully',
        error: null,
        configJson: body.config_json,
      };
    } catch (e: any) {
      const scale = await this.adminService.getGradingScale(tenantId);
      return {
        title: 'Grading Scale',
        tenants: tenants.map((t) => ({ ...t, selected: t.id === tenantId })),
        activeTenant: tenants.find((t) => t.id === tenantId),
        activeTenantId: tenantId,
        scale,
        scaleType: scale?.type || null,
        isGradeBands: scale?.type === 'grade_bands',
        isPercentage: scale?.type === 'percentage',
        isGpa: scale?.type === 'gpa',
        bandsJson: scale?.bands ? JSON.stringify(scale.bands, null, 2) : '[]',
        scaleJson: JSON.stringify(scale || {}),
        success: null,
        error: e.message,
        configJson: body.config_json,
      };
    }
  }

  // ==========================================================================
  // Academic Calendar Editor
  // ==========================================================================

  @Get('academic-calendar')
  @Render('academic-calendar')
  async academicCalendar(@Query('tenant_id') tenantId: string) {
    const tenants = await this.adminService.getTenants();
    const activeTenantId = tenantId || tenants[0]?.id;
    const years = activeTenantId ? await this.adminService.getAcademicYears(activeTenantId) : [];
    return {
      title: 'Academic Calendar',
      tenants: tenants.map((t) => ({ ...t, selected: t.id === activeTenantId })),
      activeTenant: tenants.find((t) => t.id === activeTenantId) || tenants[0],
      activeTenantId,
      years,
      success: null,
      error: null,
    };
  }

  @Post('academic-calendar/year')
  @Redirect('/admin/academic-calendar')
  async saveAcademicYear(
    @Query('tenant_id') tenantId: string,
    @Body() body: any,
  ) {
    await this.adminService.saveAcademicYear(tenantId, {
      name: body.name,
      start_date: body.start_date,
      end_date: body.end_date,
    });
    return { url: `/admin/academic-calendar?tenant_id=${tenantId}` };
  }

  @Post('academic-calendar/term')
  async saveAcademicTerm(
    @Query('tenant_id') tenantId: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    await this.adminService.saveAcademicTerm(body.year_id, {
      code: body.code,
      name: body.name,
      start_date: body.start_date,
      end_date: body.end_date,
      term_type: body.term_type,
      sort_order: body.sort_order,
    });
    return res.redirect(`/admin/academic-calendar?tenant_id=${tenantId}`);
  }

  // ==========================================================================
  // Workflow Definitions Viewer
  // ==========================================================================

  @Get('workflows')
  @Render('workflows')
  async workflows(@Query('tenant_id') tenantId: string) {
    const tenants = await this.adminService.getTenants();
    const activeTenantId = tenantId || tenants[0]?.id;
    const workflows = activeTenantId ? await this.adminService.getWorkflows(activeTenantId) : [];
    // Pre-compute JSON for transition conditions
    const processedWorkflows = workflows.map((wf: any) => ({
      ...wf,
      transitions: (wf.transitions || []).map((t: any) => ({
        ...t,
        conditionsJson: t.conditions ? JSON.stringify(t.conditions) : null,
      })),
    }));
    return {
      title: 'Workflow Definitions',
      tenants: tenants.map((t) => ({ ...t, selected: t.id === activeTenantId })),
      activeTenant: tenants.find((t) => t.id === activeTenantId) || tenants[0],
      activeTenantId,
      workflows: processedWorkflows,
    };
  }

  // ==========================================================================
  // Rule Sets Viewer
  // ==========================================================================

  @Get('rules')
  @Render('rules')
  async rules(@Query('tenant_id') tenantId: string) {
    const tenants = await this.adminService.getTenants();
    const activeTenantId = tenantId || tenants[0]?.id;
    const ruleSets = activeTenantId ? await this.adminService.getRuleSets(activeTenantId) : [];
    // Pre-compute JSON strings and add selected flag for templates
    const processedRuleSets = ruleSets.map((rs: any) => ({
      ...rs,
      rules: (rs.rules || []).map((r: any) => ({
        ...r,
        conditionJson: JSON.stringify(r.condition, null, 2),
        actionJson: JSON.stringify(r.action, null, 2),
      })),
    }));
    return {
      title: 'Rule Sets',
      tenants: tenants.map((t) => ({ ...t, selected: t.id === activeTenantId })),
      activeTenant: tenants.find((t) => t.id === activeTenantId) || tenants[0],
      activeTenantId,
      ruleSets: processedRuleSets,
    };
  }

  // ==========================================================================
  // Seed Templates
  // ==========================================================================

  @Get('seed')
  @Render('seed')
  async seedTemplates(@Query('tenant_id') tenantId: string) {
    const tenants = await this.adminService.getTenants();
    const templates = await this.adminService.getTemplates();
    const activeTenantId = tenantId || tenants[0]?.id;
    return {
      title: 'Seed Templates',
      tenants: tenants.map((t) => ({ ...t, selected: t.id === activeTenantId })),
      activeTenant: tenants.find((t) => t.id === activeTenantId) || tenants[0],
      activeTenantId,
      templates,
      success: null,
      error: null,
    };
  }

  @Post('seed/load')
  @Render('seed')
  async loadTemplate(
    @Query('tenant_id') tenantId: string,
    @Body() body: any,
  ) {
    const tenants = await this.adminService.getTenants();
    const templates = await this.adminService.getTemplates();
    try {
      await this.adminService.loadTemplate(tenantId, body.template_id, body.schema_key);
      return {
        title: 'Seed Templates',
        tenants: tenants.map((t) => ({ ...t, selected: t.id === tenantId })),
        activeTenant: tenants.find((t) => t.id === tenantId),
        activeTenantId: tenantId,
        templates,
        success: 'Template loaded successfully',
        error: null,
      };
    } catch (e: any) {
      return {
        title: 'Seed Templates',
        tenants: tenants.map((t) => ({ ...t, selected: t.id === tenantId })),
        activeTenant: tenants.find((t) => t.id === tenantId),
        activeTenantId: tenantId,
        templates,
        success: null,
        error: e.message,
      };
    }
  }
}
