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

### Condition Format — Full Operators

```json
{
  "condition": {
    "operator": "AND",
    "conditions": [
      { "field": "subject.is_core", "operator": "equals", "value": true },
      {
        "operator": "OR",
        "conditions": [
          { "field": "score.value", "operator": "gte", "value": 90 },
          { "field": "score.exemption", "operator": "equals", "value": true }
        ]
      },
      { "operator": "NOT", "condition": { "field": "student.suspended", "operator": "equals", "value": true } }
    ]
  }
}
```

**Supported condition operators:**

| Operator | Type | Description | Example |
|----------|------|-------------|---------|
| `equals` | Leaf | Exact match | `{ "field": "status", "operator": "equals", "value": "active" }` |
| `not_equals` | Leaf | Inequality | `{ "field": "grade", "operator": "not_equals", "value": "F" }` |
| `gt`, `gte`, `lt`, `lte` | Leaf | Numeric comparison | `{ "field": "score", "operator": "gte", "value": 75 }` |
| `between` | Leaf | Range (inclusive) | `{ "field": "score", "operator": "between", "value": [60, 79] }` |
| `in` | Leaf | Value in list | `{ "field": "subject", "operator": "in", "value": ["Math","Science"] }` |
| `contains` | Leaf | String/substring match | `{ "field": "remarks", "operator": "contains", "value": "excellent" }` |
| `matches_regex` | Leaf | Regex pattern | `{ "field": "code", "operator": "matches_regex", "value": "^[A-Z]{3}-\\d{3}$" }` |
| `is_null` | Leaf | Null check | `{ "field": "grade", "operator": "is_null" }` |
| `is_not_null` | Leaf | Not-null check | `{ "field": "grade", "operator": "is_not_null" }` |
| `lookup` | Leaf | Cross-dataset reference | See §Cross-Dataset References below |
| `AND` | Compound | All conditions must match | Nested `conditions[]` array |
| `OR` | Compound | Any condition must match | Nested `conditions[]` array |
| `NOT` | Compound | Inverts a single condition | Nested `condition` object |
| `always` | Leaf | Always true (catch-all) | `{ "operator": "always" }` |

**Nesting depth:** Arbitrary. AND can contain OR which contains AND which contains leaf conditions. The engine recursively evaluates the tree.

### Action Format — Full Types

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

**Supported action types:**

| Action Type | Purpose | Example Params |
|-------------|---------|---------------|
| `assign_grade` | Set grade + grade point | `{ "grade_label": "A+", "grade_point": 4.0 }` |
| `calculate_formula` | Evaluate a formula expression | `{ "formula": "(score / maxScore) * 100" }` |
| `compute` | Store intermediate computed value in context for downstream rules | `{ "field": "weighted_total", "formula": "SUM(subjects, 'score * credit')" }` |
| `set_risk_flag` | Flag a student/record | `{ "level": "high", "reason": "Attendance < 75%" }` |
| `set_promotion_status` | Set promotion result | `{ "status": "PROMOTED" }` |
| `set_field` | Write a value to the context | `{ "field": "final_grade", "value": "B" }` |
| `notify` | Trigger a notification | `{ "template": "low_attendance", "channel": "email" }` |
| `lookup` | Fetch data from another dataset into context | `{ "source": "attendance_records", "filter": { "student_id": "{{student.id}}", "date_from": "{{term.start}}" } }` |

---

## 13.4a Formula Expression Language

### Purpose

When `action.type` is `calculate_formula` or `compute`, the engine evaluates a **safe formula expression** against the rule context. This allows schools to define their own calculations without code.

### Supported Functions

