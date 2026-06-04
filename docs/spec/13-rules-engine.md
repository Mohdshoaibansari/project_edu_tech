# 13. Rules Engine Design

> **Status:** Draft — Pre-Implementation  
> **Purpose:** Configurable rule evaluation for grade calculation, attendance aggregation, promotion eligibility, and any school-specific business logic.

---

## 13.1 Problem

Business logic currently lives in hardcoded service methods:

```typescript
// Hardcoded — must change code for every school
if (score >= 90) return 'A+';
if (score >= 80) return 'A';
if (attendanceRate < 75) flagRisk();
if (leaveDays > 15) reject();
```

Every school variation requires modifying code, testing, deploying.

---

## 13.2 Solution: Hybrid Rules Engine

A **lightweight, embeddable rules engine** that:

1. **Stores rules as structured JSON** — not code
2. **Evaluates rules against data contexts** — attendance records, scores, student profiles
3. **Supports complex expressions** — arithmetic, comparisons, lookup tables
4. **Is tenant-isolated** — each tenant has their own rule sets
5. **Is auditable** — rule changes logged, evaluation traces available

**Deliberate choice:** NOT a full BRE (Drools, Camunda DMN). A lightweight JSON-based engine is sufficient for school business rules and avoids operational complexity.

---

## 13.3 Database Design

### Rule Set Definition

```sql
CREATE TABLE rule_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code VARCHAR(200) NOT NULL,                    -- 'grading.convert_score', 'promotion.eligibility'
  name VARCHAR(200) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, code, version)
);
```

### Rule Definition

