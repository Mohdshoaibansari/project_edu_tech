# 4. Backend Specification (Engine-First)

> **Spec ID:** SPEC-BACKEND-001  
> **Status:** Approved  
> **Author:** Architecture & Engineering Team  
> **Created:** 2026-06-05  
> **Last Updated:** 2026-06-05  
> **Related PRD Requirements:** All backend modules (AT-*, HW-*, EX-*, LV-*, NT-*, DR-*, AD-*)

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

## 4.2 Service Architecture

> **Bounded context definitions and context mapping:** See [`18-domain-driven-design.md`](./18-domain-driven-design.md) for the canonical bounded context boundaries, aggregate roots, domain events per context, and context map.
>
> **High-level module structure:** See [`03-architecture.md`](./03-architecture.md) for the overall system architecture.

### Integration Rules

| Rule | Description |
|------|-------------|
| **Contexts communicate via Event Bus** | No direct service imports between contexts. `AttendanceContext` emits `AttendanceMarked` event → `CommunicationContext` listens and sends notification |
| **Shared Kernel is minimal** | Only branded ID types (`TenantId`, `UserId`, `StudentId`), error classes, event definitions, DB client |
| **Configuration Context is a dependency** | Business contexts depend ON Configuration (to load per-tenant settings), not the reverse |
| **Anti-Corruption Layer** | SuperTokens adapter (Identity Context), external notification providers (Communication Context) |

### Backend Module Standards

Each backend module follows the standard structure defined in PRD §1.8 (Backend Development Standards):

```
module/
├── README.md           # Business purpose, rules, dependencies
├── api-contract.yaml   # OpenAPI contract for all module endpoints
├── permissions.md      # Permission definitions and required roles
├── workflows.md        # State machines, transitions, approvals
├── dto.md              # DTO field definitions, types, validation rules
├── error-codes.md      # Module-specific error codes
├── controller/         # Request handling, validation, response formatting
├── service/            # Business logic, permission checks, transactions
├── repository/         # Database operations
├── dto/                # Request/response DTOs
├── validation/         # Zod schemas / class-validator rules
├── permissions/        # Module-specific permission guards
└── tests/              # Unit + integration tests
```

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

> **Canonical engine designs:** Each engine has a dedicated specification document with full interface definitions, schemas, and examples.

| Engine | Document | Purpose |
|--------|----------|---------|
| **Configuration Engine** | [`12-configuration-engine.md`](./12-configuration-engine.md) | Hierarchical JSON Schema config — attendance statuses, grading scales, academic calendars |
| **Rules Engine** | [`13-rules-engine.md`](./13-rules-engine.md) | JSON condition/action evaluation — grade calculation, attendance aggregation, promotion eligibility |
| **Workflow Engine** | [`14-workflow-engine.md`](./14-workflow-engine.md) | Configurable state machines — leave approvals, attendance corrections, admissions |
| **Metadata Engine** | [`15-metadata-engine.md`](./15-metadata-engine.md) | Custom fields without schema changes — JSONB + field definitions, dynamic forms |
| **Template Engine** | [`16-template-engine.md`](./16-template-engine.md) | Document generation — Handlebars/PDF report cards, certificates, letters |

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

## 4.6 API Design Standards

> **Canonical API standards:** See [`01-prd.md` §1.5a](./01-prd.md) for the complete API design standards including response format, module-scoped error codes, pagination, filtering/sorting conventions, idempotency, field conventions, backward compatibility, and OpenAPI enforcement.
>
> **Per-module endpoint contracts:** See [`08-api-contracts.md`](./08-api-contracts.md).

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

## 4.10 Backend-Admin UI

The backend serves a **thin admin interface** via NestJS MVC (Handlebars templates) at `/admin`. This is NOT a customer-facing frontend — it is a configuration tool for Super Admins and School Admins to define per-tenant settings that drive all business modules.

### Purpose

- Configure attendance statuses, grading scales, academic calendars, and workflows **without code changes**
- **Prove API consumability** — the admin UI uses the same REST APIs that customer frontends will consume
- Enable Phase 0 exit: configure 3 diverse schools entirely through the UI

### Technology

| Aspect | Choice |
|--------|--------|
| **Renderer** | Handlebars (server-side templates via NestJS MVC) |
| **Styling** | Minimal CSS (Tailwind via CDN in layout) — no React/Next.js dependency |
| **Auth** | Same JWT + RBAC as API — `admin:config:read` / `admin:config:write` permissions |
| **API Consumption** | Server-side HTTP calls to own REST endpoints (no client-side JS required) |

### Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Login** | `/admin/login` | Authenticate as Super Admin or School Admin |
| **Dashboard** | `/admin` | Tenant selector + overview |
| **Attendance Statuses** | `/admin/attendance-statuses` | Add/remove/reorder statuses, set code, label (i18n), color, icon, weight, is_present flag |
| **Grading Scale** | `/admin/grading-scale` | Select mode (grade bands/percentage/GPA/rubric), define bands with labels, ranges, colors, grade points |
| **Academic Calendar** | `/admin/academic-calendar` | Create academic years + terms, set dates, term types (semester/trimester/quarter) |
| **Workflow Definitions** | `/admin/workflows` | View state machines, transitions, actor rules per workflow type |
| **Rules Viewer** | `/admin/rules` | View rule sets, conditions, actions |
| **Seed Templates** | `/admin/seed` | Load pre-built config templates (CBSE, ICSE, International) for new tenants |

### Architecture Rule

The admin UI **must never** contain business logic, direct database access, or bypass the API layer. Every data operation goes through the same REST endpoints that customer frontends use. This enforces API-first design.

---

## 4.11 Search Strategy

### Current State

The API standards (PRD §1.5a) define a `search` query parameter for basic full-text filtering, but no dedicated search architecture exists. Each module implements search independently.

### Phased Strategy

| Phase | Approach | Scope | Rationale |
|-------|----------|-------|-----------|
| **Phase 1-2** (MVP—50 tenants) | **PostgreSQL Full Text Search (FTS)** | Per-module search: students, teachers, homework | Zero operational overhead. Built into PostgreSQL. No additional infrastructure |
| **Phase 3** (50-200 tenants) | **PostgreSQL FTS + GIN indexes + `tsvector` columns** | Global unified search across modules | Materialized `tsvector` columns for performance. Still no external dependency |
| **Phase 4** (200+ tenants) | **OpenSearch** (only when needed) | Relevance-ranked search, faceted filtering, multi-language stemming | Introduced ONLY when PostgreSQL FTS proves insufficient for scale or relevance requirements |

### Phase 1 Implementation: PostgreSQL FTS

```sql
-- Per-table search columns (Phase 1 — simple LIKE/ILIKE)
-- Students table
CREATE INDEX idx_students_name_search ON students USING gin (name gin_trgm_ops);

-- Homework table  
CREATE INDEX idx_homework_title_search ON homework USING gin (title gin_trgm_ops);
```

```typescript
// Shared search utility
@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}
  
  /**
   * Phase 1-2: Simple ILIKE search with trigram indexes.
   * Migrates to FTS tsvector in Phase 3.
   */
  async search<T>(
    tenantId: string,
    entity: string,
    query: string,
    fields: string[],
    options?: { limit?: number; offset?: number }
  ): Promise<{ data: T[]; total: number }> {
    const where = {
      tenant_id: tenantId,
      deleted_at: null,
      OR: fields.map(field => ({
        [field]: { contains: query, mode: 'insensitive' as const }
      }))
    };
    
    const [data, total] = await Promise.all([
      this.prisma[entity].findMany({ where, take: options?.limit ?? 20, skip: options?.offset ?? 0 }),
      this.prisma[entity].count({ where })
    ]);
    
    return { data, total };
  }
}
```

### Phase 3 Upgrade Path: PostgreSQL FTS with tsvector

```sql
-- Add tsvector column for full-text search
ALTER TABLE students ADD COLUMN search_vector tsvector;

-- Populate from multiple fields with weights
UPDATE students SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(student_id_card, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(metadata->>'guardian_name', '')), 'C');

-- GIN index for fast FTS
CREATE INDEX idx_students_fts ON students USING gin (search_vector);

-- Trigger to keep search_vector updated
CREATE FUNCTION students_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.student_id_card, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_students_search BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION students_search_update();
```

### Phase 4 Trigger: When to Introduce OpenSearch

**Only introduce OpenSearch when ALL of these conditions are met:**

1. PostgreSQL FTS queries exceed 500ms p95 on indexed columns
2. More than 50 concurrent search requests per second sustained
3. Multi-language stemming required (Hindi, Marathi, etc.) beyond PostgreSQL dictionary support
4. Faceted search required (filter by grade + subject + date range simultaneously)
5. Relevance tuning needed beyond `ts_rank` capabilities

**DO NOT introduce OpenSearch before these thresholds.** The operational cost (cluster management, index rebuilds, data sync) outweighs the benefit at early scale.

### Search API Endpoints

