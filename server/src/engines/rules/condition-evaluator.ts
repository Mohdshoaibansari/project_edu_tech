/**
 * Rules Engine — Condition Evaluator
 *
 * Evaluates JSON-based conditions against a data context.
 * Supports leaf operators (equals, gte, between, in, contains, etc.)
 * and compound operators (AND, OR, NOT).
 */

export type ConditionOperator =
  | 'equals' | 'not_equals'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'between' | 'in' | 'contains'
  | 'matches_regex' | 'is_null' | 'is_not_null'
  | 'always'
  | 'AND' | 'OR' | 'NOT';

export interface LeafCondition {
  field?: string;
  operator: ConditionOperator;
  value?: any;
}

export interface CompoundCondition {
  operator: 'AND' | 'OR';
  conditions: Condition[];
}

export interface NotCondition {
  operator: 'NOT';
  condition: Condition;
}

export type Condition = LeafCondition | CompoundCondition | NotCondition;

/**
 * Recursively evaluates a condition tree against a context object.
 * Uses dot-notation for nested field access (e.g., "student.name").
 */
export class ConditionEvaluator {
  /**
   * Evaluate a condition against a data context.
   */
  evaluate(condition: Condition, context: Record<string, any>): boolean {
    switch (condition.operator) {
      case 'AND':
        return (condition as CompoundCondition).conditions.every((c) => this.evaluate(c, context));
      case 'OR':
        return (condition as CompoundCondition).conditions.some((c) => this.evaluate(c, context));
      case 'NOT':
        return !this.evaluate((condition as NotCondition).condition, context);
      case 'always':
        return true;
      default:
        return this.evaluateLeaf(condition as LeafCondition, context);
    }
  }

  private evaluateLeaf(cond: LeafCondition, context: Record<string, any>): boolean {
    const fieldValue = cond.field ? this.resolveField(cond.field, context) : undefined;

    switch (cond.operator) {
      case 'equals':
        return fieldValue === cond.value;
      case 'not_equals':
        return fieldValue !== cond.value;
      case 'gt':
        return Number(fieldValue) > Number(cond.value);
      case 'gte':
        return Number(fieldValue) >= Number(cond.value);
      case 'lt':
        return Number(fieldValue) < Number(cond.value);
      case 'lte':
        return Number(fieldValue) <= Number(cond.value);
      case 'between': {
        const [min, max] = cond.value as [number, number];
        const num = Number(fieldValue);
        return num >= min && num <= max;
      }
      case 'in':
        return Array.isArray(cond.value) && cond.value.includes(fieldValue);
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(String(cond.value).toLowerCase());
      case 'matches_regex':
        return new RegExp(cond.value).test(String(fieldValue));
      case 'is_null':
        return fieldValue === null || fieldValue === undefined;
      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return false;
    }
  }

  /**
   * Resolve a dot-notated field path from context.
   * e.g., "student.profile.name" → context.student.profile.name
   */
  private resolveField(path: string, context: Record<string, any>): any {
    const parts = path.split('.');
    let current: any = context;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }
}
