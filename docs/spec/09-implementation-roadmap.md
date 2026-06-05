# 9. Implementation Roadmap (Engine-First)

> **Status:** Updated — Post-Architecture-Review  
> **Last Updated:** 2026-06-05

---

## 9.1 Roadmap Overview

```
Phase 0: Engine Foundation (Weeks 1-4) ⭐ BUILD FIRST
    │
    ├── Reference data tables (replace ALL enums)
    ├── Configuration Engine (hierarchical JSON Schema config)
    ├── Rules Engine (JSON condition/action evaluation)
    ├── Workflow Engine (configurable state machines)
    ├── Event Bus (in-process, Redis later)
    ├── Academic Calendar tables
    ├── Metadata JSONB columns on all entities
    └── Configuration Admin UI (form from JSON Schema)
    │
Phase 1: Business Modules (Weeks 5-12) ⭐ ENGINE-DRIVEN
    │
    ├── Auth + RBAC (Identity Context)
    ├── Academic Structure (grades, sections, subjects, calendar)
    ├── Attendance Module (config-driven statuses, rules-based calc, workflow corrections)
    ├── Homework Module (config-driven grading, AI generation)
    ├── Exam Module (config-driven types + grading + promotion)
    ├── Leave Module (workflow-driven approvals)
    ├── Notification Module (event-driven)
    └── Frontend (dynamic config-driven UI)
    │
Phase 2: Advanced Engines + Scale (Weeks 13-18)
    │
    ├── Metadata Engine (custom fields, dynamic forms)
    ├── Template Engine (report cards, certificates, PDF)
    ├── Workflow Designer UI (visual state machine editor)
    ├── Rules Admin UI (rule editor with tester)
    ├── Hybrid multi-tenant routing (Tier 2-3)
    └── Performance optimization
    │
Phase 3: AI + Advanced Features (Weeks 19-24)
    │
    ├── AI abstraction layer (multi-provider)
    ├── Multi-channel notifications
    ├── Advanced reporting + analytics
    ├── Offline support (PWA)
    └── Multi-language (i18n)
    │
Phase 4: Enterprise (Weeks 25-30)
    │
    ├── Tier 3/4 dedicated deployments
    ├── Audit & compliance
    ├── CI/CD per client
    ├── Monitoring (Prometheus + Grafana + Sentry)
    └── Documentation + Client SDK
```

---

## 9.2 Phase 0 — Engine Foundation (Weeks 1-4) ⭐ CRITICAL PATH

**Goal:** Build infrastructure that makes ALL subsequent modules configurable, not hardcoded.

### Week 1: Database Foundation + Reference Data

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Initialize NestJS project (TypeScript strict, Vitest, ESLint) | P0 | 1d | — |
| Set up Docker Compose (PostgreSQL 16 + Redis 7 + SuperTokens) | P0 | 1d | — |
| Create Prisma schema — **NO business enums** — use reference data tables | P0 | 2d | — |
| Create `attendance_statuses`, `assessment_types`, `leave_types`, `notification_type_defs`, `homework_categories` reference data tables | P0 | 1d | Schema |
| Create `academic_years` + `academic_terms` tables | P0 | 0.5d | Schema |
| Add `metadata JSONB` column to Student, Staff, Homework, Exam tables | P0 | 0.5d | Schema |
| Create engine tables: `config_schemas`, `tenant_configs`, `config_templates`, `rule_sets`, `rules`, `workflow_definitions`, `workflow_states`, `workflow_transitions`, `workflow_instances`, `workflow_history`, `entity_field_definitions`, `document_templates`, `ai_task_definitions` | P0 | 1d | Schema |
| Run migration + verify | P0 | 0.5d | All above |
| Seed script: 3 tenant configs (School A: Present/Absent/Late + grade bands, School B: +Half Day/Medical + percentage, School C: period-based + GPA) | P0 | 1d | Migration |

