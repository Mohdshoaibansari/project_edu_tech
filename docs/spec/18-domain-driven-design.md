# 18. Domain-Driven Design — Bounded Contexts

> **Status:** Draft — Pre-Implementation  
> **Purpose:** Define proper bounded contexts with explicit boundaries, ubiquitous language, and context mapping for the EduTech platform.

---

## 18.1 Current Module Structure vs Bounded Contexts

The current specification organizes code as:

```
modules/
├── attendance/
├── homework/
├── exams/
├── leave/
├── notifications/
├── reports/
├── users/
├── tenants/
└── auth/
```

**Problem:** These are not bounded contexts. They are feature folders that freely import from each other (e.g., `attendance.service.ts` imports `notification.service.ts` directly). This creates high coupling and prevents independent evolution.

---

## 18.2 Proposed Bounded Contexts

### Context Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EDU TECH PLATFORM                                │
│                                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                 │
│  │   IDENTITY   │   │   ACADEMIC   │   │  ASSESSMENT  │                 │
│  │   CONTEXT    │   │   STRUCTURE  │   │   CONTEXT    │                 │
│  │              │   │   CONTEXT    │   │              │                 │
│  │ - Users      │   │ - Tenants   │   │ - Grading    │                 │
│  │ - Roles      │   │ - Classes   │   │ - Exams      │                 │
│  │ - Auth       │   │ - Sections  │   │ - Homework   │                 │
│  │ - Sessions   │   │ - Subjects  │   │ - Rubrics    │                 │
│  └──────┬───────┘   │ - Calendar  │   │ - ReportCards│                 │
│         │           └──────┬───────┘   └──────┬───────┘                 │
│         │                  │                  │                          │
│  ┌──────▼───────┐   ┌──────▼───────┐   ┌──────▼───────┐                 │
│  │  ATTENDANCE  │   │     LEAVE    │   │ COMMUNICATION│                 │
│  │   CONTEXT    │   │   CONTEXT    │   │   CONTEXT    │                 │
│  │              │   │              │   │              │                 │
│  │ - Attendance │   │ - Leave Req  │   │ - Notify     │                 │
│  │ - Correction │   │ - Approval   │   │ - Chatbot    │                 │
│  │ - Tracking   │   │ - Workflows  │   │ - Messaging  │                 │
│  └──────────────┘   └──────────────┘   └──────────────┘                 │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    CROSS-CUTTING CONTEXTS                         │   │
│  │                                                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │   │
│  │  │ CONFIGURATION│  │   WORKFLOW   │  │     REPORTING        │   │   │
│  │  │   CONTEXT    │  │   CONTEXT    │  │     CONTEXT          │   │   │
│  │  │              │  │              │  │                       │   │   │
│  │  │ - Config     │  │ - State Mach │  │ - Report Generation   │   │   │
│  │  │ - Rules      │  │ - Approval   │  │ - Templates           │   │   │
│  │  │ - Metadata   │  │ - Actor Res  │  │ - Analytics           │   │   │
│  │  │ - Templates  │  │ - History    │  │ - Export              │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 18.3 Context Definitions

### 1. Identity Context

| Aspect | Description |
|--------|-------------|
| **Responsibility** | User identity, authentication, authorization, session management |
| **Aggregates** | `User`, `Role`, `Permission`, `Session` |
| **Ubiquitous Language** | User, Role, Permission, Login, Logout, Session, Token, Tenant |
| **Public API (events)** | `UserCreated`, `UserDeactivated`, `RoleAssigned`, `PermissionChanged` |
| **Anti-Corruption Layer** | Translates SuperTokens user ID → internal User ID |
| **Does NOT contain** | Student profile, teacher profile — these are in Academic Structure |

### 2. Academic Structure Context