| Function | Description | Example |
|----------|-------------|---------|
| `SUM(array, field)` | Sum a field across an array | `SUM(subjects, 'score * credit_hours')` |
| `AVG(array, field)` | Average a field across an array | `AVG(exams, 'percentage')` |
| `COUNT(array)` | Count items in array | `COUNT(attendance_records WHERE status = 'ABSENT')` |
| `MIN(array, field)` | Minimum value | `MIN(subjects, 'score')` |
| `MAX(array, field)` | Maximum value | `MAX(subjects, 'score')` |
| `ROUND(value, decimals)` | Round to decimals | `ROUND(gpa, 2)` |
| `FLOOR(value)` | Floor | `FLOOR(percentage / 10)` |
| `CEIL(value)` | Ceiling | `CEIL(percentage / 10)` |
| `ABS(value)` | Absolute value | `ABS(score - threshold)` |
| `IF(cond, then, else)` | Ternary | `IF(score >= 40, score, 0)` |
| `COALESCE(a, b)` | First non-null | `COALESCE(override_score, raw_score)` |
| `WEIGHTED_AVG(array, valueField, weightField)` | Weighted average | `WEIGHTED_AVG(subjects, 'grade_point', 'credit_hours')` |

**Arithmetic:** `+`, `-`, `*`, `/`, `%`, `( )` for grouping.

**Safety:** The formula parser is sandboxed — no function calls outside the approved list, no prototype access, no `eval()`.

### Example: GPA Calculation

```json
{
  "action": {
    "type": "calculate_formula",
    "params": {
      "formula": "ROUND(WEIGHTED_AVG(subjects, 'grade_point', 'credit_hours'), 2)"
    }
  }
}
```

Context provided: `{ subjects: [{ grade_point: 4.0, credit_hours: 4 }, { grade_point: 3.0, credit_hours: 3 }] }`  
Result: `3.57`

---

## 13.4b Cross-Dataset References (Lookup)

Rules can reference data from other tables or contexts via the `lookup` condition type and `lookup` action type. This avoids requiring callers to pre-load all possible data into the rule context.

### Condition Lookup — Check existence/values in another dataset

```json
{
  "operator": "lookup",
  "source": "attendance_records",
  "filter": {
    "student_id": "{{context.student.id}}",
    "date_from": "{{context.term.start_date}}",
    "date_to": "{{context.term.end_date}}"
  },
  "check": {
    "field": "absent_count",
    "operator": "gte",
    "value": 10
  }
}
```

This queries the `attendance_records` data source (a registered resolver), filters by the templated values, then checks if the resulting `absent_count` field is ≥ 10.

### Action Lookup — Enrich context with external data

```json
{
  "action": {
    "type": "lookup",
    "params": {
      "source": "pending_leave_requests",
      "filter": { "student_id": "{{context.student.id}}", "status": "APPROVED" },
      "store_as": "approved_leaves"
    }
  }
}
```

This fetches approved leave requests for the student and stores them in the context under `approved_leaves` for downstream rules to reference.

### Data Source Registry

Each lookup source is a **pre-registered resolver** — not raw SQL. This prevents injection and keeps rules portable:

```typescript
@Injectable()
export class DataSourceRegistry {
  private resolvers = new Map<string, DataResolver>();
  
  register(name: string, resolver: DataResolver) {
    this.resolvers.set(name, resolver);
  }
  
  async resolve(source: string, filter: Record<string, any>, tenantId: string): Promise<any> {
    const resolver = this.resolvers.get(source);
    if (!resolver) throw new Error(`Unknown data source: ${source}`);
    return resolver.resolve(filter, tenantId);
  }
}

// Pre-registered resolvers:
// 'attendance_records' → AttendanceRepository.getAggregate()
// 'exam_scores'       → ExamRepository.getScores()
// 'pending_leave'     → LeaveRepository.getPending()
// 'student_profile'   → StudentRepository.getProfile()
```

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

## 13.6 Rule Execution Engine (With Tracing)

### Execution Trace Model

Every rule evaluation produces a **trace** showing exactly which rules were evaluated, which conditions matched or failed, and why. This is critical for admin trust and debugging.

