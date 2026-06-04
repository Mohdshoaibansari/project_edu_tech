# 15. Metadata Engine Design

> **Status:** Draft — Pre-Implementation  
> **Purpose:** Support custom fields, dynamic forms, and extensible data collection without requiring database schema changes.

---

## 15.1 Problem

Every school has unique data needs:

| Entity | School A Needs | School B Additionally Needs | School C Additionally Needs |
|--------|---------------|---------------------------|---------------------------|
| **Student** | name, DOB, grade | blood_group, religion, caste_category, transport_route | previous_school, medical_conditions, sports_quota |
| **Teacher** | name, email | qualification, experience_years, specialization | board_registration_number, training_certificates |
| **Parent** | name, phone | occupation, annual_income | alternate_contact, is_guardian |
| **Homework** | title, due_date | learning_outcome, blooms_taxonomy_level | curriculum_code, textbook_page |

**Without a metadata engine:** Every new field requires a database migration → code change → deploy. 200 schools × 5 custom fields each = **1,000 schema migrations.**

---

## 15.2 Solution: Entity-Attribute-Value (EAV) with Type Safety

### Pattern: Hybrid approach

1. **Core fields:** Standard columns in the table (id, name, DOB, tenant_id) — for query performance
2. **Custom fields:** JSONB `metadata` column on every entity — for schema-less extensibility
3. **Field definitions:** Registry table defining valid custom fields per tenant
4. **Validation:** JSON Schema validation on save
5. **Indexing:** GIN indexes on JSONB for queryable custom fields

---

## 15.3 Database Design

### Field Definitions Registry

```sql
CREATE TABLE entity_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type VARCHAR(50) NOT NULL,              -- 'student', 'teacher', 'staff', 'homework'
  field_code VARCHAR(100) NOT NULL,               -- 'blood_group', 'transport_route'
  field_name JSONB NOT NULL,                      -- { en: "Blood Group", hi: "रक्त समूह" }
  field_type VARCHAR(30) NOT NULL,                -- 'string', 'number', 'boolean', 'date', 'enum', 'array', 'object'
  is_required BOOLEAN DEFAULT false,
  is_searchable BOOLEAN DEFAULT false,            -- Create GIN index entry
  is_filterable BOOLEAN DEFAULT false,            -- Show in UI filters
  is_visible_in_list BOOLEAN DEFAULT false,       -- Show in table views
  validation JSONB,                               -- JSON Schema for validation
  enum_values JSONB,                              -- [{ value: "A+", label: { en: "A Positive" } }]
  default_value JSONB,
  ui_hints JSONB,                                 -- { input_type: "dropdown", placeholder: "...", span: "full" }
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, entity_type, field_code)
);
```

### Entity Tables with Metadata Column

```sql
-- Every entity table gets a metadata JSONB column
ALTER TABLE students ADD COLUMN metadata JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}';
ALTER TABLE staff ADD COLUMN metadata JSONB DEFAULT '{}';
ALTER TABLE homework ADD COLUMN metadata JSONB DEFAULT '{}';

-- GIN index for querying metadata fields
CREATE INDEX idx_students_metadata ON students USING GIN (metadata jsonb_path_ops);

-- Query example: Find students with blood_group = 'A+'
SELECT * FROM students 
WHERE tenant_id = 'uuid' 
  AND metadata @> '{"blood_group": "A+"}';
```

### Dynamic Forms

```sql
CREATE TABLE dynamic_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code VARCHAR(100) NOT NULL,                     -- 'student_registration', 'teacher_onboarding'
  name VARCHAR(200) NOT NULL,
  entity_type VARCHAR(50),                         -- Which entity this form modifies
  sections JSONB NOT NULL,                         -- Form layout definition
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, code)
);
```

### Form Section Structure