### Week 2: Configuration Engine + Event Bus

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Implement ConfigurationEngine service (get, set, validate, history, rollback) | P0 | 2d | Schema |
| Implement JSON Schema validation (AJV or similar) | P0 | 1d | — |
| Implement config inheritance (templates → tenants with overrides) | P0 | 1d | ConfigEngine |
| Define default config templates (CBSE Standard, ICSE, International, State Board) | P0 | 1d | ConfigEngine |
| Implement EventBus (in-process EventEmitter, typed events) | P0 | 1d | — |
| Define all domain event types | P0 | 0.5d | EventBus |
| Write unit tests for ConfigEngine + EventBus | P0 | 1d | All above |

### Week 3: Rules Engine + Workflow Engine

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Implement RulesEngine (condition evaluation, action execution, first-match + all-matches) | P0 | 2d | Schema |
| Define default rule sets: `grading.convert_score`, `attendance.calculate_rate`, `promotion.eligibility` | P0 | 1d | RulesEngine |
| Implement WorkflowEngine (start, transition, getAvailableTransitions, actor resolution) | P0 | 2d | Schema |
| Define default workflows: `leave_approval` (School A: 2-step, School B: 3-step, School C: conditional) | P0 | 1d | WorkflowEngine |
| Write unit tests for RulesEngine + WorkflowEngine | P0 | 1.5d | All above |

### Week 4: Config Admin UI + Integration

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Build Config API endpoints (GET/PUT config, history, rollback, convenience endpoints) | P0 | 1d | ConfigEngine |
| Build Rules API endpoints (list/get/update rules) | P0 | 0.5d | RulesEngine |
| Build Workflow API endpoints (list/get/update workflows) | P0 | 0.5d | WorkflowEngine |
| **Configuration Admin UI** — dynamic form generated from JSON Schema | P0 | 2d | Config API |
| **Attendance Statuses editor** — add/remove/reorder statuses, set weights, colors | P0 | 1d | Config UI |
| **Grading Scale editor** — grade bands, percentage mode, GPA mode | P0 | 1d | Config UI |
| Integration tests: ConfigEngine with 3 school configs, RulesEngine with all rule sets, WorkflowEngine with all workflows | P0 | 2d | All above |

### Phase 0 Exit Criteria

- [ ] Zero Prisma business enums in schema (only Role + Permission enums remain, which are platform-level)
- [ ] All 3 demo schools have complete configs (attendance, grading, calendar, workflows)
- [ ] Configuration Engine can save, validate, version, and rollback any config schema
- [ ] Rules Engine correctly evaluates grading and attendance rules for all 3 schools
- [ ] Workflow Engine correctly routes leave approval through different chains per school
- [ ] Event Bus delivers events between contexts
- [ ] Config Admin UI allows editing attendance statuses and grading scales without code changes
- [ ] All unit + integration tests pass

---

## 9.3 Phase 1 — Business Modules (Weeks 5-12)

**Goal:** Build all business modules ON TOP of the engine layer. Every module uses engines — nothing is hardcoded.

### Week 5-6: Auth + Academic Structure

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| SuperTokens Docker setup + Auth Service | P0 | 1d | Phase 0 Docker |
| JWT token service (issue, verify, refresh) | P0 | 1d | — |
| Auth controller (login, logout, refresh, me) | P0 | 1d | JWT |
| Tenant context middleware (AsyncLocalStorage) | P0 | 1d | — |
| RBAC engine: Permission + RolePermission + UserPermission + guards | P0 | 2d | — |
| Audit logging service (all mutations + engine changes) | P0 | 1d | — |
| Academic Structure Context: Tenants, Grades, Sections, Subjects, Classes | P0 | 2d | — |
| Student + Staff + Teacher profiles (with metadata JSONB) | P0 | 2d | Academic Structure |
| Bulk import (CSV) for students, teachers, parents | P1 | 1d | — |
| Auth + Academic Structure integration tests | P0 | 1d | All above |

### Week 7-8: Attendance Module (Config-Driven)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Attendance API — CRUD with dynamic status validation from ConfigEngine | P0 | 1d | ConfigEngine + Auth |
| Roll-call service — loads statuses from ConfigEngine, marks with tenant-defined codes | P0 | 1d | Attendance API |
| Attendance calculation — delegates to RulesEngine (not hardcoded math) | P0 | 1d | RulesEngine |
| Correction workflow — uses WorkflowEngine (not hardcoded steps) | P0 | 1d | WorkflowEngine |
| Attendance events → NotificationContext listens | P0 | 0.5d | EventBus |
| Low-attendance detection — rules-driven threshold per tenant | P0 | 1d | RulesEngine |
| Attendance integration tests (3 school configs) | P0 | 1d | All above |