```typescript
interface ExecutionTrace {
  ruleSetCode: string;
  ruleSetName: string;
  context: Record<string, any>;       // Snapshot of input context
  startedAt: string;                   // ISO timestamp
  completedAt: string;
  totalDurationMs: number;
  rules: RuleTrace[];
  finalResult: any;
}

interface RuleTrace {
  ruleId: string;
  ruleName: string;
  priority: number;
  evaluated: boolean;                 // Was this rule checked?
  matched: boolean;                   // Did the full condition pass?
  conditionTrace: ConditionTrace;     // Per-condition breakdown
  actionResult?: any;                 // What action produced (if matched)
  durationMs: number;
}

interface ConditionTrace {
  operator: string;
  matched: boolean;
  reason: string;                     // Human-readable explanation
  children?: ConditionTrace[];        // For AND/OR/NOT compound operators
  // For leaf conditions:
  field?: string;
  fieldValue?: any;
  expectedValue?: any;
  actualOperator?: string;
}
```

### Trace Output Example

For a grade conversion with score 85:

```json
{
  "ruleSetCode": "grading.convert_score",
  "ruleSetName": "Convert Score to Grade",
  "context": { "score": 85, "max_score": 100 },
  "startedAt": "2026-06-05T10:30:00Z",
  "completedAt": "2026-06-05T10:30:00.012Z",
  "totalDurationMs": 12,
  "rules": [
    {
      "ruleId": "rule-001",
      "ruleName": "A+ Grade",
      "priority": 1,
      "evaluated": true,
      "matched": false,
      "conditionTrace": {
        "operator": "AND",
        "matched": false,
        "reason": "1 of 2 conditions failed",
        "children": [
          {
            "operator": "gte",
            "matched": false,
            "reason": "score (85) is not ≥ 90",
            "field": "score",
            "fieldValue": 85,
            "expectedValue": 90,
            "actualOperator": "gte"
          },
          {
            "operator": "lte",
            "matched": true,
            "reason": "score (85) is ≤ 100",
            "field": "score",
            "fieldValue": 85,
            "expectedValue": 100,
            "actualOperator": "lte"
          }
        ]
      },
      "durationMs": 2
    },
    {
      "ruleId": "rule-002",
      "ruleName": "A Grade",
      "priority": 2,
      "evaluated": true,
      "matched": true,
      "conditionTrace": {
        "operator": "AND",
        "matched": true,
        "reason": "All 2 conditions matched",
        "children": [
          {
            "operator": "gte",
            "matched": true,
            "reason": "score (85) is ≥ 80",
            "field": "score",
            "fieldValue": 85,
            "expectedValue": 80,
            "actualOperator": "gte"
          },
          {
            "operator": "lt",
            "matched": true,
            "reason": "score (85) is < 90",
            "field": "score",
            "fieldValue": 85,
            "expectedValue": 90,
            "actualOperator": "lt"
          }
        ]
      },
      "actionResult": { "grade": "A", "grade_point": 3.7 },
      "durationMs": 1
    }
  ],
  "finalResult": { "grade": "A", "grade_point": 3.7 }
}
```

### Engine Implementation (Updated)