```json
{
  "sections": [
    {
      "title": "Personal Information",
      "sort_order": 1,
      "fields": [
        { "field_code": "first_name", "required": true, "readonly": false },
        { "field_code": "last_name", "required": true },
        { "field_code": "date_of_birth", "required": true },
        { "field_code": "blood_group", "required": false }   // Custom field
      ]
    },
    {
      "title": "Transport Information",
      "sort_order": 2,
      "visibility_condition": "metadata.uses_transport == true",
      "fields": [
        { "field_code": "transport_route", "required": true },
        { "field_code": "bus_stop", "required": false },
        { "field_code": "pickup_time", "required": false }
      ]
    }
  ]
}
```

---

## 15.4 Metadata Engine API

```typescript
@Injectable()
export class MetadataEngine {
  
  /**
   * Get all field definitions for an entity type for a tenant
   */
  async getFieldDefinitions(tenantId: string, entityType: string): Promise<FieldDefinition[]> {
    const cacheKey = `metadata:fields:${tenantId}:${entityType}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    
    const fields = await this.prisma.entity_field_definitions.findMany({
      where: { tenant_id: tenantId, entity_type: entityType, is_active: true },
      orderBy: { sort_order: 'asc' }
    });
    
    await this.cache.set(cacheKey, fields, 600);
    return fields;
  }
  
  /**
   * Validate entity metadata against field definitions
   */
  async validateMetadata(
    tenantId: string, 
    entityType: string, 
    metadata: Record<string, any>
  ): Promise<ValidationResult> {
    const definitions = await this.getFieldDefinitions(tenantId, entityType);
    const errors: ValidationError[] = [];
    
    for (const def of definitions) {
      const value = metadata[def.field_code];
      
      // Required check
      if (def.is_required && (value === undefined || value === null || value === '')) {
        errors.push({ field: def.field_code, message: `${def.field_name.en} is required` });
        continue;
      }
      
      // Type validation
      if (value !== undefined && value !== null) {
        if (!this.validateType(value, def.field_type)) {
          errors.push({ field: def.field_code, message: `Expected ${def.field_type}` });
        }
        
        // Enum validation
        if (def.field_type === 'enum' && def.enum_values) {
          const validValues = def.enum_values.map((e: any) => e.value);
          if (!validValues.includes(value)) {
            errors.push({ field: def.field_code, message: `Must be one of: ${validValues.join(', ')}` });
          }
        }
        
        // JSON Schema validation
        if (def.validation) {
          const schemaErrors = this.validateJsonSchema(def.validation, value);
          errors.push(...schemaErrors);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Merge provided metadata with defaults
   */
  async applyDefaults(tenantId: string, entityType: string, metadata: Record<string, any>) {
    const definitions = await this.getFieldDefinitions(tenantId, entityType);
    const merged = { ...metadata };
    
    for (const def of definitions) {
      if (merged[def.field_code] === undefined && def.default_value !== undefined) {
        merged[def.field_code] = def.default_value;
      }
    }
    
    return merged;
  }
  
  /**
   * Generate a dynamic form configuration for the frontend
   */
  async generateFormConfig(tenantId: string, formCode: string): Promise<FormConfig> {
    const form = await this.prisma.dynamic_forms.findFirst({
      where: { tenant_id: tenantId, code: formCode, is_active: true }
    });
    
    if (!form) throw new NotFoundError(`Form '${formCode}' not found`);
    
    const entityType = form.entity_type;
    const fieldDefs = await this.getFieldDefinitions(tenantId, entityType);
    const fieldMap = new Map(fieldDefs.map(f => [f.field_code, f]));
    
    // Enrich form sections with full field definitions
    const sections = form.sections.map(section => ({
      ...section,
      fields: section.fields.map(f => ({
        ...f,
        definition: fieldMap.get(f.field_code)
      }))
    }));
    
    return { formCode, entityType, sections };
  }
}
```

---

## 15.5 Service Integration

```typescript
@Injectable()
export class StudentService {
  constructor(private metadata: MetadataEngine) {}
  
  async createStudent(tenantId: string, dto: CreateStudentDTO) {
    // Validate metadata
    const validation = await this.metadata.validateMetadata(
      tenantId, 'student', dto.metadata
    );
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }
    
    // Apply defaults
    const metadata = await this.metadata.applyDefaults(
      tenantId, 'student', dto.metadata
    );
    
    // Create with metadata
    return this.prisma.students.create({
      data: {
        tenant_id: tenantId,
        ...coreFields,
        metadata
      }
    });
  }
  
  async searchStudents(tenantId: string, filters: Record<string, any>) {
    // Build query with metadata filters
    const where: any = { tenant_id: tenantId };
    const metadataFilters: any = {};
    
    for (const [key, value] of Object.entries(filters)) {
      const def = await this.metadata.getFieldDefinition(tenantId, 'student', key);
      if (def?.is_searchable) {
        metadataFilters[key] = value;
      }
    }
    
    if (Object.keys(metadataFilters).length > 0) {
      where.metadata = { contains: metadataFilters };
    }
    
    return this.prisma.students.findMany({ where });
  }
}
```

---

## 15.6 Administration UI

```
┌──────────────────────────────────────────────────────────────┐
│  📋 Custom Fields Manager                                     │
│                                                               │
│  Entity: [Students ▼]                                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Field Name        │ Type   │ Required │ Search │ Active │ │
│  │───────────────────┼────────┼──────────┼────────┼────────│ │
│  │ Blood Group       │ enum   │ ☐        │ ☑      │ ☑      │ │
│  │ Transport Route   │ string │ ☐        │ ☑      │ ☑      │ │
│  │ Religion          │ enum   │ ☐        │ ☐      │ ☑      │ │
│  │ Caste Category    │ enum   │ ☑        │ ☐      │ ☑      │ │
│  │ Previous School   │ string │ ☐        │ ☐      │ ☑      │ │
│  │ Medical Condition │ text   │ ☐        │ ☐      │ ☐      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [+ Add Field]  [Import from Template]  [Export]              │
│                                                               │
│  ┌─ Form Builder ──────────────────────────────────────────┐ │
│  │  Form: Student Registration                               │ │
│  │                                                           │ │
│  │  Section 1: Personal Info                                 │ │
│  │    ☑ First Name*   ☑ Last Name*   ☑ DOB*                │ │
│  │    ☑ Blood Group   ☐ Religion                            │ │
│  │                                                           │ │
│  │  Section 2: Transport                                     │ │
│  │    Condition: uses_transport == true                      │ │
│  │    ☑ Transport Route   ☐ Bus Stop                       │ │
│  │                                                           │ │
│  │  [+ Add Section]  [+ Add Field]  [Preview Form]          │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 15.7 Performance Considerations

1. **GIN indexes** on JSONB columns for queryable custom fields
2. **Field definition caching** (10-minute TTL in Redis)
3. **Projection** — only select needed metadata fields, not full JSONB
4. **Materialized views** for frequently queried custom field combinations (if needed)
5. **Avoid `metadata->>'key'` in WHERE** — use `metadata @> '{"key": "value"}'` with GIN index
6. **Limit custom field count** — recommend < 50 custom fields per entity per tenant

---

## 15.8 Migration Path from Existing Schema

```
Current: Fixed columns on Student table
  student_id_card, date_of_birth, grade_level, engagement_score

Step 1: Add metadata JSONB column to students (nullable, default '{}')
Step 2: Move school-specific fields into metadata (blood_group, religion, etc.)
Step 3: Create entity_field_definitions entries for each custom field
Step 4: Keep core fields as columns (name, DOB, grade_level) for performance
Step 5: Deprecate direct querying of custom columns; use metadata + field definitions
```

---

> **Next:** See [`16-template-engine.md`](./16-template-engine.md) for the Template Engine design.