| Aspect | Description |
|--------|-------------|
| **Responsibility** | School organizational structure: tenants, grades, sections, subjects, academic calendar |
| **Aggregates** | `Tenant`, `Grade`, `Section`, `Subject`, `Class`, `AcademicTerm`, `Student`, `Teacher`, `Staff`, `Parent` |
| **Ubiquitous Language** | Grade, Section, Subject, Class Teacher, Homeroom, Term, Semester, Trimester |
| **Public API (events)** | `StudentEnrolled`, `TeacherAssigned`, `ClassCreated`, `TermStarted`, `TermEnded` |
| **Depends on** | Identity Context (for User references) |
| **Does NOT contain** | Attendance records, exam scores — those are in Attendance/Assessment |

### 3. Attendance Context

| Aspect | Description |
|--------|-------------|
| **Responsibility** | Daily/period attendance marking, correction, tracking, low-attendance detection |
| **Aggregates** | `AttendanceRecord`, `AttendanceCorrection`, `AttendanceSummary` |
| **Ubiquitous Language** | Present, Absent, Late, Half-Day, Medical Leave, Mark Attendance, Correct, Period, Daily |
| **Public API (events)** | `AttendanceMarked`, `AttendanceCorrected`, `LowAttendanceAlert` |
| **Depends on** | Academic Structure (for Class, Student), Configuration (for status definitions) |
| **Does NOT contain** | Attendance calculation formula — that's in Rules Engine (Configuration Context) |

### 4. Assessment Context

| Aspect | Description |
|--------|-------------|
| **Responsibility** | Exams, homework, grading, rubric evaluation, report card data assembly |
| **Aggregates** | `Exam`, `ExamScore`, `Homework`, `HomeworkSubmission`, `Rubric`, `RubricEvaluation`, `GradeResult` |
| **Ubiquitous Language** | Exam, Test, Score, Grade, Grade Point, GPA, Rubric, Criterion, Submission, Evaluation |
| **Public API (events)** | `ExamCreated`, `ScoreEntered`, `HomeworkSubmitted`, `HomeworkGraded`, `GradeCalculated` |
| **Depends on** | Academic Structure (for Class, Student), Configuration (for grading scale), Rules Engine (for grade calculation) |
| **Does NOT contain** | Report card generation — that's in Reporting Context |

### 5. Leave Context

| Aspect | Description |
|--------|-------------|
| **Responsibility** | Leave applications, approval workflows, leave balance tracking |
| **Aggregates** | `LeaveRequest`, `LeaveBalance`, `LeaveType` |
| **Ubiquitous Language** | Apply, Approve, Reject, Forward, Leave Type, Leave Balance, Sick Leave, Casual Leave |
| **Public API (events)** | `LeaveApplied`, `LeaveApproved`, `LeaveRejected`, `LeaveBalanceUpdated` |
| **Depends on** | Academic Structure (for Student, Staff), Workflow Engine (for approval chains), Identity (for actor resolution) |

### 6. Communication Context

| Aspect | Description |
|--------|-------------|
| **Responsibility** | Notifications, messaging, AI chatbot interaction, parent communication |
| **Aggregates** | `Notification`, `NotificationPreference`, `ChatSession`, `ChatMessage`, `Announcement` |
| **Ubiquitous Language** | Notify, Alert, Send, Channel, Read, Unread, Chat, Intent, Response |
| **Public API (events)** | `NotificationSent`, `NotificationRead`, `ChatMessageReceived`, `ChatResponseGenerated` |
| **Depends on** | Identity (for User), Events from other contexts (for notification triggers) |

### 7. Configuration Context (Cross-Cutting)

| Aspect | Description |
|--------|-------------|
| **Responsibility** | Configuration engine, rules engine, workflow engine, metadata engine, template engine |
| **Aggregates** | `ConfigSchema`, `TenantConfig`, `RuleSet`, `Rule`, `WorkflowDefinition`, `WorkflowInstance`, `FieldDefinition`, `DocumentTemplate` |
| **Ubiquitous Language** | Configure, Schema, Rule, Condition, Action, Transition, State, Field, Template, Bind |
| **Public API** | ConfigurationService, RulesEngine, WorkflowEngine, MetadataEngine, TemplateEngine |
| **Does NOT depend on** | Any business context — it's generic infrastructure |

### 8. Reporting Context (Cross-Cutting) — DEFERRED

