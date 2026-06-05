import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigurationEngine } from './configuration-engine.service';
import { SetConfigDto, RollbackConfigDto, SetFromTemplateDto, CreateConfigSchemaDto } from './dto/config.dto';

/**
 * Configuration Engine API — exposes config CRUD with versioning and inheritance.
 *
 * Base path: /api/v1/:tenantId/config
 */
@Controller(':tenantId/config')
export class ConfigController {
  constructor(private readonly configEngine: ConfigurationEngine) {}

  // ==========================================================================
  // Config Schema Registry
  // ==========================================================================

  @Get('schemas')
  async listSchemas() {
    const schemas = await (this.configEngine as any).prisma.configSchema.findMany({
      where: { is_active: true },
      select: { schema_key: true, name: true, description: true, version: true },
    });
    return { data: schemas };
  }

  @Post('schemas')
  @HttpCode(HttpStatus.CREATED)
  async createSchema(@Body() dto: CreateConfigSchemaDto) {
    const prisma = (this.configEngine as any).prisma;
    const schema = await prisma.configSchema.create({
      data: {
        schema_key: dto.schema_key,
        name: dto.name,
        description: dto.description,
        json_schema: dto.json_schema,
        ui_schema: dto.ui_schema || null,
      },
    });
    await this.configEngine.refreshValidators();
    return { data: schema };
  }

  // ==========================================================================
  // Tenant Config CRUD
  // ==========================================================================

  @Get(':schemaKey')
  async getConfig(@Param('tenantId') tenantId: string, @Param('schemaKey') schemaKey: string) {
    const value = await this.configEngine.get(tenantId, schemaKey);
    return { data: value };
  }

  @Get()
  async getAllConfigs(@Param('tenantId') tenantId: string) {
    const value = await this.configEngine.getAll(tenantId);
    return { data: value };
  }

  @Put(':schemaKey')
  async setConfig(
    @Param('tenantId') tenantId: string,
    @Param('schemaKey') schemaKey: string,
    @Body() dto: SetConfigDto,
  ) {
    const config = await this.configEngine.set(tenantId, schemaKey, dto.value);
    return { data: config };
  }

  // ==========================================================================
  // Version History & Rollback
  // ==========================================================================

  @Get(':schemaKey/history')
  async getHistory(@Param('tenantId') tenantId: string, @Param('schemaKey') schemaKey: string) {
    const versions = await this.configEngine.getHistory(tenantId, schemaKey);
    return { data: versions };
  }

  @Post(':schemaKey/rollback')
  async rollback(
    @Param('tenantId') tenantId: string,
    @Param('schemaKey') schemaKey: string,
    @Body() dto: RollbackConfigDto,
  ) {
    const config = await this.configEngine.rollback(tenantId, schemaKey, dto.version);
    return { data: config };
  }

  // ==========================================================================
  // Template Operations
  // ==========================================================================

  @Get('templates/list')
  async getTemplates(@Query('schema_key') schemaKey?: string) {
    const templates = await this.configEngine.getTemplates(schemaKey);
    return { data: templates };
  }

  @Post(':schemaKey/from-template')
  async setFromTemplate(
    @Param('tenantId') tenantId: string,
    @Param('schemaKey') schemaKey: string,
    @Body() dto: SetFromTemplateDto,
  ) {
    const config = await this.configEngine.setFromTemplate(
      tenantId,
      schemaKey,
      dto.template_id,
      dto.overrides,
    );
    return { data: config };
  }

  // ==========================================================================
  // Convenience Endpoints — Typed accessors
  // ==========================================================================

  @Get('convenience/attendance-statuses')
  async getAttendanceStatuses(@Param('tenantId') tenantId: string) {
    const statuses = await this.configEngine.getAttendanceStatuses(tenantId);
    return { data: statuses };
  }

  @Get('convenience/grading-scale')
  async getGradingScale(@Param('tenantId') tenantId: string) {
    const scale = await this.configEngine.getGradingScale(tenantId);
    return { data: scale };
  }

  @Get('convenience/academic-calendar')
  async getAcademicCalendar(@Param('tenantId') tenantId: string) {
    const calendar = await this.configEngine.getAcademicCalendar(tenantId);
    return { data: calendar };
  }

  @Get('convenience/leave-types')
  async getLeaveTypes(@Param('tenantId') tenantId: string) {
    const types = await this.configEngine.getLeaveTypes(tenantId);
    return { data: types };
  }

  @Get('convenience/assessment-types')
  async getAssessmentTypes(@Param('tenantId') tenantId: string) {
    const types = await this.configEngine.getAssessmentTypes(tenantId);
    return { data: types };
  }

  @Get('convenience/notification-types')
  async getNotificationTypes(@Param('tenantId') tenantId: string) {
    const types = await this.configEngine.getNotificationTypes(tenantId);
    return { data: types };
  }

  @Get('convenience/homework-categories')
  async getHomeworkCategories(@Param('tenantId') tenantId: string) {
    const categories = await this.configEngine.getHomeworkCategories(tenantId);
    return { data: categories };
  }
}
