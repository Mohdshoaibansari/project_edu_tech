import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RulesEngine } from './rules-engine.service';
import { CreateRuleSetDto, AddRuleDto, UpdateRuleDto, TestRuleDto, EvaluateDto } from './dto/rules.dto';

@Controller(':tenantId/rules')
export class RulesController {
  constructor(private readonly rulesEngine: RulesEngine) {}

  // ==========================================================================
  // Rule Sets
  // ==========================================================================

  @Get()
  async listRuleSets(@Param('tenantId') tenantId: string) {
    const ruleSets = await this.rulesEngine.getRuleSets(tenantId);
    return { data: ruleSets };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRuleSet(@Param('tenantId') tenantId: string, @Body() dto: CreateRuleSetDto) {
    const ruleSet = await this.rulesEngine.createRuleSet(tenantId, dto);
    return { data: ruleSet };
  }

  @Get(':code')
  async getRuleSet(@Param('tenantId') tenantId: string, @Param('code') code: string) {
    const ruleSet = await this.rulesEngine.getRuleSet(tenantId, code);
    if (!ruleSet) throw new Error(`Rule set "${code}" not found`);
    return { data: ruleSet };
  }

  @Put(':code')
  async updateRuleSet(
    @Param('tenantId') tenantId: string,
    @Param('code') code: string,
    @Body() dto: { name?: string; description?: string; is_active?: boolean },
  ) {
    const ruleSet = await this.rulesEngine.getRuleSet(tenantId, code);
    if (!ruleSet) throw new Error(`Rule set "${code}" not found`);
    const updated = await this.rulesEngine.updateRuleSet(ruleSet.id, dto);
    return { data: updated };
  }

  // ==========================================================================
  // Rules (within a Rule Set)
  // ==========================================================================

  @Post(':code/rules')
  @HttpCode(HttpStatus.CREATED)
  async addRule(
    @Param('tenantId') tenantId: string,
    @Param('code') code: string,
    @Body() dto: AddRuleDto,
  ) {
    const ruleSet = await this.rulesEngine.getRuleSet(tenantId, code);
    if (!ruleSet) throw new Error(`Rule set "${code}" not found`);
    const rule = await this.rulesEngine.addRule(ruleSet.id, dto);
    return { data: rule };
  }

  @Put(':code/rules/:ruleId')
  async updateRule(
    @Param('tenantId') tenantId: string,
    @Param('code') code: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateRuleDto,
  ) {
    const updated = await this.rulesEngine.updateRule(ruleId, dto);
    return { data: updated };
  }

  @Delete(':code/rules/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(
    @Param('tenantId') tenantId: string,
    @Param('code') code: string,
    @Param('ruleId') ruleId: string,
  ) {
    await this.rulesEngine.deleteRule(ruleId);
  }

  // ==========================================================================
  // Evaluation
  // ==========================================================================

  @Post(':code/evaluate')
  async evaluateRules(
    @Param('tenantId') tenantId: string,
    @Param('code') code: string,
    @Body() dto: EvaluateDto,
  ) {
    const result = await this.rulesEngine.evaluate(tenantId, code, dto.context, dto.mode ?? 'first_match');
    return { data: result };
  }

  @Post(':code/test')
  async testRule(
    @Param('tenantId') tenantId: string,
    @Param('code') code: string,
    @Body() dto: TestRuleDto,
  ) {
    const result = this.rulesEngine.testRule(dto.condition, dto.action, dto.context);
    return { data: result };
  }
}