### Week 9-10: Homework + Exam Modules (Config-Driven)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Homework CRUD API | P0 | 1.5d | Academic Structure + Auth |
| Submission + grading API (grade via RulesEngine) | P0 | 1.5d | RulesEngine |
| Homework templates | P0 | 0.5d | — |
| AI homework generator (delegates to AI service) | P0 | 1d | AI Service |
| Exam CRUD API (exam types from reference data) | P0 | 1d | Academic Structure |
| Score entry + grade calculation via RulesEngine | P0 | 1d | RulesEngine |
| Promotion eligibility via RulesEngine | P0 | 1d | RulesEngine |
| Rubric grading | P0 | 1d | — |
| Homework + Exam integration tests (3 school grading configs) | P0 | 1.5d | All above |

### Week 11: Leave + Notification Modules (Workflow-Driven + Event-Driven)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Leave API — apply, approve (delegates to WorkflowEngine) | P0 | 1.5d | WorkflowEngine |
| Leave type definitions from reference data | P0 | 0.5d | ConfigEngine |
| Notification service — send via providers | P0 | 1d | — |
| Notification event handlers (listen to Attendance, Homework, Leave events) | P0 | 1.5d | EventBus |
| Notification inbox API (mark read, preferences) | P0 | 1d | — |
| Leave + Notification integration tests (3 workflow configs) | P0 | 1.5d | All above |

### Week 12: Frontend (Config-Driven UI)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Initialize Next.js 14 project + shadcn/ui + Tailwind | P0 | 0.5d | — |
| TanStack Query + Zustand + React Hook Form setup | P0 | 0.5d | — |
| Generated API client from OpenAPI specs | P0 | 0.5d | Backend APIs |
| **TenantConfig bootstrap** — fetch on load, apply branding, set feature flags | P0 | 0.5d | Config API |
| **Dynamic attendance UI** — status toggles rendered from ConfigEngine (not hardcoded) | P0 | 1d | Attendance API |
| **Dynamic grading display** — grade badges, percentage bars, GPA display from config | P0 | 1d | Homework/Exam APIs |
| **Dynamic workflow UI** — available transitions rendered from WorkflowEngine | P0 | 1d | Workflow API |
| Login page + auth flow | P0 | 1d | Auth API |
| Dashboard layouts (teacher, principal, parent, student) | P0 | 1.5d | All APIs |
| Admin pages (subjects, classes, sections, users, permissions, config) | P0 | 1.5d | Admin APIs |
| Reports pages (config-driven columns + export) | P1 | 1d | Report APIs |

---

## 9.4 Phase 2 — Advanced Engines + Scale (Weeks 13-18)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| **Metadata Engine** — field definitions CRUD, dynamic form generation, validation | P0 | 2d | Phase 0 Schema |
| **Metadata Admin UI** — custom field manager per entity, form builder | P0 | 2d | Metadata Engine |
| **Template Engine** — Handlebars compiler, data gathering, Puppeteer PDF | P0 | 3d | — |
| **Template Admin UI** — template designer with component palette + live preview | P0 | 3d | Template Engine |
| Default report card template (CBSE standard) | P0 | 1d | Template Engine |
| **Workflow Designer UI** — visual state machine editor | P0 | 2d | Workflow Engine |
| **Rules Admin UI** — rule editor with live tester | P0 | 2d | Rules Engine |
| Hybrid multi-tenant connection manager (Tier 1/2/3 routing) | P1 | 2d | — |
| Redis caching layer (config cache, permission cache, query cache) | P1 | 2d | — |
| Rate limiting — per-tenant, per-endpoint | P1 | 1d | — |
| Performance + load testing | P1 | 2d | All above |
| Second + third client deployment (demonstrate 3 diverse schools) | P0 | 2d | Frontend |

