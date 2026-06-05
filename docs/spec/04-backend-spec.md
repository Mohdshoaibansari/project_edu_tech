# 4. Backend Specification (Engine-First)

> **Status:** Updated — Post-Architecture-Review  
> **Last Updated:** 2026-06-05

---

## 4.1 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | NestJS | 10.x |
| Language | TypeScript | 5.x (strict) |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16 |
| Cache | Redis | 7.x |
| Queue | BullMQ | 5.x |
| Validation | Zod | 3.x |
| Auth | jose (JWT) | 5.x |
| File Storage | @aws-sdk/client-s3 | 3.x |
| Templates | Handlebars + Puppeteer | Latest |
| Testing | Vitest + Supertest | Latest |

---

## 4.2 Architecture: Bounded Contexts + Engine Layer

### Context Map

```
server/src/
├── contexts/                        # Bounded contexts (DDD)
│   ├── identity/                    # Users, roles, auth, sessions
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── interfaces/
│   │
│   ├── academic-structure/          # Tenants, grades, sections, subjects, classes, calendar, students, teachers
│   ├── attendance/                  # Attendance records, statuses, corrections, tracking
│   ├── assessment/                  # Homework, exams, submissions, grading, rubrics
│   ├── leave/                       # Leave requests, balances, approval workflows
│   ├── communication/               # Notifications, chatbot, messaging, announcements
│   │
│   ├── configuration/               # Cross-cutting: Configuration Engine
│   │   ├── config-engine/           # Hierarchical JSON Schema config
│   │   ├── rules-engine/            # JSON condition/action evaluation
│   │   ├── workflow-engine/         # Configurable state machines
│   │   ├── metadata-engine/         # Custom fields without schema changes
│   │   └── template-engine/         # Document generation (Handlebars + PDF)
│   │
│   └── reporting/                   # Cross-cutting: Reports, dashboards, exports
│
├── shared-kernel/                    # Shared types, errors, event bus, DB client
│   ├── types/
│   ├── errors/
│   ├── events/
│   └── database/
│
└── main.ts
```

### Integration Rules

| Rule | Description |
|------|-------------|
| **Contexts communicate via Event Bus** | No direct service imports between contexts. `AttendanceContext` emits `AttendanceMarked` event → `CommunicationContext` listens and sends notification |
| **Shared Kernel is minimal** | Only branded ID types (`TenantId`, `UserId`, `StudentId`), error classes, event definitions, DB client |
| **Configuration Context is a dependency** | Business contexts depend ON Configuration (to load per-tenant settings), not the reverse |
| **Anti-Corruption Layer** | SuperTokens adapter (Identity Context), external notification providers (Communication Context) |

---

## 4.3 NO Hardcoded Enums — Reference Data Tables Instead

### ❌ OLD (Enum-Based — Cannot Vary Per Tenant)

```prisma
enum AttendanceStatus {
  PRESENT
  ABSENT_UNEXCUSED
  ABSENT_EXCUSED
  TARDY
  MEDICAL_LEAVE
  APPROVED_LEAVE
  HALF_DAY
}

enum ExamType {
  UNIT_TEST
  MID_TERM
  FINAL
  QUIZ
  ANNUAL
  OTHER
}

enum NotificationType {
  ABSENCE_ALERT
  LOW_ATTENDANCE
  HOMEWORK_ASSIGNED
  // ...
}
```

### ✅ NEW (Reference Data Tables — Tenant-Defined)

