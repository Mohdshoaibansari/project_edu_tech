# 12. Configuration Engine Design

> **Status:** Draft — Pre-Implementation  
> **Purpose:** Replace flat key-value config with a hierarchical, type-safe configuration engine that supports arbitrary school-specific business rules.

---

## 12.1 Problem

The current `TenantConfig` model stores flat `key → value` pairs:

```
'attendance.minimum_rate' → 0.75
'homework.late_penalty' → 10
```

This cannot represent:
- Lists of attendance statuses with per-status rules
- Grading scales (ordered mappings, grade bands)
- Academic calendars (nested terms, dates, holidays)
- Workflow definitions (multi-step with conditions)

---

## 12.2 Design Philosophy

**Configuration is structured data, not flat strings.** The engine must support:

1. **Hierarchical schema** — nested configurations (calendars contain terms contain periods)
2. **Strong typing** — configurations have types (attendance type definition, grading scale, calendar)
3. **Versioning** — configurations can be versioned and rolled back
4. **Inheritance** — tenants can inherit from base templates, overriding only what differs
5. **Validation** — configurations are validated against JSON Schema at save time
6. **Auditability** — all config changes are logged

---

## 12.3 Database Design

### Configuration Schema Registry

```sql
-- Defines what configuration schemas exist in the platform
CREATE TABLE config_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_key VARCHAR(200) UNIQUE NOT NULL,     -- 'attendance.statuses', 'grading.scale', 'academic.calendar'
  name VARCHAR(200) NOT NULL,                   -- Human-readable name
  description TEXT,
  json_schema JSONB NOT NULL,                   -- JSON Schema for validation
  ui_schema JSONB,                              -- UI hints (form layout, field types)
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tenant Configuration Values

```sql
CREATE TABLE tenant_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  schema_key VARCHAR(200) NOT NULL,             -- References config_schemas.schema_key
  config_value JSONB NOT NULL,                   -- The actual configuration
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  inherited_from UUID,                           -- If inherited, points to base config
  overrides JSONB,                               -- Only changed values from inherited
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, schema_key, version)
);
```

### Configuration Inheritance (Templates)

```sql
CREATE TABLE config_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,                    -- 'Default Indian CBSE School'
  description TEXT,
  schema_key VARCHAR(200) NOT NULL,
  config_value JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 12.4 Key Configuration Schemas

### 12.4.1 Attendance Statuses Configuration

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "schema_key": "attendance.statuses",
  "config_value": {
    "mode": "daily",
    "statuses": [
      {
        "code": "PRESENT",
        "label": { "en": "Present", "hi": "उपस्थित", "mr": "उपस्थित" },
        "color": "#10B981",
        "icon": "check-circle",
        "is_present": true,
        "counts_toward_attendance": true,
        "weight": 1.0,
        "is_default": true,
        "requires_note": false,
        "sort_order": 1
      },
      {
        "code": "ABSENT",
        "label": { "en": "Absent", "hi": "अनुपस्थित", "mr": "अनुपस्थित" },
        "color": "#EF4444",
        "icon": "x-circle",
        "is_present": false,
        "counts_toward_attendance": true,
        "weight": 0.0,
        "is_default": false,
        "requires_note": false,
        "sort_order": 2
      },
      {
        "code": "LATE",
        "label": { "en": "Late", "hi": "देर से", "mr": "उशीरा" },
        "color": "#F59E0B",
        "icon": "clock",
        "is_present": true,
        "counts_toward_attendance": true,
        "weight": 0.5,
        "is_default": false,
        "requires_note": false,
        "sort_order": 3
      }
    ],
    "attendance_formula": "SUM(weight) / COUNT(statuses WHERE counts_toward_attendance)",
    "auto_mark_absent_after_hours": 0,
    "allow_self_correction_hours": 0,
    "correction_requires_approval": true,
    "offline_sync_enabled": false
  }
}
```

**School A (Present/Absent/Late):** 3 statuses as above.  
**School B (Present/Absent/Half Day/Medical Leave):** 4 statuses with different weights.  
**School C (Period-based):** `"mode": "periodic"` with period schedule config.

### 12.4.2 Grading Scale Configuration

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "schema_key": "grading.scale",
  "config_value": {
    "type": "grade_bands",
    "max_score": 100,
    "min_score": 0,
    "pass_threshold": 35,
    "bands": [
      { "label": "A+", "min": 90, "max": 100, "grade_point": 4.0, "color": "#10B981" },
      { "label": "A",  "min": 80, "max": 89,  "grade_point": 3.7, "color": "#34D399" },
      { "label": "B+", "min": 70, "max": 79,  "grade_point": 3.3, "color": "#60A5FA" },
      { "label": "B",  "min": 60, "max": 69,  "grade_point": 3.0, "color": "#93C5FD" },
      { "label": "C+", "min": 50, "max": 59,  "grade_point": 2.5, "color": "#FBBF24" },
      { "label": "C",  "min": 40, "max": 49,  "grade_point": 2.0, "color": "#FCD34D" },
      { "label": "D",  "min": 35, "max": 39,  "grade_point": 1.5, "color": "#F87171" },
      { "label": "F",  "min": 0,  "max": 34,  "grade_point": 0.0, "color": "#EF4444" }
    ]
  }
}
```