```typescript
@Injectable()
export class RulesEngine {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private dataSources: DataSourceRegistry,
    private formulaEngine: FormulaEngine
  ) {}
  
  /**
   * Evaluate rules with full execution tracing.
   * Pass { trace: true } in options to get the trace.
   * Pass { trace: false } (default) for production hot-path to skip trace overhead.
   */
  async evaluate<T>(
    tenantId: string,
    ruleSetCode: string,
    context: Record<string, any>,
    mode: 'first_match' | 'all_matches' = 'first_match',
    options: { trace?: boolean } = {}
  ): Promise<{ result: RuleResult<T> | RuleResult<T>[] | null; trace?: ExecutionTrace }> {
    
    const startedAt = new Date();
    const trace: ExecutionTrace | undefined = options.trace ? {
      ruleSetCode,
      ruleSetName: '',
      context: { ...context },
      startedAt: startedAt.toISOString(),
      completedAt: '',
      totalDurationMs: 0,
      rules: [],
      finalResult: null
    } : undefined;
    
    const rules = await this.loadRules(tenantId, ruleSetCode);
    rules.sort((a, b) => a.priority - b.priority);
    
    if (trace) trace.ruleSetName = rules[0]?.ruleSet?.name ?? ruleSetCode;
    
    const results: RuleResult<T>[] = [];
    
    for (const rule of rules) {
      const ruleStart = Date.now();
      const ruleTrace: RuleTrace = {
        ruleId: rule.id,
        ruleName: rule.name,
        priority: rule.priority,
        evaluated: true,
        matched: false,
        conditionTrace: { operator: 'always', matched: false, reason: '' },
        durationMs: 0
      };
      
      // Resolve any lookup conditions first
      const enrichedContext = await this.resolveLookups(rule.condition, context, tenantId);
      
      // Evaluate condition WITH trace
      const conditionResult = this.evaluateConditionWithTrace(rule.condition, enrichedContext);
      ruleTrace.conditionTrace = conditionResult.trace;
      ruleTrace.matched = conditionResult.matched;
      
      if (conditionResult.matched) {
        // Resolve any lookup actions
        const actionContext = await this.resolveActionLookups(rule.action, enrichedContext, tenantId);
        
        // Execute action (formula actions use FormulaEngine)
        const actionResult = await this.executeAction<T>(rule.action, actionContext);
        ruleTrace.actionResult = actionResult;
        
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched: true,
          result: actionResult
        });
        
        ruleTrace.durationMs = Date.now() - ruleStart;
        if (trace) trace.rules.push(ruleTrace);
        
        if (mode === 'first_match') {
          if (trace) {
            trace.completedAt = new Date().toISOString();
            trace.totalDurationMs = Date.now() - startedAt.getTime();
            trace.finalResult = results[0];
          }
          return { result: results[0], trace };
        }
      } else {
        ruleTrace.durationMs = Date.now() - ruleStart;
        if (trace) trace.rules.push(ruleTrace);
      }
    }
    
    if (trace) {
      trace.completedAt = new Date().toISOString();
      trace.totalDurationMs = Date.now() - startedAt.getTime();
      trace.finalResult = mode === 'all_matches' ? results : null;
    }
    
    if (mode === 'all_matches') return { result: results, trace };
    return { result: null, trace };
  }
  
  /**
   * Evaluate a condition tree and produce a detailed trace.
   */
  private evaluateConditionWithTrace(
    condition: ConditionNode,
    context: any
  ): { matched: boolean; trace: ConditionTrace } {
    
    if (condition.operator === 'always') {
      return {
        matched: true,
        trace: { operator: 'always', matched: true, reason: 'Catch-all rule (always matches)' }
      };
    }
    
    if (condition.operator === 'AND') {
      const children = condition.conditions!.map(c => this.evaluateConditionWithTrace(c, context));
      const allMatch = children.every(c => c.matched);
      const failCount = children.filter(c => !c.matched).length;
      return {
        matched: allMatch,
        trace: {
          operator: 'AND',
          matched: allMatch,
          reason: allMatch
            ? `All ${children.length} conditions matched`
            : `${failCount} of ${children.length} conditions failed`,
          children: children.map(c => c.trace)
        }
      };
    }
    
    if (condition.operator === 'OR') {
      const children = condition.conditions!.map(c => this.evaluateConditionWithTrace(c, context));
      const anyMatch = children.some(c => c.matched);
      return {
        matched: anyMatch,
        trace: {
          operator: 'OR',
          matched: anyMatch,
          reason: anyMatch
            ? `${children.filter(c => c.matched).length} of ${children.length} conditions matched`
            : `None of ${children.length} conditions matched`,
          children: children.map(c => c.trace)
        }
      };
    }
    
    if (condition.operator === 'NOT') {
      const child = this.evaluateConditionWithTrace(condition.condition!, context);
      return {
        matched: !child.matched,
        trace: {
          operator: 'NOT',
          matched: !child.matched,
          reason: child.matched
            ? 'Condition matched (inverted by NOT → false)'
            : 'Condition did not match (inverted by NOT → true)',
          children: [child.trace]
        }
      };
    }
    
    if (condition.operator === 'lookup') {
      // Lookup conditions are resolved before evaluation (see resolveLookups)
      const lookedUpValue = context[`__lookup_${condition.field}`];
      return this.leafConditionWithTrace(
        condition.field!,
        lookedUpValue,
        condition.check!.operator,
        condition.check!.value
      );
    }
    
    // Leaf condition
    const fieldValue = this.resolvePath(context, condition.field!);
    return this.leafConditionWithTrace(
      condition.field!,
      fieldValue,
      condition.operator!,
      condition.value
    );
  }
  
  private leafConditionWithTrace(
    field: string,
    fieldValue: any,
    operator: string,
    expectedValue: any
  ): { matched: boolean; trace: ConditionTrace } {
    
    let matched = false;
    let reason = '';
    
    switch (operator) {
      case 'equals':
        matched = fieldValue === expectedValue;
        reason = matched
          ? `${field} (${fieldValue}) equals ${expectedValue}`
          : `${field} (${fieldValue}) does not equal ${expectedValue}`;
        break;
      case 'gte':
        matched = fieldValue >= expectedValue;
        reason = matched
          ? `${field} (${fieldValue}) is ≥ ${expectedValue}`
          : `${field} (${fieldValue}) is not ≥ ${expectedValue}`;
        break;
      case 'gt':
        matched = fieldValue > expectedValue;
        reason = matched
          ? `${field} (${fieldValue}) is > ${expectedValue}`
          : `${field} (${fieldValue}) is not > ${expectedValue}`;
        break;
      case 'lte':
        matched = fieldValue <= expectedValue;
        reason = matched
          ? `${field} (${fieldValue}) is ≤ ${expectedValue}`
          : `${field} (${fieldValue}) is not ≤ ${expectedValue}`;
        break;
      case 'lt':
        matched = fieldValue < expectedValue;
        reason = matched
          ? `${field} (${fieldValue}) is < ${expectedValue}`
          : `${field} (${fieldValue}) is not < ${expectedValue}`;
        break;
      case 'between':
        matched = fieldValue >= expectedValue[0] && fieldValue <= expectedValue[1];
        reason = matched
          ? `${field} (${fieldValue}) is between ${expectedValue[0]} and ${expectedValue[1]}`
          : `${field} (${fieldValue}) is outside ${expectedValue[0]}–${expectedValue[1]}`;
        break;
      case 'in':
        matched = Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
        reason = matched
          ? `${field} (${fieldValue}) is in [${expectedValue.join(', ')}]`
          : `${field} (${fieldValue}) is not in [${expectedValue.join(', ')}]`;
        break;
      case 'is_null':
        matched = fieldValue === null || fieldValue === undefined;
        reason = matched ? `${field} is null` : `${field} (${fieldValue}) is not null`;
        break;
      case 'is_not_null':
        matched = fieldValue !== null && fieldValue !== undefined;
        reason = matched ? `${field} (${fieldValue}) is not null` : `${field} is null`;
        break;
      default:
        reason = `Unknown operator: ${operator}`;
    }
    
    return {
      matched,
      trace: {
        operator,
        matched,
        reason,
        field,
        fieldValue,
        expectedValue,
        actualOperator: operator
      }
    };
  }
  
  // ... resolvePath, resolveLookups, executeAction methods
}
```