```prisma
// Tenant-defined attendance statuses
model AttendanceStatus {
  id         String   @id @default(uuid())
  tenant_id  String
  code       String                    // 'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'MEDICAL_LEAVE'
  label      Json                      // { en: "Present", hi: "उपस्थित", mr: "उपस्थित" }
  color      String   @default("#10B981")
  icon       String?
  weight     Decimal  @default(1.0)    @db.Decimal(3, 2)  // 1.0=full present, 0.5=half, 0.0=absent
  is_present Boolean  @default(true)
  is_default Boolean  @default(false)
  sort_order Int      @default(0)
  is_active  Boolean  @default(true)

  @@unique([tenant_id, code])
  @@index([tenant_id])
}

// Tenant-defined exam/assessment types
model AssessmentType {
  id         String   @id @default(uuid())
  tenant_id  String
  code       String                    // 'UNIT_TEST', 'MID_TERM', 'FINAL', 'QUIZ', 'PRACTICAL'
  label      Json
  sort_order Int      @default(0)
  is_active  Boolean  @default(true)

  @@unique([tenant_id, code])
  @@index([tenant_id])
}

// Tenant-defined notification types
model NotificationTypeDef {
  id          String   @id @default(uuid())
  tenant_id   String
  code        String                   // 'ABSENCE_ALERT', 'HOMEWORK_DUE', 'FEE_REMINDER'
  label       Json
  description String?
  is_active   Boolean  @default(true)

  @@unique([tenant_id, code])
  @@index([tenant_id])
}

// Tenant-defined leave types
model LeaveType {
  id          String   @id @default(uuid())
  tenant_id   String
  code        String                   // 'SICK', 'CASUAL', 'EMERGENCY', 'MATERNITY'
  label       Json
  max_days    Int?
  requires_document Boolean @default(false)
  is_active   Boolean  @default(true)

  @@unique([tenant_id, code])
  @@index([tenant_id])
}

// Tenant-defined homework/assignment categories
model HomeworkCategory {
  id         String   @id @default(uuid())
  tenant_id  String
  code       String                    // 'CLASSWORK', 'HOMEWORK', 'PROJECT', 'PRACTICAL'
  label      Json
  is_active  Boolean  @default(true)

  @@unique([tenant_id, code])
  @@index([tenant_id])
}
```

### Database Schema — Core Entity Tables (Updated)

```prisma
model Attendance {
  id              String    @id @default(uuid())
  tenant_id       String
  student_id      String
  class_id        String
  status_code     String                    // References AttendanceStatus.code (NOT an enum!)
  marked_by       String?
  date            DateTime  @db.Date
  notes           String?   @db.Text
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  @@unique([student_id, class_id, date])
  @@index([tenant_id, class_id, date])
  @@index([tenant_id, student_id, date])
}

model Exam {
  id              String    @id @default(uuid())
  tenant_id       String
  title           String
  type_code       String                    // References AssessmentType.code (NOT an enum!)
  class_id        String
  academic_term_id String?                  // References AcademicTerm
  date            DateTime  @db.Date
  max_score       Decimal   @db.Decimal(5, 2)
  pass_score      Decimal?  @db.Decimal(5, 2)
  description     String?   @db.Text
  created_by      String?
  metadata        Json      @default("{}")  // Custom fields via Metadata Engine
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  @@index([tenant_id, class_id, date])
}

model ExamScore {
  id         String   @id @default(uuid())
  tenant_id  String
  exam_id    String
  student_id String
  score      Decimal  @db.Decimal(5, 2)    // Raw score (numeric, for calculation)
  grade      String?                       // Derived grade label (A+, B, etc.) — populated by Rules Engine
  grade_point Decimal? @db.Decimal(3, 2)  // GPA points — populated by Rules Engine
  remarks    String?  @db.Text
  is_absent  Boolean  @default(false)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@unique([exam_id, student_id])
  @@index([tenant_id, exam_id])
  @@index([tenant_id, student_id])
}

model LeaveRequest {
  id            String    @id @default(uuid())
  tenant_id     String
  student_id    String?
  staff_id      String?
  parent_id     String?
  type_code     String                    // References LeaveType.code (NOT an enum!)
  start_date    DateTime  @db.Date
  end_date      DateTime  @db.Date
  reason        String    @db.Text
  status        String    @default("PENDING")  // Current workflow state (NOT an enum!)
  reviewed_by   String?
  review_notes  String?   @db.Text
  workflow_instance_id String?             // Links to Workflow Engine instance
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
  deleted_at    DateTime?

  @@index([tenant_id, student_id, status])
  @@index([tenant_id, status, start_date])
}

model Student {
  id                       String    @id @default(uuid())
  tenant_id                String
  user_id                  String    @unique
  student_id_card          String    @unique
  date_of_birth            DateTime
  grade_level              String
  parent_id                String?
  current_engagement_score Int       @default(100)
  metadata                 Json      @default("{}")  // Custom fields via Metadata Engine
  created_at               DateTime  @default(now())
  updated_at               DateTime  @updatedAt
  deleted_at               DateTime?

  @@index([tenant_id, grade_level])
  @@index([tenant_id, parent_id])
}
```