| Aspect | Description |
|--------|-------------|
| **Responsibility** | Report generation, analytics, data export, dashboards, cross-year trends, performance metrics |
| **Aggregates** | `Report`, `Dashboard`, `Export`, `GeneratedDocument`, `AnalyticsView` |
| **Ubiquitous Language** | Report, Dashboard, Export, Chart, Metric, KPI, Filter, Date Range, Snapshot, Trend, Cohort |
| **Depends on** | ALL business contexts (reads data, never writes), Template Engine (for formatted output) |

#### Phased Build Strategy

| Phase | Capability | Implementation |
|-------|-----------|---------------|
| **Phase 1** (with business modules) | Basic dashboards + CSV/Excel/PDF exports. Direct query from transactional DB via Prisma | Simple — no isolation needed at this scale |
| **Phase 3** (with advanced engines) | Cross-year analytics, attendance trends, teacher performance, student growth. Scheduled report generation | Introduce **read replica** — reporting queries hit replica, not primary |
| **Phase 4** (enterprise) | Advanced analytics, custom report builder, data warehouse integration | Dedicated **analytics database** (materialized views, pre-aggregated cubes) |

#### Database Isolation Rule

> **Intensive analytical queries MUST never run against transactional (OLTP) tables.**

This prevents reporting workloads from:
- Competing with attendance marking, homework submission, and other real-time operations
- Causing lock contention on heavily-written tables
- Degrading API response times during report generation

**Isolation strategy per phase:**

```
Phase 1: Shared DB (acceptable for < 100 tenants, < 10 concurrent reports)
  ┌──────────────┐
  │  PostgreSQL  │  ← All queries (OLTP + OLAP) hit same DB
  │  (Primary)   │
  └──────────────┘

Phase 3: Read Replica isolation
  ┌──────────────┐     ┌──────────────┐
  │  PostgreSQL  │────▶│  PostgreSQL  │
  │  (Primary)   │     │  (Read        │  ← Reporting queries only
  │  OLTP writes │     │   Replica)    │
  └──────────────┘     └──────────────┘

Phase 4: Analytics DB (materialized views + pre-aggregation)
  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
  │  PostgreSQL  │────▶│  PostgreSQL  │────▶│  Analytics DB    │
  │  (Primary)   │     │  (Replica)   │     │  (Materialized   │
  │              │     │              │     │   Views + Cubes) │
  └──────────────┘     └──────────────┘     └──────────────────┘
```

#### Reporting Data Patterns

| Pattern | Use Case | Implementation |
|---------|----------|---------------|
| **Live dashboard** | Teacher sees today's attendance | Direct query, cached 60s |
| **Periodic snapshot** | Monthly attendance report | Background job (BullMQ) generates snapshot to `report_snapshots` table |
| **Pre-aggregated metric** | School-wide attendance rate | Materialized view refreshed hourly |
| **Cross-year analysis** | Student growth from Grade 5→6 | Read replica query joining historical academic years |
| **Export** | Download attendance as Excel | Background job generates file → signed URL → download |

#### Anti-Patterns (Prohibited)

- ❌ `SELECT COUNT(*) FROM attendance` without date range on every dashboard load
- ❌ Joining 5 tables with `GROUP BY` on transactional tables during peak hours
- ❌ Generating PDF reports synchronously in API handlers
- ❌ Running `EXPLAIN ANALYZE`-heavy queries on the primary at 8 AM (attendance rush hour)

---

## 18.4 Context Relationships

