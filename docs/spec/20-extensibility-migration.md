# 20. Extensibility Review & Migration Plan

> **Status:** Draft — Pre-Implementation  
> **Purpose:** Identify future extensibility risks, propose mitigation strategies, and provide a migration path from the current design.

---

## 20.1 Extensibility Risk Matrix

| Area | Risk | Likelihood | Impact | Mitigation |
|------|------|-----------|--------|------------|
| **New Grading Methods** | Adding a new grading system requires code changes | High | High | Rules Engine + Configuration Engine |
| **New Attendance Models** | Adding period-based, biometric, or QR attendance requires schema changes | High | High | Configuration-driven attendance statuses + Metadata Engine |
| **New Report Formats** | Each school wants different report card layouts | Very High | High | Template Engine with Handlebars |
| **New Curriculum Boards** | CBSE, ICSE, IB, State Boards have different structures | High | Medium | Academic Structure Context + Configuration |
| **New Workflows** | Admission, transfer, fee approval, disciplinary | High | Medium | Workflow Engine |
| **New Notification Channels** | WhatsApp, SMS, IVR, App Push | Medium | Low | Channel abstraction in Communication Context |
| **New Payment Models** | Fee calculation, discounts, late fees | Medium | Medium | Rules Engine for fee calculations |
| **New Integration Requirements** | LMS integration (Moodle, Google Classroom), ERP, Biometric | Medium | Medium | Integration context with adapter pattern |
| **Regulatory Changes** | NEP 2020, RTE compliance, board-specific mandates | Medium | High | Configuration-driven policies, no hardcoded compliance |
| **Multi-Language** | New languages beyond English/Hindi/Marathi | Medium | Low | i18n infrastructure, AI translation in communication context |

---

## 20.2 Design Decisions That Prevent Extensibility (Current Spec)

### ❌ Anti-Pattern 1: Enum-Based Variability

```prisma
// Current spec hardcodes variability in Prisma enums
enum AttendanceStatus { PRESENT, ABSENT_UNEXCUSED, ABSENT_EXCUSED, TARDY, ... }
enum ExamType { UNIT_TEST, MID_TERM, FINAL, QUIZ, ANNUAL, OTHER }
enum NotificationType { ABSENCE_ALERT, LOW_ATTENDANCE, ... }
```

**Fix:** Replace all business enums with reference data tables + configuration JSON.

### ❌ Anti-Pattern 2: Hardcoded Workflows in Service Code

```typescript
// Current spec
if (leave.status === 'PENDING') {
  if (actor.role === 'TEACHER') {
    leave.status = 'WITH_PRINCIPAL';
  } else if (actor.role === 'PRINCIPAL') {
    leave.status = 'APPROVED';
  }
}
```

**Fix:** Workflow Engine with configurable state machines.

### ❌ Anti-Pattern 3: Direct Service-to-Service Calls

```typescript
// Current spec
class AttendanceService {
  async markAttendance() {
    // ... mark attendance
    await this.notificationService.sendAbsenceAlert(); // Tight coupling
  }
}
```

**Fix:** Domain Events — `attendance.marked` event → Communication Context listens.

### ❌ Anti-Pattern 4: No Academic Calendar Model

```typescript
// Current spec: dates are unanchored to academic periods
Student.grade_level: "10th"  // No notion of academic year or term
Exam.date: DateTime           // Not associated with a semester/trimester
```

**Fix:** Academic Calendar as a first-class configuration with terms, exams, holidays.

---

## 20.3 Extensibility Design Principles

| Principle | Description |
|-----------|-------------|
| **Configuration over Code** | Business variability lives in configuration, not code |
| **Events over Direct Calls** | Contexts communicate via domain events, not service imports |
| **Abstractions over Implementations** | AI providers, notification channels, storage backends all behind interfaces |
| **Metadata over Schema Changes** | Custom fields via JSONB + field definitions, not ALTER TABLE |
| **Templates over Hardcoded Views** | Report cards, certificates, forms generated from templates |
| **Plugins over Modifications** | New functionality as plugins/adapters, not core code changes |

---

## 20.4 Migration Plan — From Current Spec to Target Architecture

### Phase 0: Foundation Refactoring (Week 1-2, BEFORE Phase 1 implementation)