```sql
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id UUID NOT NULL REFERENCES rule_sets(id),
  priority INTEGER DEFAULT 0,                    -- Lower = evaluated first
  name VARCHAR(200) NOT NULL,
  description TEXT,
  condition JSONB,                               -- When to apply this rule
  action JSONB NOT NULL,                         -- What to do
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 13.4 Rule Expression Language

### Condition Format

```json
{
  "condition": {
    "operator": "AND",
    "conditions": [
      { "field": "subject.is_core", "operator": "equals", "value": true },
      { "field": "score.value", "operator": "gte", "value": 90 }
    ]
  }
}
```

**Supported operators:** `equals, not_equals, gt, gte, lt, lte, between, in, contains, matches_regex, is_null, is_not_null`

### Action Format

```json
{
  "action": {
    "type": "assign_grade",
    "params": {
      "grade_label": "A+",
      "grade_point": 4.0,
      "remarks": "Outstanding"
    }
  }
}
```

**Action types:** `assign_grade, calculate_percentage, set_risk_flag, approve, reject, notify, set_field`

---

## 13.5 Key Rule Sets

### 13.5.1 Grade Conversion Rules

**Scenario:** Convert raw score to school-specific grade.

```json
{
  "rule_set": {
    "code": "grading.convert_score",
    "name": "Convert Score to Grade",
    "rules": [
      {
        "priority": 1,
        "name": "A+ Grade",
        "condition": {
          "operator": "AND",
          "conditions": [
            { "field": "score", "operator": "gte", "value": 90 },
            { "field": "score", "operator": "lte", "value": 100 }
          ]
        },
        "action": {
          "type": "assign_grade",
          "params": { "grade": "A+", "grade_point": 4.0 }
        }
      },
      {
        "priority": 2,
        "name": "A Grade",
        "condition": {
          "operator": "AND",
          "conditions": [
            { "field": "score", "operator": "gte", "value": 80 },
            { "field": "score", "operator": "lt", "value": 90 }
          ]
        },
        "action": {
          "type": "assign_grade",
          "params": { "grade": "A", "grade_point": 3.7 }
        }
      },
      {
        "priority": 99,
        "name": "Default Fail",
        "condition": { "operator": "always" },
        "action": {
          "type": "assign_grade",
          "params": { "grade": "F", "grade_point": 0.0 }
        }
      }
    ]
  }
}
```

**School A (Grade Bands):** Uses grade band rules as above.  
**School B (Percentage):** Single rule: `action: { type: "calculate_percentage", params: { formula: "score / max_score * 100" } }`  
**School C (GPA):** Uses grade_point mapping + credit-weighted formula.

### 13.5.2 Attendance Calculation Rules

```json
{
  "rule_set": {
    "code": "attendance.calculate_rate",
    "name": "Calculate Attendance Percentage",
    "rules": [
      {
        "priority": 1,
        "name": "Weighted Calculation",
        "condition": { "field": "config.mode", "operator": "equals", "value": "daily" },
        "action": {
          "type": "calculate_formula",
          "params": {
            "formula": "SUM(record.weight) / COUNT(records WHERE record.counts_toward_attendance) * 100"
          }
        }
      },
      {
        "priority": 2,
        "name": "Period-Based",
        "condition": { "field": "config.mode", "operator": "equals", "value": "periodic" },
        "action": {
          "type": "calculate_formula",
          "params": {
            "formula": "SUM(period.attended) / SUM(period.total) * 100",
            "group_by": "day"
          }
        }
      }
    ]
  }
}
```

### 13.5.3 Promotion Eligibility Rules

```json
{
  "rule_set": {
    "code": "promotion.eligibility",
    "name": "Student Promotion Eligibility",
    "rules": [
      {
        "priority": 1,
        "name": "Auto-Promote",
        "condition": {
          "operator": "AND",
          "conditions": [
            { "field": "attendance_rate", "operator": "gte", "value": 75 },
            { "field": "overall_grade_point", "operator": "gte", "value": 2.0 },
            { "field": "failed_subjects", "operator": "lte", "value": 0 }
          ]
        },
        "action": { "type": "set_promotion_status", "params": { "status": "PROMOTED" } }
      },
      {
        "priority": 2,
        "name": "Conditional Promotion",
        "condition": {
          "operator": "AND",
          "conditions": [
            { "field": "attendance_rate", "operator": "gte", "value": 75 },
            { "field": "failed_subjects", "operator": "lte", "value": 2 }
          ]
        },
        "action": { "type": "set_promotion_status", "params": { "status": "PROMOTED_WITH_CONDITIONS" } }
      },
      {
        "priority": 99,
        "name": "Detained",
        "condition": { "operator": "always" },
        "action": { "type": "set_promotion_status", "params": { "status": "DETAINED" } }
      }
    ]
  }
}
```

---

## 13.6 Rule Execution Engine

```typescript
@Injectable()
export class RulesEngine {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService
  ) {}
  
  /**
   * Evaluate rules against a data context.
   * Returns the first matching rule's action result, or null.
   */
  async evaluate<T>(
    tenantId: string,
    ruleSetCode: string,
    context: Record<string, any>,
    mode: 'first_match' | 'all_matches' = 'first_match'
  ): Promise<RuleResult<T> | RuleResult<T>[]> {
    // 1. Load active rules for this tenant + rule set
    const rules = await this.loadRules(tenantId, ruleSetCode);
    
    // 2. Sort by priority
    rules.sort((a, b) => a.priority - b.priority);
    
    const results: RuleResult<T>[] = [];
    
    // 3. Evaluate each rule
    for (const rule of rules) {
      const matches = this.evaluateCondition(rule.condition, context);
      
      if (matches) {
        const result = this.executeAction<T>(rule.action, context);
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched: true,
          result
        });
        
        if (mode === 'first_match') {
          return results[0];
        }
      }
    }
    
    if (mode === 'all_matches') return results;
    return null;
  }
  
  private evaluateCondition(condition: ConditionNode, context: any): boolean {
    if (condition.operator === 'always') return true;
    
    if (condition.operator === 'AND') {
      return condition.conditions.every(c => this.evaluateCondition(c, context));
    }
    
    if (condition.operator === 'OR') {
      return condition.conditions.some(c => this.evaluateCondition(c, context));
    }
    
    // Leaf condition
    const fieldValue = this.resolvePath(context, condition.field);
    return this.compare(fieldValue, condition.operator, condition.value);
  }
  
  private executeAction<T>(action: ActionNode, context: any): T {
    switch (action.type) {
      case 'assign_grade':
        return { grade: action.params.grade, grade_point: action.params.grade_point } as T;
      
      case 'calculate_formula':
        return this.compileAndEvaluate(action.params.formula, context) as T;
      
      case 'set_promotion_status':
        return { status: action.params.status } as T;
      
      // ... extensible
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
  
  private resolvePath(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }
  
  private compare(a: any, op: string, b: any): boolean {
    switch (op) {
      case 'equals': return a === b;
      case 'gte': return a >= b;
      case 'gt': return a > b;
      case 'lte': return a <= b;
      case 'lt': return a < b;
      case 'between': return a >= b[0] && a <= b[1];
      case 'in': return Array.isArray(b) && b.includes(a);
      default: return false;
    }
  }
}
```

---

## 13.7 Service Integration Example

```typescript
@Injectable()
export class GradingService {
  constructor(
    private rulesEngine: RulesEngine,
    private configEngine: ConfigurationEngine
  ) {}
  
  async convertScoreToGrade(tenantId: string, score: number, subject: any) {
    const context = {
      score,
      subject: {
        name: subject.name,
        is_core: subject.is_core,
        max_score: subject.max_score
      },
      config: await this.configEngine.get('grading.scale')
    };
    
    const result = await this.rulesEngine.evaluate<GradeResult>(
      tenantId,
      'grading.convert_score',
      context,
      'first_match'
    );
    
    if (!result) throw new Error('No matching grade rule');
    return result.result;
  }
  
  async checkPromotionEligibility(tenantId: string, studentId: string) {
    const studentData = await this.gatherPromotionContext(tenantId, studentId);
    
    const result = await this.rulesEngine.evaluate<PromotionResult>(
      tenantId,
      'promotion.eligibility',
      studentData,
      'first_match'
    );
    
    return result?.result;
  }
}
```

---

## 13.8 Rule Execution Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Service     │     │  Rules       │     │  Rule Store  │     │  Cache       │
│  Layer       │     │  Engine      │     │  (Postgres)  │     │  (Redis)     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ evaluate(tenant,   │                    │                    │
       │  ruleSet, context) │                    │                    │
       │───────────────────▶│                    │                    │
       │                    │                    │                    │
       │                    │ loadRules(tenant,  │                    │
       │                    │  ruleSet)          │                    │
       │                    │───────────────────▶│                    │
       │                    │                    │                    │
       │                    │    [rules]         │                    │
       │                    │◀───────────────────│                    │
       │                    │                    │                    │
       │                    │ Cache (TTL: 10min) │                    │
       │                    │───────────────────────────────────────▶│
       │                    │                    │                    │
       │                    │ For each rule:     │                    │
       │                    │  evaluateCondition │                    │
       │                    │  → true? executeAction                  │
       │                    │  → break (first_match)                  │
       │                    │                    │                    │
       │    result          │                    │                    │
       │◀───────────────────│                    │                    │
       │                    │                    │                    │
       │ Apply result       │                    │                    │
       │ to business logic  │                    │                    │
```

---

## 13.9 Rule Administration UI

```
┌──────────────────────────────────────────────────────────────┐
│  📐 Rules Engine                                              │
│                                                               │
│  Rule Set: [Grading: Convert Score ▼]   Version: [3 (active)]│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ #  │ Name          │ Condition              │ Action     │ │
│  │────┼───────────────┼────────────────────────┼────────────│ │
│  │ 1  │ A+ Grade      │ score ≥ 90 AND ≤ 100  │ Grade: A+  │ │
│  │ 2  │ A Grade       │ score ≥ 80 AND < 90   │ Grade: A   │ │
│  │ 3  │ B Grade       │ score ≥ 70 AND < 80   │ Grade: B   │ │
│  │ 99 │ Default Fail   │ always                │ Grade: F   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [+ Add Rule]  [Test Rules]  [Duplicate Rule Set]  [Export]  │
│                                                               │
│  ┌─ Rule Tester ───────────────────────────────────────────┐ │
│  │  Test Score: [____]   [Run Test]                         │ │
│  │  Result: Score 85 → Grade A, Grade Point 3.7            │ │
│  │  Matched Rule: #2 "A Grade"                              │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 13.10 Extensibility

### Custom Function Registry

Schools can register custom functions for advanced rules:

```typescript
@Injectable()
export class CustomFunctionRegistry {
  private functions = new Map<string, Function>();
  
  register(name: string, fn: Function) {
    this.functions.set(name, fn);
  }
  
  // Usage in formula: CUSTOM_CEILING(score * 1.1)
  evaluate(expression: string, context: any): any {
    // Parse expression, resolve CUSTOM_* functions from registry
  }
}
```

---

> **Next:** See [`14-workflow-engine.md`](./14-workflow-engine.md) for the Workflow Engine design.