```
                    ┌──────────────┐
                    │   IDENTITY   │
                    │   CONTEXT    │
                    └──────┬───────┘
                           │ (User references)
              ┌────────────┼────────────┐
              ▼            ▼            ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  ACADEMIC   │ │  ATTENDANCE │ │  ASSESSMENT │
    │  STRUCTURE  │ │             │ │             │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           │    ┌──────────┼───────────────┘
           │    │          │
           ▼    ▼          ▼
    ┌─────────────┐ ┌─────────────┐
    │    LEAVE    │ │COMMUNICATION│
    └──────┬──────┘ └──────┬──────┘
           │               │
           └───────┬───────┘
                   │
    ┌──────────────▼──────────────────────────┐
    │         CROSS-CUTTING CONTEXTS           │
    │                                          │
    │  ┌──────────────┐  ┌──────────────┐     │
    │  │ CONFIGURATION│  │  REPORTING   │     │
    │  │ (Rules, Wf,  │  │  (Reports,   │     │
    │  │  Metadata,   │  │   Analytics, │     │
    │  │  Templates)  │  │   Dashboards)│     │
    │  └──────────────┘  └──────────────┘     │
    └──────────────────────────────────────────┘
```

---

## 18.5 Context Integration Patterns

### Shared Kernel (Allowed in Limited Cases)

```typescript
// Shared across ALL contexts
// shared-kernel/
//   types/
//     tenant-id.ts       — TenantId branded type
//     user-id.ts         — UserId branded type
//     student-id.ts      — StudentId branded type
//     class-id.ts        — ClassId branded type
//   errors/
//     not-found.error.ts
//     forbidden.error.ts
//     validation.error.ts
```

### Published Language (OpenAPI Contracts)

Each context publishes its API as an OpenAPI spec. Other contexts consume it.

### Event-Driven (Async Communication)

```typescript
// Attendance Context emits:
eventBus.emit('attendance.marked', {
  tenantId: 'uuid',
  studentId: 'uuid',
  classId: 'uuid',
  status: 'ABSENT',
  date: '2026-06-05'
});

// Communication Context listens:
eventBus.on('attendance.marked', async (event) => {
  if (event.status === 'ABSENT') {
    await notificationService.sendAbsenceAlert(event);
  }
});

// Reporting Context listens:
eventBus.on('attendance.marked', async (event) => {
  await analyticsService.updateDailyStats(event.tenantId, event.date);
});
```

### Anti-Corruption Layer

```typescript
// Identity Context ↔ SuperTokens
class SuperTokensAdapter {
  toInternalUser(superTokensUser: STUser): User {
    return new User({
      id: UserId.create(superTokensUser.id),
      email: superTokensUser.email,
      // Map external to internal
    });
  }
}
```

---

## 18.6 Module Structure (Revised)

```
server/src/
├── contexts/
│   ├── identity/
│   │   ├── domain/          # Aggregates, entities, value objects
│   │   ├── application/     # Use cases, commands, queries
│   │   ├── infrastructure/  # Prisma repos, SuperTokens adapter
│   │   └── interfaces/      # REST controllers, DTOs
│   │
│   ├── academic-structure/
│   ├── attendance/
│   ├── assessment/
│   ├── leave/
│   ├── communication/
│   │
│   ├── configuration/       # Cross-cutting
│   │   ├── config-engine/
│   │   ├── rules-engine/
│   │   ├── workflow-engine/
│   │   ├── metadata-engine/
│   │   └── template-engine/
│   │
│   └── reporting/           # Cross-cutting
│       ├── reports/
│       ├── dashboards/
│       └── exports/
│
├── shared-kernel/            # Shared types, errors, base classes
│   ├── types/
│   ├── errors/
│   ├── events/               # Event bus, event definitions
│   └── database/             # Prisma client, transaction helper
│
└── main.ts
```

---

## 18.7 Key DDD Principles Applied

| Principle | Implementation |
|-----------|---------------|
| **Bounded Context** | Each context has its own ubiquitous language, aggregates, and persistence |
| **Aggregate Root** | `AttendanceRecord` is root of Attendance aggregate; `Homework` is root of Homework aggregate |
| **Domain Events** | Contexts communicate via events, not direct service calls |
| **Anti-Corruption Layer** | SuperTokens adapter, external notification providers |
| **Shared Kernel** | Minimal: branded IDs, error types, event definitions |
| **Context Map** | Documented relationships between all contexts |
| **Repository per Aggregate** | Each aggregate has its own repository, not a generic DAO |

---

> **Next:** See [`20-extensibility-migration.md`](./20-extensibility-migration.md) for Extensibility Review & Migration Plan.