### Usage in Production (Trace OFF for Performance)

```typescript
// Hot path — no trace overhead
const { result } = await rulesEngine.evaluate(tenantId, 'grading.convert_score', context);

// Debug/Admin — full trace
const { result, trace } = await rulesEngine.evaluate(
  tenantId, 'grading.convert_score', context, 'first_match', { trace: true }
);
console.log(JSON.stringify(trace, null, 2));
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

The rule editor is part of the **backend-admin UI** (Phase 0). It includes a trace-integrated rule tester for debugging and building trust.

### Rule Set Manager

```
┌──────────────────────────────────────────────────────────────────┐
│  📐 Rules Engine — Tenant: Green Valley School                    │
│                                                                   │
│  Rule Set: [Grading: Convert Score ▼]   Version: [3 (active) ▼]  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ #  │ Name          │ Condition                    │ Action   │ │
│  │────┼───────────────┼──────────────────────────────┼──────────│ │
│  │ 1  │ A+ Grade      │ score ≥ 90 AND score ≤ 100  │ Grade: A+│ │
│  │ 2  │ A Grade       │ score ≥ 80 AND score < 90   │ Grade: A │ │
│  │ 3  │ B Grade       │ score ≥ 70 AND score < 80   │ Grade: B │ │
│  │ 4  │ C Grade       │ score ≥ 60 AND score < 70   │ Grade: C │ │
│  │ 99 │ Default Fail   │ always                      │ Grade: F │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [+ Add Rule]  [Reorder]  [Duplicate Rule Set]  [Export JSON]    │
└──────────────────────────────────────────────────────────────────┘
```

### Rule Editor (Single Rule)

```
┌──────────────────────────────────────────────────────────────────┐
│  Edit Rule: #2 — "A Grade"                                       │
│                                                                   │
│  Name: [A Grade                                          ]       │
│  Priority: [2]                                                    │
│                                                                   │
│  Condition Builder:                                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  [AND ▼]                                                    │ │
│  │  ├── [score] [≥ ▼] [80]                        [×]         │ │
│  │  └── [score] [< ▼] [90]                        [×]         │ │
│  │  [+ Add Condition]  [+ Add Group]                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Action:                                                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Type: [assign_grade ▼]                                      │ │
│  │  Grade Label: [A                ]  Grade Point: [3.7]        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [Save Rule]  [Cancel]                                            │
└──────────────────────────────────────────────────────────────────┘
```

### Trace-Integrated Rule Tester

```
┌──────────────────────────────────────────────────────────────────┐
│  🧪 Rule Tester                                                   │
│                                                                   │
│  Test Input (JSON):                                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ { "score": 85, "max_score": 100,                            │ │
│  │   "subject": { "name": "Math", "is_core": true } }          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [Run Test]  [Run With Trace]  [Load Sample Data]                │
│                                                                   │
│  ── Result ─────────────────────────────────────────────────────  │
│  ✅ Matched Rule #2: "A Grade"                                    │
│  Action: { grade: "A", grade_point: 3.7 }                        │
│  Duration: 12ms                                                   │
│                                                                   │
│  ── Execution Trace ────────────────────────────────────────────  │
│  Rule #1 "A+ Grade" (Priority 1) — ❌ NOT MATCHED                 │
│    ├── score (85) ≥ 90 → ❌ FALSE                                 │
│    └── score (85) ≤ 100 → ✅ TRUE                                 │
│      → 1 of 2 conditions failed, rule skipped                     │
│                                                                   │
│  Rule #2 "A Grade" (Priority 2) — ✅ MATCHED (2ms)               │
│    ├── score (85) ≥ 80 → ✅ TRUE                                  │
│    └── score (85) < 90 → ✅ TRUE                                  │
│      → All 2 conditions matched, action executed                  │
│                                                                   │
│  Rules #3-99: Not evaluated (first_match mode stopped at #2)     │
└──────────────────────────────────────────────────────────────────┘
```

### Trace Export & Audit

- Traces are stored in `rule_execution_logs` table for audit purposes (admin actions only, not every production call)
- Admins can export a trace as JSON for support tickets
- Rule changes trigger automatic re-testing against saved test cases to detect regressions

```sql
CREATE TABLE rule_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  rule_set_code VARCHAR(200) NOT NULL,
  triggered_by UUID NOT NULL,              -- Admin user who ran the test
  context JSONB NOT NULL,                  -- Input provided
  trace JSONB NOT NULL,                    -- Full ExecutionTrace
  created_at TIMESTAMPTZ DEFAULT now()
);
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