### New: Academic Calendar Tables

```prisma
model AcademicYear {
  id         String    @id @default(uuid())
  tenant_id  String
  name       String                    // '2026-2027'
  start_date DateTime
  end_date   DateTime
  is_active  Boolean   @default(true)

  terms      AcademicTerm[]
  
  @@unique([tenant_id, name])
  @@index([tenant_id, is_active])
}

model AcademicTerm {
  id               String    @id @default(uuid())
  academic_year_id String
  code             String                    // 'SEM1', 'TRI1', 'Q1'
  name             String                    // 'Semester 1', 'Trimester 1', 'Quarter 1'
  start_date       DateTime
  end_date         DateTime
  term_type        String                    // 'semester', 'trimester', 'quarter', 'custom'
  sort_order       Int       @default(0)
  is_active        Boolean   @default(true)

  academic_year AcademicYear @relation(fields: [academic_year_id], references: [id])
  
  @@index([academic_year_id, sort_order])
}
```

### New: Engine Tables (Summary)

| Table | Purpose |
|-------|---------|
| `config_schemas` | JSON Schema definitions for configuration schemas |
| `tenant_configs` | Tenant configuration values (versioned, hierarchical) |
| `config_templates` | Pre-built config templates (CBSE, ICSE, International, etc.) |
| `rule_sets` | Named collections of rules per tenant |
| `rules` | Individual rules with condition/action JSON |
| `workflow_definitions` | State machine definitions per workflow type per tenant |
| `workflow_states` | States within a workflow (initial, final, intermediate) |
| `workflow_transitions` | Allowed transitions with actors, conditions, actions |
| `workflow_instances` | Running workflow instances (entity + current state) |
| `workflow_history` | Transition history per instance |
| `entity_field_definitions` | Custom field definitions per entity type per tenant |
| `document_templates` | Template definitions (Handlebars/React-PDF) |
| `generated_documents` | Generated document records (S3 URLs) |
| `ai_task_definitions` | Configurable AI task definitions per tenant |
| `ai_usage_logs` | AI usage + cost tracking |