**School A:** Grade bands (A+ through F).  
**School B:** `"type": "percentage"` — score is the grade.  
**School C:** `"type": "gpa"` — with `grade_point` × `credit_hours` calculation.  
**School D:** `"type": "rubric"` — with rubric criteria definitions.

### 12.4.3 Academic Calendar Configuration

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "schema_key": "academic.calendar",
  "config_value": {
    "year": "2026-2027",
    "structure": "semester",
    "terms": [
      {
        "code": "SEM1",
        "label": "Semester 1",
        "start_date": "2026-06-15",
        "end_date": "2026-10-30",
        "is_active": true,
        "exams": [
          { "code": "MID_SEM1", "label": "Mid-Semester 1", "start": "2026-08-01", "end": "2026-08-15" },
          { "code": "FINAL_SEM1", "label": "Final Semester 1", "start": "2026-10-15", "end": "2026-10-30" }
        ],
        "holidays": [
          { "date": "2026-08-15", "label": "Independence Day" },
          { "date": "2026-10-02", "label": "Gandhi Jayanti" }
        ]
      },
      {
        "code": "SEM2",
        "label": "Semester 2",
        "start_date": "2026-11-15",
        "end_date": "2027-04-15",
        "is_active": true,
        "exams": [
          { "code": "MID_SEM2", "label": "Mid-Semester 2", "start": "2027-01-01", "end": "2027-01-15" },
          { "code": "FINAL_SEM2", "label": "Final Semester 2", "start": "2027-04-01", "end": "2027-04-15" }
        ]
      }
    ]
  }
}
```

**School A (Semester):** 2 semesters.  
**School B (Trimester):** `"structure": "trimester"` with 3 terms.  
**School C (Quarterly):** `"structure": "quarterly"` with 4 terms.

---

## 12.5 API Design

### Configuration API

```
GET    /api/v1/{tenant}/config/schemas                  # List all available config schemas
GET    /api/v1/{tenant}/config/schemas/{schemaKey}      # Get schema definition + JSON Schema
GET    /api/v1/{tenant}/config/{schemaKey}              # Get current config value for tenant
PUT    /api/v1/{tenant}/config/{schemaKey}              # Create or update config
GET    /api/v1/{tenant}/config/{schemaKey}/history      # List version history
POST   /api/v1/{tenant}/config/{schemaKey}/rollback     # Rollback to previous version
GET    /api/v1/{tenant}/config                          # Get all active configs (merged, for frontend)
POST   /api/v1/{tenant}/config/validate                 # Validate config without saving
```

### Config Resolution Flow

```
1. Request: GET /api/v1/{tenant}/config/attendance.statuses
2. Check tenant_configs for (tenant_id, 'attendance.statuses', is_active=true)
3. If found:
   - If has inherited_from: Merge base template + overrides
   - Return merged config
4. If not found:
   - Find config_templates where is_default=true for this schema
   - Return default template
5. If no default: return platform default
```

### Validation on Save

```typescript
// PUT /api/v1/{tenant}/config/{schemaKey}
async function saveConfig(tenantId: string, schemaKey: string, value: any) {
  // 1. Fetch JSON Schema
  const schema = await getSchemaDefinition(schemaKey);
  
  // 2. Validate against JSON Schema
  const validator = new Validator();
  const result = validator.validate(value, schema.json_schema);
  if (!result.valid) throw new ValidationError(result.errors);
  
  // 3. Run custom business validators (if any registered for this schema)
  await runCustomValidators(schemaKey, value, tenantId);
  
  // 4. Save new version
  const newVersion = await incrementVersion(tenantId, schemaKey);
  await db.tenant_configs.create({
    tenant_id: tenantId,
    schema_key: schemaKey,
    config_value: value,
    version: newVersion,
    created_by: currentUser.id,
  });
  
  // 5. Invalidate cache
  await cache.del(`config:${tenantId}:${schemaKey}`);
  
  // 6. Emit ConfigChanged event
  await eventBus.emit('config.changed', { tenantId, schemaKey, version: newVersion });
}
```

---

## 12.6 Configuration Inheritance

### Scenario: 50 CBSE schools, minor differences

```
Template: "Indian CBSE Standard"
  ├── attendance.statuses (inherited by 50 schools)
  ├── grading.scale (inherited by 50 schools)
  └── academic.calendar (inherited with per-school date overrides)

