import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { ConditionEvaluator, Condition } from './condition-evaluator';
import { FormulaEvaluator } from './formula-evaluator';

/**
 * Action execution result from a matched rule.
 */
export interface RuleActionResult {
  type: string;
  result: any;
  ruleName: string;
}

/**
 * Rules Engine — lightweight JSON-based rule evaluation.
 *
 * Features:
 *  - Condition evaluation (AND/OR/NOT, comparisons, ranges, regex, null checks)
 *  - Action execution (assign_grade, calculate_formula, set_field, set_risk_flag, etc.)
 *  - Formula evaluation (SUM, AVG, WEIGHTED_AVG, ROUND, IF, COALESCE)
 *  - First-match and all-matches evaluation modes
 *  - Rule set CRUD (create, read, update, activate/deactivate)
 */
@Injectable()
export class RulesEngine {
  private conditionEvaluator = new ConditionEvaluator();
  private formulaEvaluator = new FormulaEvaluator();

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // PUBLIC API — Rule Evaluation
  // ==========================================================================

  /**
   * Evaluate rules in a rule set against a context.
   *
   * @param tenantId  - Tenant ID
   * @param ruleSetCode - Rule set code (e.g., 'grading.convert_score')
   * @param context   - Data context to evaluate against
   * @param mode      - 'first_match' returns first matching rule, 'all_matches' returns all
   */
  async evaluate<T = any>(
    tenantId: string,
    ruleSetCode: string,
    context: Record<string, any>,
    mode: 'first_match' | 'all_matches' = 'first_match',
  ): Promise<T> {
    const ruleSet = await this.prisma.ruleSet.findFirst({
      where: { tenant_id: tenantId, code: ruleSetCode, is_active: true },
      orderBy: { version: 'desc' },
      include: {
        rules: {
          where: { is_active: true },
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!ruleSet) {
      throw new Error(`Rule set "${ruleSetCode}" not found for tenant ${tenantId}`);
    }

    const results: RuleActionResult[] = [];
    let finalContext = { ...context };

    for (const rule of ruleSet.rules) {
      const condition = rule.condition as Condition | null;

      // Rule with no condition always matches (catch-all)
      const matches = !condition || this.conditionEvaluator.evaluate(condition, finalContext);

      if (matches) {
        const action = rule.action as Record<string, any> | null;
        const actionResult = await this.executeAction(action, finalContext);
        results.push({
          type: action?.type ?? 'unknown',
          result: actionResult,
          ruleName: rule.name,
        });

        // Update context with any mutations (set_field)
        if (actionResult?.contextUpdates) {
          finalContext = { ...finalContext, ...actionResult.contextUpdates };
        }

        if (mode === 'first_match') {
          return (actionResult?.value ?? actionResult) as T;
        }
      }
    }

    // For all_matches, return the combined results
    if (mode === 'all_matches') {
      return results as unknown as T;
    }

    // No rule matched
    return null as unknown as T;
  }

  /**
   * Test a single rule against a context without persisting anything.
   */
  testRule(condition: Condition | null, action: any, context: Record<string, any>): { matched: boolean; result?: any } {
    if (!condition || this.conditionEvaluator.evaluate(condition, context)) {
      return { matched: true, result: action };
    }
    return { matched: false };
  }

  // ==========================================================================
  // PUBLIC API — Rule Set CRUD
  // ==========================================================================

  async getRuleSets(tenantId: string) {
    return this.prisma.ruleSet.findMany({
      where: { tenant_id: tenantId },
      include: { rules: { orderBy: { priority: 'asc' } } },
      orderBy: { code: 'asc' },
    });
  }

  async getRuleSet(tenantId: string, code: string) {
    return this.prisma.ruleSet.findFirst({
      where: { tenant_id: tenantId, code, is_active: true },
      orderBy: { version: 'desc' },
      include: { rules: { where: { is_active: true }, orderBy: { priority: 'asc' } } },
    });
  }

  async createRuleSet(tenantId: string, data: { code: string; name: string; description?: string }) {
    return this.prisma.ruleSet.create({
      data: { tenant_id: tenantId, ...data },
    });
  }

  async updateRuleSet(ruleSetId: string, data: { name?: string; description?: string; is_active?: boolean }) {
    return this.prisma.ruleSet.update({ where: { id: ruleSetId }, data });
  }

  async addRule(
    ruleSetId: string,
    data: { priority: number; name: string; description?: string; condition?: any; action: any },
  ) {
    return this.prisma.rule.create({
      data: { rule_set_id: ruleSetId, ...data },
    });
  }

  async updateRule(ruleId: string, data: { priority?: number; name?: string; condition?: any; action?: any; is_active?: boolean }) {
    return this.prisma.rule.update({ where: { id: ruleId }, data });
  }

  async deleteRule(ruleId: string) {
    return this.prisma.rule.update({ where: { id: ruleId }, data: { is_active: false } });
  }

  // ==========================================================================
  // PRIVATE — Action Execution
  // ==========================================================================

  private async executeAction(action: any, context: Record<string, any>): Promise<{ value?: any; contextUpdates?: Record<string, any> }> {
    if (!action) return {};

    const type = action.type;
    const params = action.params || {};

    switch (type) {
      case 'assign_grade':
        return { value: { grade: params.grade ?? params.grade_label, grade_point: params.grade_point, remarks: params.remarks } };

      case 'calculate_formula': {
        const result = this.formulaEvaluator.evaluate(params.formula, context);
        return { value: result };
      }

      case 'compute': {
        const computedValue = this.formulaEvaluator.evaluate(params.formula, context);
        return {
          contextUpdates: { [params.field]: computedValue },
          value: computedValue,
        };
      }

      case 'set_risk_flag':
        return { value: { level: params.level, reason: params.reason, flagged_at: new Date().toISOString() } };

      case 'set_promotion_status':
        return { value: { status: params.status, reason: params.reason } };

      case 'set_field':
        return {
          contextUpdates: { [params.field]: params.value },
          value: params.value,
        };

      case 'notify':
        // Notification is handled by CommunicationContext subscriber
        return { value: { template: params.template, channel: params.channel, triggered: true } };

      case 'lookup':
        // Data source lookup — placeholder (registered resolvers in Phase 1)
        return { value: { source: params.source, data: null } };

      default:
        return { value: action };
    }
  }
}