> **Full DDL:** See the engine design documents [#12](./12-configuration-engine.md) through [#16](./16-template-engine.md) for complete table definitions.

---

## 4.4 Engine Services

### Configuration Engine

```typescript
@Injectable()
export class ConfigurationEngine {
  async get<T>(tenantId: string, schemaKey: string): Promise<T>;
  async set(tenantId: string, schemaKey: string, value: any, userId: string): Promise<void>;
  async getHierarchical(tenantId: string): Promise<Record<string, any>>;  // Merged config tree
  async validate(schemaKey: string, value: any): Promise<ValidationResult>;
  async getHistory(tenantId: string, schemaKey: string): Promise<ConfigVersion[]>;
  async rollback(tenantId: string, schemaKey: string, version: number): Promise<void>;
  
  // Convenience methods
  async getAttendanceStatuses(tenantId: string): Promise<AttendanceStatusDef[]>;
  async getGradingScale(tenantId: string): Promise<GradingScale>;
  async getAcademicCalendar(tenantId: string): Promise<AcademicCalendar>;
}
```

### Rules Engine

```typescript
@Injectable()
export class RulesEngine {
  async evaluate<T>(tenantId: string, ruleSetCode: string, context: Record<string, any>): Promise<T>;
  async evaluateAll<T>(tenantId: string, ruleSetCode: string, context: Record<string, any>): Promise<T[]>;
}
```

### Workflow Engine

```typescript
@Injectable()
export class WorkflowEngine {
  async startWorkflow(tenantId: string, workflowCode: string, entityType: string, entityId: string, context: any, actorId: string): Promise<WorkflowInstance>;
  async transition(instanceId: string, transitionName: string, actorId: string, comment?: string): Promise<WorkflowHistory>;
  async getAvailableTransitions(instanceId: string, actorId: string): Promise<WorkflowTransition[]>;
  async getStatus(instanceId: string): Promise<WorkflowStatus>;
}
```

### Metadata Engine

```typescript
@Injectable()
export class MetadataEngine {
  async getFieldDefinitions(tenantId: string, entityType: string): Promise<FieldDefinition[]>;
  async validateMetadata(tenantId: string, entityType: string, metadata: Record<string, any>): Promise<ValidationResult>;
  async applyDefaults(tenantId: string, entityType: string, metadata: Record<string, any>): Promise<Record<string, any>>;
  async generateFormConfig(tenantId: string, formCode: string): Promise<FormConfig>;
}
```

### Template Engine

```typescript
@Injectable()
export class TemplateEngine {
  async generateDocument(tenantId: string, templateCode: string, entityType: string, entityId: string, format: 'pdf'|'html'): Promise<GeneratedDocument>;
  async previewTemplate(tenantId: string, templateCode: string, sampleData?: any): Promise<string>;
  async getTemplateDataSchema(tenantId: string, templateCode: string): Promise<JSONSchema>;
}
```

---

## 4.5 Domain Events (Event Bus)

```typescript
// Events emitted by business contexts
interface DomainEvents {
  'attendance.marked': { tenantId: string; studentId: string; classId: string; statusCode: string; date: string };
  'attendance.corrected': { tenantId: string; attendanceId: string; oldStatus: string; newStatus: string };
  'homework.assigned': { tenantId: string; homeworkId: string; classId: string; dueDate: string };
  'homework.submitted': { tenantId: string; submissionId: string; studentId: string };
  'homework.graded': { tenantId: string; submissionId: string; score: number; grade: string };
  'exam.score_entered': { tenantId: string; examId: string; studentId: string };
  'leave.applied': { tenantId: string; leaveId: string; workflowInstanceId: string };
  'leave.approved': { tenantId: string; leaveId: string };
  'workflow.transitioned': { tenantId: string; workflowCode: string; fromState: string; toState: string; instanceId: string };
  'config.changed': { tenantId: string; schemaKey: string; version: number };
  'student.enrolled': { tenantId: string; studentId: string };
  'student.risk_flagged': { tenantId: string; studentId: string; riskLevel: string };
}
```

### Communication Context — Event Subscriber

```typescript
// contexts/communication/application/event-handlers.ts
@Injectable()
export class NotificationEventHandlers {
  @OnEvent('attendance.marked')
  async onAttendanceMarked(event: AttendanceMarkedEvent) {
    const statuses = await this.configEngine.getAttendanceStatuses(event.tenantId);
    const status = statuses.find(s => s.code === event.statusCode);
    
    if (!status.is_present) {
      await this.sendAbsenceAlert(event);
    }
  }
  
  @OnEvent('homework.graded')
  async onHomeworkGraded(event: HomeworkGradedEvent) {
    await this.sendGradingNotification(event);
  }
  
  @OnEvent('leave.applied')
  async onLeaveApplied(event: LeaveAppliedEvent) {
    // Workflow Engine starts → next approver gets notification
    const transitions = await this.workflowEngine.getAvailableTransitions(
      event.workflowInstanceId, null
    );
    // Notify eligible actors
  }
}
```

---

## 4.6 Service Layer — Config-Driven Business Logic

### Attendance Service (Updated)

```typescript
@Injectable()
export class AttendanceService {
  constructor(
    private configEngine: ConfigurationEngine,
    private rulesEngine: RulesEngine,
    private workflowEngine: WorkflowEngine,
    private eventBus: EventBus,
    private prisma: PrismaService
  ) {}
  
  async getValidStatuses(tenantId: string): Promise<AttendanceStatusDef[]> {
    // NO hardcoded statuses — loaded from Configuration Engine
    return this.configEngine.getAttendanceStatuses(tenantId);
  }
  
  async markAttendance(tenantId: string, classId: string, date: string, records: AttendanceRecordInput[]) {
    // Load tenant's attendance status definitions
    const statuses = await this.getValidStatuses(tenantId);
    const validCodes = new Set(statuses.map(s => s.code));
    
    for (const record of records) {
      // Validate status against tenant's defined statuses
      if (!validCodes.has(record.status_code)) {
        throw new ValidationError(`Invalid status: ${record.status_code}`);
      }
      
      // Upsert attendance record (status_code is a string, not an enum)
      await this.prisma.attendance.upsert({
        where: { student_class_date: { student_id: record.student_id, class_id: classId, date } },
        create: { tenant_id: tenantId, student_id: record.student_id, class_id: classId,
                   date, status_code: record.status_code, marked_by: ctx.userId },
        update: { status_code: record.status_code, marked_by: ctx.userId }
      });
      
      // Emit event
      this.eventBus.emit('attendance.marked', {
        tenantId, studentId: record.student_id, classId, statusCode: record.status_code, date
      });
    }
  }
  
  async calculateAttendanceRate(tenantId: string, studentId: string, from: string, to: string): Promise<number> {
    const records = await this.prisma.attendance.findMany({
      where: { tenant_id: tenantId, student_id: studentId, date: { gte: from, lte: to } }
    });
    
    const statuses = await this.getValidStatuses(tenantId);
    const statusMap = new Map(statuses.map(s => [s.code, s]));
    
    // Use Rules Engine for calculation (not hardcoded math)
    return this.rulesEngine.evaluate<number>(tenantId, 'attendance.calculate_rate', {
      records: records.map(r => ({
        ...r,
        weight: statusMap.get(r.status_code)?.weight ?? 0,
        counts: statusMap.get(r.status_code)?.is_present ?? false ? 1 : 0
      }))
    });
  }
}
```

### Grading Service (Updated)

```typescript
@Injectable()
export class GradingService {
  constructor(
    private configEngine: ConfigurationEngine,
    private rulesEngine: RulesEngine
  ) {}
  
  async getGradingScale(tenantId: string): Promise<GradingScale> {
    return this.configEngine.getGradingScale(tenantId);
  }
  
  async convertScoreToGrade(tenantId: string, score: number, maxScore: number, subject?: any): Promise<GradeResult> {
    return this.rulesEngine.evaluate<GradeResult>(tenantId, 'grading.convert_score', {
      score,
      max_score: maxScore,
      subject,
      scale: await this.getGradingScale(tenantId)
    });
  }
  
  async calculateGPA(tenantId: string, subjectResults: SubjectResult[]): Promise<number> {
    return this.rulesEngine.evaluate<number>(tenantId, 'grading.calculate_gpa', {
      subjects: subjectResults
    });
  }
  
  async checkPromotion(tenantId: string, studentId: string): Promise<PromotionResult> {
    const context = await this.gatherPromotionContext(tenantId, studentId);
    return this.rulesEngine.evaluate<PromotionResult>(tenantId, 'promotion.eligibility', context);
  }
}
```

### Leave Service (Updated — Workflow-Driven)

```typescript
@Injectable()
export class LeaveService {
  constructor(
    private workflowEngine: WorkflowEngine,
    private configEngine: ConfigurationEngine,
    private eventBus: EventBus
  ) {}
  
  async applyLeave(tenantId: string, dto: ApplyLeaveDTO) {
    // Validate leave type exists for this tenant
    const leaveTypes = await this.configEngine.getLeaveTypes(tenantId);
    if (!leaveTypes.find(t => t.code === dto.type_code)) {
      throw new ValidationError(`Invalid leave type: ${dto.type_code}`);
    }
    
    // Create leave request
    const leave = await this.prisma.leave_requests.create({
      data: { tenant_id: tenantId, ...dto, status: 'PENDING' }
    });
    
    // Start workflow instance (configurable per tenant!)
    const instance = await this.workflowEngine.startWorkflow(
      tenantId, 'leave_approval', 'LeaveRequest', leave.id,
      { leave_days: diffDays(dto.start_date, dto.end_date), student_id: dto.student_id },
      dto.parent_id
    );
    
    // Link workflow to leave
    await this.prisma.leave_requests.update({
      where: { id: leave.id },
      data: { workflow_instance_id: instance.id }
    });
    
    // Emit event
    this.eventBus.emit('leave.applied', { tenantId, leaveId: leave.id, workflowInstanceId: instance.id });
    
    return leave;
  }
  
  async approve(leaveId: string, actorId: string, comment?: string) {
    const leave = await this.prisma.leave_requests.findUnique({ where: { id: leaveId } });
    
    // Transition via Workflow Engine (validates actor, conditions, determines next state)
    await this.workflowEngine.transition(leave.workflow_instance_id, 'Approve', actorId, comment);
    
    // Update leave status to match workflow state
    const instance = await this.workflowEngine.getInstance(leave.workflow_instance_id);
    await this.prisma.leave_requests.update({
      where: { id: leaveId },
      data: { status: instance.current_state_code }
    });
  }
}
```

---

## 4.7 API Design Standards (Unchanged)

### URL Convention

```
/api/v1/{tenant_id}/resource              # List/Create
/api/v1/{tenant_id}/resource/{id}         # Get/Update/Delete
/api/v1/{tenant_id}/resource/{id}/action  # Custom action
```

### Config API Endpoints (New)

```
GET    /api/v1/{tenant}/config/{schemaKey}              # Get tenant's active config
PUT    /api/v1/{tenant}/config/{schemaKey}              # Update config (validation + versioning)
GET    /api/v1/{tenant}/config/{schemaKey}/history      # Version history
POST   /api/v1/{tenant}/config/{schemaKey}/rollback     # Rollback to version
GET    /api/v1/{tenant}/config/statuses/attendance       # Convenience: attendance statuses
GET    /api/v1/{tenant}/config/grading/scale             # Convenience: grading scale
GET    /api/v1/{tenant}/config/academic/calendar         # Convenience: academic calendar
```

### Standard Responses (Unchanged)

```json
{ "data": { ... }, "pagination": { "page": 1, "limit": 20, "total": 150, "total_pages": 8 } }
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

---

## 4.8 Authorization (Updated — Engine Operations)

```typescript
// New permissions for engine operations
'config:read'          // View tenant config
'config:write'         // Modify tenant config
'rules:read'           // View rule sets
'rules:write'          // Modify rules
'workflow:read'        // View workflow definitions
'workflow:write'       // Modify workflows
'metadata:read'        // View field definitions
'metadata:write'       // Modify custom fields
'template:read'        // View templates
'template:write'       // Modify templates
```

---

## 4.9 Testing Strategy (Updated)

| Layer | Tool | What to Test |
|-------|------|-------------|
| **Unit** | Vitest | Engine logic, rule evaluation, workflow transitions, config validation |
| **Integration** | Vitest + Supertest | API endpoints with diverse tenant configs, cross-tenant isolation, workflow scenarios |
| **Config Variability** | Vitest | **Test each business operation against 3+ different school configs** (School A: Present/Absent/Late, School B: +Half Day/Medical, School C: period-based) |
| **Workflow Scenarios** | Vitest | Test Teacher→Principal, Teacher→Coordinator→Principal, and conditional workflows |

### Config Variability Tests (NEW — Mandatory)

```typescript
describe('Attendance — Config Variability', () => {
  it('School A: Present/Absent/Late — 3 statuses, Late=0.5 weight', async () => {
    await setupTenantConfig('school-a', {
      'attendance.statuses': { statuses: [
        { code: 'PRESENT', weight: 1.0, is_present: true },
        { code: 'ABSENT', weight: 0.0, is_present: false },
        { code: 'LATE', weight: 0.5, is_present: true }
      ]}
    });
    const rate = await attendanceService.calculateRate('school-a', studentId);
    // 5 present + 2 late + 3 absent = (5*1 + 2*0.5 + 3*0) / 10 = 60%
    expect(rate).toBeCloseTo(60);
  });
  
  it('School B: Medical Leave counts as present, Half Day=0.5', async () => {
    await setupTenantConfig('school-b', {
      'attendance.statuses': { statuses: [
        { code: 'PRESENT', weight: 1.0, is_present: true },
        { code: 'ABSENT', weight: 0.0, is_present: false },
        { code: 'HALF_DAY', weight: 0.5, is_present: true },
        { code: 'MEDICAL_LEAVE', weight: 1.0, is_present: true }
      ]}
    });
    const rate = await attendanceService.calculateRate('school-b', studentId);
    expect(rate).toBeGreaterThan(60); // Medical leaves count as present
  });
});

describe('Grading — Config Variability', () => {
  it('School A: Grade bands — score 85 → Grade A', async () => {
    await setupTenantConfig('school-a', { 'grading.scale': { type: 'grade_bands', bands: [
      { label: 'A+', min: 90, max: 100 }, { label: 'A', min: 80, max: 89 }
    ]}});
    const result = await gradingService.convertScoreToGrade('school-a', 85, 100);
    expect(result.grade).toBe('A');
  });
  
  it('School B: Percentage — score 85/100 → 85%', async () => {
    await setupTenantConfig('school-b', { 'grading.scale': { type: 'percentage' }});
    const result = await gradingService.convertScoreToGrade('school-b', 85, 100);
    expect(result.percentage).toBe(85);
  });
  
  it('School C: GPA — grade_point weighted by credit_hours', async () => {
    await setupTenantConfig('school-c', { 'grading.scale': { type: 'gpa' }});
    const gpa = await gradingService.calculateGPA('school-c', [
      { subject: 'Math', grade_point: 4.0, credit_hours: 4 },
      { subject: 'Science', grade_point: 3.0, credit_hours: 3 }
    ]);
    expect(gpa).toBeCloseTo(3.57); // (4*4 + 3*3) / 7
  });
});

describe('Leave — Workflow Variability', () => {
  it('School A: Teacher→Principal (2-step)', async () => {
    await setupWorkflow('school-a', 'leave_approval', teacherToPrincipalWorkflow);
    const instance = await workflowEngine.startWorkflow('school-a', 'leave_approval', ...);
    const transitions = await workflowEngine.getAvailableTransitions(instance.id, teacherId);
    expect(transitions.map(t => t.to_state_code)).toContain('WITH_PRINCIPAL');
  });
  
  it('School B: Teacher→Coordinator→Principal (3-step)', async () => {
    await setupWorkflow('school-b', 'leave_approval', teacherToCoordinatorToPrincipalWorkflow);
    const instance = await workflowEngine.startWorkflow('school-b', 'leave_approval', ...);
    const transitions = await workflowEngine.getAvailableTransitions(instance.id, teacherId);
    expect(transitions.map(t => t.to_state_code)).toContain('WITH_COORDINATOR');
    expect(transitions.map(t => t.to_state_code)).not.toContain('WITH_PRINCIPAL');
  });
});
```

---

> **Next:** See [`05-frontend-spec.md`](./05-frontend-spec.md) for updated frontend specification.