| Step | Description | Effort |
|------|-------------|--------|
| 0.1 | Replace all business enums with reference data tables | 2d |
| 0.2 | Add `metadata JSONB` column to all entity tables | 1d |
| 0.3 | Add `academic_calendars` and `academic_terms` tables | 1d |
| 0.4 | Create `entity_field_definitions` table (Metadata Engine foundation) | 1d |
| 0.5 | Set up Event Bus infrastructure (in-process for now, Redis pub/sub later) | 1d |
| 0.6 | Restructure modules as bounded contexts (directory rename + barrel exports) | 2d |
| 0.7 | Add `workflow_definitions`, `workflow_states`, `workflow_transitions` tables | 1d |
| 0.8 | Add `rule_sets`, `rules` tables | 1d |

### Phase 1A: Configuration Engine (Week 3-4)

| Step | Description | Effort |
|------|-------------|--------|
| 1.1 | Implement Configuration Engine with JSON Schema validation | 3d |
| 1.2 | Migrate existing flat configs to structured schemas | 2d |
| 1.3 | Build Configuration Admin UI (form generated from JSON Schema) | 2d |
| 1.4 | Implement config inheritance (templates → tenants) | 1d |
| 1.5 | Define default config templates (CBSE, ICSE, International) | 1d |

### Phase 1B: Rules Engine (Week 5-6)

| Step | Description | Effort |
|------|-------------|--------|
| 1.6 | Implement Rules Engine (condition evaluation + action execution) | 3d |
| 1.7 | Migrate grading logic to rules | 2d |
| 1.8 | Migrate attendance calculation to rules | 1d |
| 1.9 | Migrate promotion eligibility to rules | 1d |
| 1.10 | Build Rules Admin UI | 2d |

### Phase 1C: Workflow Engine (Week 7-8)

| Step | Description | Effort |
|------|-------------|--------|
| 1.11 | Implement Workflow Engine (state machine + transition execution) | 3d |
| 1.12 | Migrate leave approval to workflow definitions | 2d |
| 1.13 | Migrate attendance correction to workflow definitions | 1d |
| 1.14 | Build Workflow Designer UI | 2d |

### Phase 1D: Event-Driven Decoupling (Week 9-10)

| Step | Description | Effort |
|------|-------------|--------|
| 1.15 | Set up domain event definitions for all contexts | 1d |
| 1.16 | Refactor services to emit events instead of direct calls | 3d |
| 1.17 | Communication Context subscribes to events for notifications | 2d |
| 1.18 | Reporting Context subscribes for analytics updates | 2d |

### Phase 2: Metadata + Template Engines (Week 11-14)

| Step | Description | Effort |
|------|-------------|--------|
| 2.1 | Implement Metadata Engine (field definitions, validation, dynamic forms) | 3d |
| 2.2 | Build Custom Fields Admin UI | 2d |
| 2.3 | Implement Template Engine (Handlebars + Puppeteer for PDF) | 3d |
| 2.4 | Build Report Card template (default CBSE) | 2d |
| 2.5 | Build Certificate templates | 1d |
| 2.6 | Build Template Designer UI | 3d |

### Phase 3: AI Abstraction (Week 15-16)

| Step | Description | Effort |
|------|-------------|--------|
| 3.1 | Implement AI Provider abstraction layer | 2d |
| 3.2 | Implement OpenAI + Anthropic providers | 2d |
| 3.3 | Implement configurable AI task definitions | 2d |
| 3.4 | Migrate existing LangGraph agent to use abstraction layer | 2d |
| 3.5 | Add multi-channel support (WhatsApp, Web Chat) | 2d |

---

## 20.5 Migration Strategy — Minimizing Risk

### Approach: Strangler Fig Pattern

Don't rewrite everything at once. Incrementally replace parts of the monolith:

```
Phase 1-6 (Current Spec):
  ┌──────────────────────────────────────┐
  │  MONOLITH (Next.js API)              │
  │  ┌────────┐ ┌────────┐ ┌──────────┐ │
  │  │Attendance│ │Homework│ │  Exams   │ │
  │  │ Service  │ │Service │ │ Service  │ │
  │  └────────┘ └────────┘ └──────────┘ │
  │  ┌────────┐ ┌────────────────────┐   │
  │  │ Leave  │ │  Notifications     │   │
  │  │Service │ │  Service           │   │
  │  └────────┘ └────────────────────┘   │
  └──────────────────────────────────────┘

Phase 0-2 (Foundation + Engines):
  ┌──────────────────────────────────────┐
  │  MONOLITH + ENGINES                   │
  │  ┌────────┐ ┌────────┐ ┌──────────┐ │
  │  │Attendance│ │Homework│ │  Exams   │ │
  │  │ Service  │ │Service │ │ Service  │ │
  │  └────┬─────┘ └───┬────┘ └────┬─────┘ │
  │       │           │           │        │
  │  ┌────▼───────────▼───────────▼─────┐ │
  │  │     ENGINES (new)                │ │
  │  │  Config │ Rules │ Workflow       │ │
  │  └──────────────────────────────────┘ │
  └──────────────────────────────────────┘

Phase 3+ (Decoupled Services):
  ┌─────────┐ ┌─────────┐ ┌───────────┐
  │ Identity│ │Academic │ │ Assessment│
  │ Context │ │Structure│ │  Context  │
  └────┬────┘ └────┬────┘ └─────┬─────┘
       │           │             │
  ┌────▼───────────▼─────────────▼─────┐
  │        EVENT BUS                    │
  └────┬───────────┬─────────────┬─────┘
       │           │             │
  ┌────▼────┐ ┌───▼────┐ ┌─────▼──────┐
  │Attendance│ │ Leave │ │Communication│
  │ Context │ │Context│ │  Context   │
  └─────────┘ └───────┘ └────────────┘
```

---

## 20.6 Backward Compatibility Guarantees

| Guarantee | How |
|-----------|-----|
| **Existing APIs continue working** | API versioning — v1 endpoints unchanged, new engines sit behind v2 |
| **Existing database schema preserved** | Additive migrations only — new columns/tables, never rename/drop |
| **Existing frontend unaffected** | Feature flags — new engines off by default for existing tenants |
| **Data integrity maintained** | Dual-write during migration — old + new paths until verified |
| **Rollback possible** | Feature flags per tenant — disable new engine, fall back to old code |

---

## 20.7 Summary — What Changes vs What Stays

### What Changes (Significantly)

| From | To |
|------|----|
| Prisma enums for business values | Reference data tables + Configuration Engine |
| Hardcoded `if/else` grading logic | Rules Engine with configurable conditions |
| Hardcoded approval chains | Workflow Engine with configurable state machines |
| Direct service imports | Domain Events via Event Bus |
| Fixed database columns for custom fields | JSONB metadata + Metadata Engine |
| No document generation | Template Engine with Handlebars + PDF |
| Tightly coupled AI (LangChain only) | AI abstraction layer with multiple providers |
| Flat module structure | Bounded Contexts with DDD patterns |

### What Stays (Proven Good)

| Component | Status |
|-----------|--------|
| Multi-tenant data isolation (`tenant_id`) | ✅ Unchanged |
| Decoupled frontend/backend | ✅ Unchanged |
| SuperTokens + JWT auth | ✅ Unchanged |
| RBAC permission model | ✅ Unchanged |
| API-first, contract-driven development | ✅ Unchanged |
| DTO-based APIs | ✅ Unchanged |
| Audit logging | ✅ Unchanged |
| Prisma as ORM | ✅ Unchanged |
| NestJS for backend | ✅ Unchanged |
| Next.js + shadcn/ui for frontend | ✅ Unchanged |

---

## 20.8 Final Recommendations

1. **DO NOT start Phase 1 implementation as currently specified.** The current specification will fail to serve School B, School C, or School D without code changes.

2. **First complete Phase 0 Foundation Refactoring** (2 weeks) — add the database tables and column changes that the engines need.

3. **Build the Configuration Engine first** — everything else depends on it. Without structured configuration, Rules, Workflows, and Templates cannot function.

4. **Build Rules Engine second** — grading and attendance calculation are core to every school and must be configurable.

5. **Build Workflow Engine third** — leave/approval workflows are the most variable and immediately needed.

6. **Adopt Event Bus for all new inter-context communication.** Do not add new direct service imports.

7. **Build Metadata and Template Engines in Phase 2** — these are important but not blocking the initial rollout.

8. **Implement AI abstraction before adding new AI features.** The existing LangGraph agent can continue to work while the abstraction layer is built alongside.

9. **Pilot with 2-3 diverse schools** to validate configurability before scaling to 100+.

10. **Review these specifications with the team** and update the PRD, architecture, and implementation roadmap documents to reflect the engine-first approach.

---

> **End of Architecture Review Series.**  
> **Next:** Update [`README.md`](./README.md), [`01-prd.md`](./01-prd.md), and [`09-implementation-roadmap.md`](./09-implementation-roadmap.md) to reflect these findings.