School A: inherits all from template, overrides only school_name + dates
School B: inherits all from template, overrides grading.scale to add A+ grade
```

This avoids duplicating identical configuration across 50 tenant records.

### Storage

```sql
-- School A inherits from template, overrides only grading
INSERT INTO tenant_configs (tenant_id, schema_key, config_value, inherited_from, overrides)
VALUES (
  'school-a-uuid', 'grading.scale', 
  NULL,  -- empty here, computed from template + overrides
  'cbse-template-uuid',  -- inherited from
  '{"bands[0].label": "A++", "bands[0].min": 95}'  -- only what changes
);
```

---

## 12.7 Administration UI Design

### Configuration Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  ⚙️ School Configuration                                      │
│                                                               │
│  [Attendance] [Grading] [Academic Calendar] [Workflows] [↕]  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Template: Indian CBSE Standard ▼    [Save] [Reset]      │ │
│  │─────────────────────────────────────────────────────────│ │
│  │                                                          │ │
│  │  Attendance Mode:  ● Daily   ○ Period-Based              │ │
│  │                                                          │ │
│  │  Statuses:                                                │ │
│  │  ┌──────────┬──────────┬────────┬────────┬────────────┐ │ │
│  │  │ Status   │ Color    │ Weight │ Default│ Requires   │ │ │
│  │  │          │          │        │        │ Note        │ │ │
│  │  ├──────────┼──────────┼────────┼────────┼────────────┤ │ │
│  │  │ PRESENT  │ 🟢 #10B  │ 1.0    │ ☑      │ ☐          │ │ │
│  │  │ ABSENT   │ 🔴 #EF4  │ 0.0    │ ☐      │ ☐          │ │ │
│  │  │ LATE     │ 🟡 #F59  │ 0.5    │ ☐      │ ☐          │ │ │
│  │  │ MEDICAL  │ 🔵 #3B8  │ 0.75   │ ☐      │ ☑          │ │ │
│  │  └──────────┴──────────┴────────┴────────┴────────────┘ │ │
│  │  [+ Add Status]                                           │ │
│  │                                                          │ │
│  │  Attendance Formula:                                     │ │
│  │  ┌────────────────────────────────────────────────────┐  │ │
│  │  │ SUM(weight * days) / total_days * 100              │  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Key UI Principles

1. **Form is generated from JSON Schema** — no hardcoded config forms
2. **Live preview** — show how attendance would calculate as you change weights
3. **Template comparison** — show diff between current config and template
4. **Bulk import** — upload config via JSON for power users
5. **Validation inline** — show errors as you type, before save

---

## 12.8 Service Layer Integration

```typescript
@Injectable()
export class AttendanceService {
  constructor(
    private configEngine: ConfigurationEngine,
    private prisma: PrismaService
  ) {}
  
  async calculateAttendanceRate(studentId: string, startDate: Date, endDate: Date) {
    // 1. Load attendance status config
    const statusConfig = await this.configEngine.get('attendance.statuses');
    
    // 2. Load attendance records
    const records = await this.prisma.attendance.findMany({
      where: { 
        student_id: studentId, 
        date: { gte: startDate, lte: endDate } 
      }
    });
    
    // 3. Apply the configured formula
    const formula = statusConfig.attendance_formula;
    const statusMap = new Map(statusConfig.statuses.map(s => [s.code, s]));
    
    // Execute formula against records + status weights
    const rate = this.evaluateAttendanceFormula(formula, records, statusMap);
    
    return rate;
  }
  
  async getValidStatuses(): Promise<AttendanceStatus[]> {
    const config = await this.configEngine.get('attendance.statuses');
    return config.statuses;
  }
}
```

---

## 12.9 Configuration Migration & Rollback

```sql
-- Version history preserved forever
SELECT * FROM tenant_configs 
WHERE tenant_id = 'uuid' AND schema_key = 'attendance.statuses' 
ORDER BY version DESC;

-- Rollback (admin action)
UPDATE tenant_configs 
SET is_active = false 
WHERE tenant_id = 'uuid' AND schema_key = 'attendance.statuses' AND is_active = true;

UPDATE tenant_configs 
SET is_active = true 
WHERE tenant_id = 'uuid' AND schema_key = 'attendance.statuses' AND version = 3;
```

---

> **Next:** See [`13-rules-engine.md`](./13-rules-engine.md) for the Rules Engine design.