---

## 9.5 Phase 3 — AI + Advanced Features (Weeks 19-24)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| **AI Provider abstraction** — interface + OpenAI/Anthropic/Google providers | P0 | 2d | — |
| Configurable AI task definitions per tenant (prompts, models, schemas) | P0 | 2d | AI abstraction |
| Migrate existing LangGraph chatbot to use abstraction layer | P0 | 2d | AI abstraction |
| AI usage/cost tracking | P0 | 1d | — |
| Multi-channel notification delivery (Push, SMS, Email, WhatsApp, Telegram) | P1 | 3d | Notification service |
| Notification preference management per user | P1 | 1d | — |
| Advanced reporting (custom report builder, scheduled reports) | P1 | 3d | Report module |
| Teacher/Principal analytics dashboards (charts, trends, weak-student detection) | P1 | 3d | — |
| Offline support (PWA + IndexedDB queue) | P1 | 2d | Frontend |
| Multi-language i18n framework (English, Hindi, Marathi — extensible) | P1 | 2d | Frontend |
| Parent weekly summary digests (AI-generated) | P2 | 2d | AI abstraction |

---

## 9.6 Phase 4 — Enterprise (Weeks 25-30)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Tier 3/4 infrastructure (dedicated DB + dedicated instance provisioning) | P2 | 3d | Multi-tenant manager |
| Full audit trail UI + compliance reports | P2 | 2d | Audit logging |
| Data export/deletion automation (GDPR compliance) | P2 | 2d | — |
| Prometheus metrics + Grafana dashboards | P2 | 2d | — |
| Sentry error tracking (backend + frontend) | P2 | 1d | — |
| CI/CD pipeline (GitHub Actions) — test → build → deploy per client | P2 | 3d | — |
| Documentation portal (API docs, integration guides, onboarding guides) | P2 | 3d | — |
| Client SDK (JavaScript/TypeScript) | P2 | 3d | — |
| Security audit + penetration testing | P2 | 3d | — |

---

## 9.7 Critical Dependency Graph

```
Phase 0: Engine Foundation
    │
    ├── Reference Data Tables ──── (foundation for everything)
    │       │
    │       ├── Configuration Engine ── (attendance statuses, grading scales, calendars)
    │       │       │
    │       │       └── Config Admin UI
    │       │
    │       ├── Rules Engine ────────── (grade calc, attendance calc, promotion)
    │       │       │
    │       │       └── ALL business modules depend on this
    │       │
    │       ├── Workflow Engine ──────── (leave approvals, corrections, admissions)
    │       │       │
    │       │       └── Leave Module depends on this
    │       │
    │       └── Event Bus ───────────── (inter-context communication)
    │               │
    │               └── Notification + Reporting contexts depend on this
    │
    ├── Auth + RBAC ───────────────── (phase 1 prerequisite)
    │
    └── Academic Structure ────────── (phase 1 prerequisite)
            │
            ├── Attendance Module (config + rules + workflow driven)
            ├── Homework Module (config + rules driven)
            ├── Exam Module (config + rules driven)
            └── Leave Module (workflow driven)
                    │
                    └── Frontend (dynamic config-driven UI for all above)
```

---

## 9.8 Risk Mitigation

| Risk | Mitigation | Owner |
|------|-----------|-------|
| **Engine complexity delays Phase 1** | Build minimum viable engine — simple condition/action rules, 2-3 workflow examples. Add complexity in Phase 2 | Backend Lead |
| **Config migration from old system** | Write migration scripts to convert old enums → reference data. Dual-write during transition | Data Lead |
| **Performance with JSONB metadata** | GIN indexes, field definition caching, limit custom fields to 50 per entity | Backend Lead |
| **Workflow engine edge cases** | Thorough testing of all transition paths, timeout handling, escalation rules | QA Lead |
| **Frontend dynamic rendering complexity** | Shared components for config-driven UI (StatusBadge, GradeDisplay, WorkflowStepper). Don't build from scratch each time | Frontend Lead |

---

> **Next:** See [`20-extensibility-migration.md`](./20-extensibility-migration.md) for detailed migration strategy from the old architecture.