```
GET /api/v1/{tenant}/search?q=rahul&entity=students&page=1&pageSize=20
GET /api/v1/{tenant}/search?q=algebra&entity=homework&page=1&pageSize=20
GET /api/v1/{tenant}/search?q=sharma&entity=all&page=1&pageSize=20       # Phase 3: unified search
```

### Security Constraint

All search queries are tenant-scoped. `tenant_id` is always the first filter applied. Global search (Phase 3+) NEVER crosses tenant boundaries.

---

## 4.12 Backend AI Module

The backend contains an **AI Module** for AI tasks triggered by backend operations (teacher clicks "Generate Homework" in the UI, backend auto-grades a submission, scheduled parent summary generation). This is different from the AI Chat Service which handles conversational interactions.

### Distinction: Backend AI Module vs AI Chat Service

| Aspect | Backend AI Module | AI Chat Service |
|--------|------------------|------------------|
| **Location** | Inside the NestJS backend (`server/src/modules/ai/`) | Separate repository (`ai_chat/`) |
| **Triggered by** | Backend business logic (API handlers, BullMQ jobs) | User messages (Telegram, WhatsApp, WebChat) |
| **Runs as** | Part of backend process (sync or async BullMQ job) | Standalone FastAPI service |
| **Use cases** | Homework generation, auto-grading, report summaries, OCR | Conversational chatbot, intent classification, leave via chat |
| **Data access** | Direct Prisma (same process) | Via backend REST APIs (x-api-key) |
| **AI providers** | Same provider abstraction, same per-tenant config | Same provider abstraction, same per-tenant config |

### AI Tasks in Backend

| Task Code | Trigger | Implementation |
|-----------|---------|----------------|
| `homework.ai_generate` | Teacher clicks "AI Generate" in homework creation form | BullMQ job → AI provider → returns structured questions JSON |
| `grading.auto_evaluate` | Teacher enables auto-grade on homework | BullMQ job per submission → AI provider → returns score + feedback |
| `report.parent_summary` | Weekly scheduled cron job | BullMQ job per student → AI provider → returns narrative summary |
| `ocr.extract_text` | Student submits handwritten homework photo | BullMQ job → AI provider (vision model) → returns extracted text |
| `image.quality_check` | Student uploads homework image | Sync check → AI provider (vision model) → returns quality score |

### Implementation

```typescript
// server/src/modules/ai/ai.module.ts
@Module({
  providers: [AITaskService, AIProviderRegistry, BullMQ],
  exports: [AITaskService]
})
export class AIModule {}

// server/src/modules/ai/ai-task.service.ts
@Injectable()
export class AITaskService {
  constructor(
    private providerRegistry: AIProviderRegistry,
    private configEngine: ConfigurationEngine,
    private jobQueue: BullMQ
  ) {}
  
  /** Async — queued as BullMQ job */
  async generateHomework(tenantId: string, params: GenerateHomeworkParams): Promise<string> {
    const jobId = await this.jobQueue.add('ai.generate_homework', { tenantId, params });
    return jobId; // Client polls for result or receives via WebSocket
  }
  
  /** Async — queued as BullMQ job */
  async autoGradeSubmission(tenantId: string, submissionId: string): Promise<string> {
    const jobId = await this.jobQueue.add('ai.auto_grade', { tenantId, submissionId });
    return jobId;
  }
  
  /** Internal — executed by worker */
  async executeGenerateHomework(job: Job): Promise<HomeworkResult> {
    const config = await this.configEngine.get(job.data.tenantId, 'ai');
    const provider = this.providerRegistry.getForTask(config, 'homework.ai_generate');
    const taskDef = await this.getTaskDefinition(job.data.tenantId, 'homework.ai_generate');
    
    return provider.structured({
      model: taskDef.model,
      systemPrompt: this.renderTemplate(taskDef.system_prompt_template, job.data.params),
      prompt: this.renderTemplate(taskDef.user_prompt_template, job.data.params),
      schema: taskDef.output_schema,
      temperature: taskDef.temperature
    });
  }
}
```

### Shared AI Provider Configuration

Both the Backend AI Module and the AI Chat Service use the **same per-tenant AI configuration** stored in the backend:

- `ai_config.default_provider` — default provider for the tenant
- `ai_config.model_mapping` — per-task provider/model selection
- `ai_config.cost_limits` — daily/monthly budget
- `ai_config.language` — primary language, supported languages

The Backend AI Module reads this directly via `ConfigurationEngine`. The AI Chat Service reads it via the Config API (`GET /api/v1/{tenant}/config/ai`).

---

> **Next:** See [`05-frontend-spec.md`](./05-frontend-spec.md) for customer-facing frontend specification.
