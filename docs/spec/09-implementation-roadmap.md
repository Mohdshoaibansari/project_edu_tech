# 9. Implementation Roadmap (Backend-First)

> **Spec ID:** PLAN-IMPL-001  
> **Status:** Approved  
> **Author:** Architecture & Engineering Team  
> **Created:** 2026-06-05  
> **Last Updated:** 2026-06-05  
> **Related PRD Requirements:** §1.9 Phased Rollout Plan

## Summary

Canonical week-by-week implementation roadmap with tasks, effort estimates, dependencies, and exit criteria. **Build backend first, then frontend.** Backend provides a thin server-rendered admin UI in Phase 0 to configure engines and validate APIs. Customer-facing frontends are built in Phase 2.

> **High-level phase summary:** See [`01-prd.md` §1.9](./01-prd.md) for the executive-level phased rollout overview.

---

## 9.1 Roadmap Overview

```
Phase 0: Backend Engine Foundation + Admin UI (Weeks 1-4) ⭐ BUILD FIRST
    │
    ├── Reference data tables (replace ALL enums)
    ├── Configuration Engine (hierarchical JSON Schema config)
    ├── Rules Engine (JSON condition/action evaluation)
    ├── Workflow Engine (configurable state machines)
    ├── Event Bus (in-process; optional Redis pub/sub for multi-instance deployment)
    ├── Academic Calendar tables
    ├── Metadata JSONB columns on all entities
    ├── Engine API endpoints (Config, Rules, Workflow)
    ├── Backend-Admin UI (server-rendered — configure statuses, grading, workflows)
    ├── OpenAPI specs for ALL modules (contracts built alongside engines)
    └── CI/CD: OpenAPI validation → SDK generation pipeline
    │
Phase 1: Backend Business Modules (Weeks 5-10) ⭐ ENGINE-DRIVEN
    │
    ├── Auth + RBAC (Identity Context)
    ├── Academic Structure (grades, sections, subjects, calendar)
    ├── Attendance Module (config-driven, rules-based, workflow corrections)
    ├── Homework Module (config-driven grading)
    ├── Exam & Grading Module (config-driven types + rules-based grading)
    ├── Leave Module (workflow-driven approvals)
    ├── Notification Module (event-driven)
    ├── Reporting API
    └── Full API test suite (Supertest + config variability tests)
    │
Phase 2: Customer Frontends (Weeks 11-16)
    │
    ├── Generated SDK from completed OpenAPI specs
    ├── App shell (AuthProvider, ErrorBoundary, layouts, routing)
    ├── Design system (DataTable, Form framework, shared components)
    ├── All module frontends (Attendance, Homework, Exams, Leave, Reports, Admin)
    ├── Per-client customization + branding
    ├── PWA (service worker, offline attendance queue)
    └── Frontend test suite (Vitest unit, MSW integration, Playwright E2E)
    │
Phase 3: Advanced Engines + AI (Weeks 17-22)
    │
    ├── Metadata Engine (custom fields, dynamic forms)
    ├── Template Engine (report cards, certificates, PDF)
    ├── Visual designers (Workflow Designer, Rules Editor)
    ├── Internal AI API (endpoints for ai_chat service)
    ├── Multi-channel notifications
    ├── Advanced reporting + analytics
    ├── Multi-language i18n
    └── Integrate ai_chat service (separate repo)
    │
Phase 4: Enterprise + Scale (Weeks 23-28)
    │
    ├── Tier 2-4 multi-tenant routing (separate schemas, dedicated DB, dedicated instances)
    ├── Query optimization; optional Redis caching for performance
    ├── Prometheus + Grafana + Sentry
    ├── Audit & compliance UI
    ├── CI/CD per client
    ├── Documentation portal + Client SDK
    └── Security audit + penetration testing
```

---

## 9.2 Phase 0 — Backend Engine Foundation + Admin UI (Weeks 1-4) ⭐ CRITICAL PATH

**Goal:** Build engines, APIs, and a thin backend-served admin UI. By the end of Phase 0, you can log into the backend admin UI and configure attendance statuses, grading scales, academic calendars, and workflows for any school — all without a customer frontend.

### Week 1: Database Foundation + Reference Data

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Initialize NestJS project (TypeScript strict, Vitest, ESLint, Prettier) | P0 | 1d | — |
| Configure external service connections (DATABASE_URL, SUPERTOKENS_CONNECTION_URI, REDIS_URL via env vars) | P0 | 0.5d | — |
| Configure NestJS MVC (Handlebars templating for admin UI) | P0 | 0.5d | NestJS init |
| Create Prisma schema — **NO business enums** — use reference data tables | P0 | 2d | — |
| Create `attendance_statuses`, `assessment_types`, `leave_types`, `notification_type_defs`, `homework_categories` reference data tables | P0 | 1d | Schema |
| Create `academic_years` + `academic_terms` tables | P0 | 0.5d | Schema |
| Add `metadata JSONB` column to Student, Staff, Homework, Exam tables | P0 | 0.5d | Schema |
| Create engine tables (config_schemas, tenant_configs, config_templates, rule_sets, rules, workflow_definitions, workflow_states, workflow_transitions, workflow_instances, workflow_history, entity_field_definitions, document_templates) | P0 | 1d | Schema |
| Run migration + verify | P0 | 0.5d | All above |
| Seed script: 3 tenant configs (School A: 3-status + grade bands, School B: 5-status + percentage, School C: period-based + GPA) | P0 | 1d | Migration |

### Week 2: Configuration Engine + Event Bus + OpenAPI

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Implement ConfigurationEngine service (get, set, validate, history, rollback) | P0 | 2d | Schema |
| Implement JSON Schema validation (AJV) with i18n-aware error messages | P0 | 1d | — |
| Implement config inheritance (templates → tenants with overrides) | P0 | 1d | ConfigEngine |
| Define default config templates (CBSE, ICSE, International, State Board) | P0 | 1d | ConfigEngine |
| **Build Config API endpoints** (GET/PUT config, history, rollback, convenience endpoints) | P0 | 0.5d | ConfigEngine |
| Implement EventBus (in-process EventEmitter, typed events) | P0 | 1d | — |
| Define all domain event types | P0 | 0.5d | EventBus |
| **Scaffold OpenAPI specs** for all 8 bounded contexts (api-contract.yaml per module) | P0 | 1d | — |
| Write unit tests for ConfigEngine + EventBus | P0 | 1d | All above |

### Week 3: Rules Engine + Workflow Engine + Their APIs + Admin UI

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Implement RulesEngine (condition evaluation, action execution, first-match + all-matches) | P0 | 2d | Schema |
| Define default rule sets: `grading.convert_score`, `attendance.calculate_rate`, `promotion.eligibility` | P0 | 1d | RulesEngine |
| **Build Rules API endpoints** (list/get/create/update rules, test rule) | P0 | 0.5d | RulesEngine |
| Implement WorkflowEngine (start, transition, getAvailableTransitions, actor resolution) | P0 | 2d | Schema |
| Define default workflows: `leave_approval` (2-step, 3-step, conditional) | P0 | 1d | WorkflowEngine |
| **Build Workflow API endpoints** (list/get/create workflows, test transition) | P0 | 0.5d | WorkflowEngine |
| Write unit tests for RulesEngine + WorkflowEngine | P0 | 1.5d | All above |

### Week 4: Backend-Admin UI + Integration Testing

> **The admin UI is served by NestJS using Handlebars templates (or EJS). It is NOT a separate Next.js app.** It lives in `server/src/admin/` and consumes the same REST APIs that future customer frontends will use. This proves the APIs are generic and frontend-agnostic.

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| **Admin layout** — authentication, sidebar navigation, tenant selector | P0 | 0.5d | Auth setup |
| **Attendance Statuses editor** — add/remove/reorder statuses, set code/label (i18n)/color/icon/weight/is_present flag | P0 | 1d | Config API |
| **Grading Scale editor** — select mode (grade bands / percentage / GPA / rubric), define bands with labels/ranges/colors/grade_points | P0 | 1d | Config API |
| **Academic Calendar editor** — create academic years + terms, set dates, term types | P0 | 0.5d | Config API |
| **Workflow Definitions viewer** — view state machines, transitions, actor rules | P0 | 0.5d | Workflow API |
| **Rules viewer** — view rule sets, conditions, actions | P0 | 0.5d | Rules API |
| **Seed data loader UI** — load pre-built templates (CBSE, ICSE, International) for new tenants | P0 | 0.5d | ConfigEngine |
| Integration tests: ConfigEngine with 3 school configs, RulesEngine with all rule sets, WorkflowEngine with all workflows | P0 | 2d | All above |
| **API contract tests** — validate all engine endpoints against their OpenAPI specs | P0 | 1d | OpenAPI specs |

### Phase 0 Exit Criteria

- [ ] Zero Prisma business enums in schema
- [ ] All 3 demo schools have complete configs (attendance, grading, calendar, workflows) — created via admin UI
- [ ] Configuration Engine: save, validate, version, rollback working
- [ ] Rules Engine: correctly evaluates grading and attendance rules for all 3 schools
- [ ] Workflow Engine: correctly routes leave approval through different chains per school
- [ ] Event Bus: delivers events between contexts
- [ ] Admin UI: login → select tenant → configure attendance statuses, grading scales, academic calendar → seed template working
- [ ] OpenAPI specs defined for all 8 bounded contexts
- [ ] CI/CD pipeline: OpenAPI validation → SDK generation → type check passes
- [ ] All unit + integration + contract tests pass

---

## 9.3 Phase 1 — Backend Business Modules (Weeks 5-10)

**Goal:** Build all business modules ON TOP of the engine layer. Every module uses engines — nothing is hardcoded. All APIs are tested and OpenAPI contracts are finalized. No customer frontend yet — the backend-admin UI proves API consumability.

### Week 5-6: Auth + Academic Structure

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Configure SuperTokens connection (SUPERTOKENS_CONNECTION_URI + SUPERTOKENS_API_KEY env vars) + JWT token service | P0 | 0.5d | — |
| JWT token service (issue, verify, refresh, rotate) | P0 | 1d | — |
| Auth controller (login, logout, refresh, me) with OpenAPI spec | P0 | 1d | JWT |
| Tenant context middleware (AsyncLocalStorage) | P0 | 1d | — |
| RBAC engine: Permission + RolePermission + UserPermission tables + guards | P0 | 2d | — |
| Audit logging service (all mutations + engine config changes) | P0 | 1d | — |
| Identity module documentation (README, api-contract, permissions, error-codes) | P0 | 0.5d | All above |
| Academic Structure Context: Tenants, Grades, Sections, Subjects, Classes | P0 | 2d | Auth |
| Student + Staff + Teacher profiles (with metadata JSONB) | P0 | 2d | Academic Structure |
| Bulk import service (CSV → students, teachers, parents) | P1 | 1d | Profiles |
| Auth + Academic Structure integration tests + contract tests | P0 | 1d | All above |

### Week 7-8: Attendance + Homework Modules

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Attendance API — CRUD with dynamic status validation from ConfigEngine | P0 | 1d | ConfigEngine + Auth |
| Roll-call service — loads statuses from ConfigEngine, marks with tenant-defined codes | P0 | 1d | Attendance API |
| Attendance calculation — delegates to RulesEngine (no hardcoded math) | P0 | 1d | RulesEngine |
| Correction workflow — uses WorkflowEngine (configurable approval chains) | P0 | 1d | WorkflowEngine |
| Attendance events → NotificationContext listens | P0 | 0.5d | EventBus |
| Low-attendance detection — rules-driven threshold per tenant | P0 | 1d | RulesEngine |
| Attendance module documentation | P0 | 0.5d | All above |
| Homework CRUD API + lifecycle states (DRAFT → SCHEDULED → PUBLISHED → ARCHIVED) | P0 | 1.5d | Academic Structure |
| Submission API + file upload via signed URLs | P0 | 1d | FileService |
| Grading API — delegate to RulesEngine for grade conversion | P0 | 1d | RulesEngine |
| Homework templates (reusable assignment blueprints) | P0 | 0.5d | — |
| AI homework generator endpoint (delegates to AI service — stub for now) | P0 | 1d | — |
| Homework module documentation | P0 | 0.5d | All above |
| Attendance + Homework integration tests (3 school configs) + contract tests | P0 | 2d | All above |

### Week 9: Exam + Leave Modules

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Exam CRUD API — types from reference data, not enums | P0 | 1d | Academic Structure |
| Score entry API — supports any score type (numeric, letter, GPA, rubric) | P0 | 1d | — |
| Grade calculation via RulesEngine (grade bands, percentage, GPA, rubric) | P0 | 1d | RulesEngine |
| Class statistics with tenant-specific aggregation (avg/median/mode/weighted) | P0 | 1d | — |
| Promotion eligibility via RulesEngine | P0 | 1d | RulesEngine |
| Exam module documentation | P0 | 0.5d | All above |
| Leave API — apply, view history, check balance | P0 | 1d | Academic Structure |
| Leave approval workflow via WorkflowEngine (tenant-defined chains) | P0 | 1.5d | WorkflowEngine |
| Leave type definitions from reference data (not enums) | P0 | 0.5d | ConfigEngine |
| Leave module documentation | P0 | 0.5d | All above |
| Exam + Leave integration tests (3 grading configs, 3 workflow configs) + contract tests | P0 | 2d | All above |

### Week 10: Notifications + Reporting + Final Testing

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Notification service — send via providers (email/SMS/push — stub providers for now) | P0 | 1d | — |
| Notification event handlers — subscribe to Attendance, Homework, Leave events | P0 | 1.5d | EventBus |
| Notification inbox API — list, mark read, preferences | P0 | 1d | Auth |
| Template-based notification content (Handlebars templates per notification type) | P0 | 1d | Notification service |
| Notification module documentation | P0 | 0.5d | All above |
| Reporting API — attendance reports, exam results, leave summaries, dashboards | P0 | 2d | All modules |
| Export API — CSV, Excel (xlsx), PDF generation | P1 | 1d | Reporting |
| **Search indexes** — PostgreSQL trigram GIN indexes on students.name, homework.title, teachers.name | P1 | 0.5d | Profiles |
| **Search utility** — shared `SearchService` with tenant-scoped ILIKE search across searchable entities | P1 | 0.5d | Search indexes |
| **Full API test suite** — every endpoint with 3+ school configs, cross-tenant isolation, authorization, error cases | P0 | 2d | All modules |
| **Finalize all OpenAPI specs** — validate against implementation, generate frontend SDK | P0 | 1d | All modules |
| **CI/CD pipeline final** — OpenAPI validation → SDK generation → type check → lint → unit → integration → contract tests | P0 | 1d | All modules |

### Phase 1 Exit Criteria

- [ ] All 8 bounded context APIs built and tested (Supertest + contract tests)
- [ ] RBAC enforced on every protected endpoint (role + permission matrix verified)
- [ ] Tenant isolation tested (cross-tenant access denied for every endpoint)
- [ ] Config variability tested (3+ school configs per module)
- [ ] All OpenAPI specs finalized and validated against implementation
- [ ] Generated TypeScript SDK builds successfully from OpenAPI specs
- [ ] CI/CD pipeline: all tests pass, SDK generates, types check
- [ ] Module documentation complete (README, api-contract, permissions, workflows, dto, error-codes per module)
- [ ] Backend-admin UI still works with all new APIs

---

## 9.4 Phase 2 — Customer Frontends (Weeks 11-16)

**Goal:** Build customer-facing Next.js frontends that consume the completed backend APIs via generated SDK. The admin UI remains backend-served. Customer frontends are per-tenant deployments with school-specific branding.

### Week 11-12: Frontend Foundation + Design System

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Initialize Next.js 14 project + TypeScript strict + Tailwind + shadcn/ui | P0 | 0.5d | — |
| Configure path aliases (`@/`, `@shared/`, `@modules/`) | P0 | 0.5d | — |
| Integrate generated SDK from backend OpenAPI specs | P0 | 0.5d | Phase 1 SDK |
| **AuthProvider** — login, logout, session refresh, user context, `useAuth()` hook | P0 | 1d | Auth API |
| **Permission gate** — `can("resource:action")` hook + `PermissionGate` component | P0 | 0.5d | Auth API |
| **API layer** — Axios instance with JWT interceptor, error handling, DTO mappers | P0 | 1d | Generated SDK |
| **Global error interceptor** — 401→logout, 403→forbidden, 404→not-found, 429→toast, 500→error page | P0 | 0.5d | API layer |
| **ErrorBoundary** — app-level crash recovery | P0 | 0.5d | — |
| **Design system** — Button, Input, Select, Modal, Badge, Card, Spinner, Toast, Skeleton | P0 | 2d | shadcn/ui |
| **DataTable component** — server-side pagination, sorting, filtering, column visibility, row actions, CSV export | P0 | 2d | Design system |
| **Form framework** — TextField, SelectField, DateField, FileUploadField integrated with React Hook Form + Zod | P0 | 1.5d | Design system |
| **EmptyState + ErrorState + LoadingSkeleton** components | P0 | 0.5d | Design system |
| **OfflineBanner** — detects `navigator.onLine`, shows warning | P0 | 0.5d | — |
| **Sentry + Web Vitals** initialization | P0 | 0.5d | — |

### Week 13-14: Module Frontends

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| **Dashboard layouts** — Teacher, Principal, Parent, Student layouts with role-based sidebar | P0 | 1.5d | Auth + Design system |
| **Tenant config bootstrap** — fetch config on load, apply branding (CSS vars, logo, school name), set feature flags | P0 | 0.5d | Config API |
| **Attendance UI** — date picker + class selector + **dynamic status toggles** rendered from ConfigEngine | P0 | 1.5d | Attendance API |
| **Attendance history** — calendar view + statistics + low-attendance alerts | P0 | 1d | Attendance API |
| **Homework UI** — create (rich editor + AI generate), publish, list with filters | P0 | 1.5d | Homework API |
| **Homework submission UI** — file upload, camera capture, save draft, resubmit | P0 | 1d | Homework API |
| **Homework grading UI** — marks, grade badges (dynamic from ConfigEngine), annotations, bulk review | P0 | 1d | Homework API |
| **Exam UI** — create exams with tenant-defined types, score entry grid, class statistics | P0 | 1d | Exam API |
| **Dynamic grade display** — grade badges, percentage bars, GPA, rubric scores — all rendered from ConfigEngine | P0 | 0.5d | Exam API |

### Week 15: Module Frontends (continued) + Admin Pages

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| **Leave UI** — apply leave with tenant-defined types + **dynamic workflow stepper** from WorkflowEngine | P0 | 1d | Leave API |
| **Leave approval UI** — view pending requests, available transitions from WorkflowEngine | P0 | 1d | Leave API |
| **Reports UI** — attendance reports, exam results, leave summaries with filters + export | P0 | 1.5d | Report API |
| **Student portal** — homework list, submission status, exam results, attendance chart | P0 | 1d | Multiple APIs |
| **Parent dashboard** — child overview, attendance chart, leave status, notifications | P0 | 1d | Multiple APIs |
| **Notification inbox** — list, mark read, preference management | P0 | 0.5d | Notification API |
| **Admin pages** — subject/class/section management, user management, permission editor | P0 | 1.5d | Admin APIs |
| **Feature flags UI** — per-tenant enable/disable modules and features | P0 | 0.5d | Feature flag API |

### Week 16: Per-Client Customization + PWA + Testing

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| **Per-client deployment setup** — build-time config (tenant slug, API URL, default locale) | P0 | 1d | All frontend |
| **Runtime branding** — CSS variables from tenant config, logo, favicon, school name | P0 | 1d | Config API |
| **PWA** — service worker, install prompt, offline attendance queue (IndexedDB) | P1 | 2d | Attendance UI |
| **TanStack Query persistence** — localStorage cache, 24h maxAge for offline resilience | P1 | 0.5d | — |
| **Frontend unit tests** — hooks, mappers, utility functions, components (80%+ coverage) | P0 | 2d | All frontend |
| **Frontend integration tests** (MSW) — form submissions, search/filter/pagination, CRUD flows | P0 | 1.5d | All frontend |
| **E2E tests** (Playwright) — login → dashboard, mark attendance, homework lifecycle, leave request, reports | P0 | 2d | All frontend |
| **Second + third client deployment** — deploy School B and School C with different configs to prove variability | P0 | 1d | All frontend |

### Phase 2 Exit Criteria

- [ ] Customer can log in and see role-appropriate dashboard
- [ ] Attendance: dynamic status toggles work for all 3 school configs (3-status, 5-status, period-based)
- [ ] Grading: grade display adapts to grade bands, percentage, GPA, rubric per school
- [ ] Workflows: leave approval UI shows correct transitions per school (2-step, 3-step, conditional)
- [ ] All 4 UX states handled on every page (loading skeleton, empty state, error state, success)
- [ ] Offline banner appears when disconnected; attendance queued locally
- [ ] Unit test coverage ≥ 80%, integration tests pass, E2E critical paths pass
- [ ] 3 diverse school deployments working side-by-side on same backend

---

## 9.5 Phase 3 — Advanced Engines + AI (Weeks 17-22)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| **Metadata Engine** — field definitions CRUD, dynamic form generation, GIN-indexed JSONB querying | P0 | 2d | Phase 0 Schema |
| **Metadata Admin UI** — custom field manager per entity, form builder (extends backend-admin UI) | P0 | 2d | Metadata Engine |
| **Template Engine** — Handlebars compiler, data gathering context, Puppeteer PDF generation | P0 | 3d | — |
| **Template Admin UI** — template designer with component palette + live preview (extends backend-admin UI) | P0 | 3d | Template Engine |
| Default templates: CBSE report card, ICSE report card, transfer certificate, bonafide certificate | P0 | 2d | Template Engine |
| **Workflow Designer UI** — visual state machine editor (extends backend-admin UI) | P0 | 2d | Workflow Engine |
| **Rules Admin UI** — rule editor with live tester (extends backend-admin UI) | P0 | 2d | Rules Engine |
| **Internal AI API** — expose `/api/v1/ai/*` endpoints for ai_chat service (generate-homework, grade-submission, generate-summary, extract-text, check-image-quality) | P0 | 2d | Homework + Exam APIs |
| Multi-channel notification delivery — Push (FCM), SMS (Twilio), Email (SendGrid), WhatsApp | P1 | 3d | Notification service |
| Advanced reporting — custom report builder, scheduled reports, analytics dashboards | P1 | 3d | Report module |
| Multi-language i18n framework — English, Hindi, Marathi (extensible) | P1 | 2d | Frontend + Backend |
| Integrate ai_chat service — deploy ai_chat repo, configure backend API key, test end-to-end | P0 | 2d | Internal AI API |

---

## 9.6 Phase 4 — Enterprise + Scale (Weeks 23-28)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| **[Infra team]** Reporting read replica — route all `/api/v1/{tenant}/reports/*` queries to replica | P2 | — | — |
| **Reporting materialized views** — pre-aggregated attendance rates, exam stats, grade distributions refreshed hourly | P2 | 2d | Read replica |
| **[Infra team]** Analytics DB — dedicated analytics database with materialized views and pre-aggregated cubes (if read replica insufficient) | P2 | — | Read replica |
| **PostgreSQL FTS upgrade** — add `tsvector` columns, GIN indexes, search triggers to all searchable entities (applied via Prisma migration against externally managed PostgreSQL) | P2 | 2d | — |
| **OpenSearch evaluation** — assess if PostgreSQL FTS thresholds exceeded (500ms p95, 50+ req/s, multi-language stemming needed) | P2 | 1d | FTS upgrade |
| **[Infra team]** OpenSearch integration (if needed) — provision cluster, index sync pipeline, API migration | P2 | — | Evaluation |
| Tier 2: Shared DB + separate schema routing | P2 | 2d | Multi-tenant manager |
| **[Infra team]** Tier 3: Dedicated database provisioning + connection routing | P2 | — | Multi-tenant manager |
| Tier 4: Dedicated instance infrastructure (separate ECS/EKS deployment) | P2 | 3d | Tier 3 |
| **Redis caching (optional)** — config cache, permission cache, query result cache (requires externally managed Redis; backend degrades gracefully if unavailable) | P2 | 2d | — |
| Query optimization — slow query analysis, index tuning, N+1 elimination | P2 | 2d | All modules |
| **[Infra team]** Connection pooling (PgBouncer) for Tier 1 multi-tenant | P2 | — | — |
| Prometheus metrics + Grafana dashboards (API latency, error rates, queue depth, DB connections) | P2 | 2d | — |
| Sentry error tracking — backend + frontend with source maps | P2 | 1d | — |
| Full audit trail UI — search, filter, export audit logs | P2 | 2d | Audit logging |
| Compliance reports — data export, data deletion (GDPR-compliant) | P2 | 2d | — |
| CI/CD pipeline — GitHub Actions: test → build → deploy per client | P2 | 3d | — |
| Documentation portal — API docs (Swagger/Scalar), integration guides, onboarding guides | P2 | 3d | — |
| Client SDK — JavaScript/TypeScript SDK for third-party integrations | P2 | 3d | All APIs |
| Security audit + penetration testing | P2 | 3d | — |
| Load testing — 1000 concurrent users per tenant, 100 concurrent tenants | P2 | 2d | All above |

---

## 9.7 Critical Dependency Graph

```
Phase 0: Backend Engine Foundation + Admin UI
    │
    ├── Reference Data Tables ──── (foundation for everything)
    │       │
    │       ├── Configuration Engine ── (attendance statuses, grading scales, calendars)
    │       │       ├── Config API
    │       │       └── Backend-Admin UI (attendance editor, grading editor, calendar editor)
    │       │
    │       ├── Rules Engine ────────── (grade calc, attendance calc, promotion)
    │       │       ├── Rules API
    │       │       └── ALL Phase 1 business modules depend on this
    │       │
    │       ├── Workflow Engine ──────── (leave approvals, corrections, admissions)
    │       │       ├── Workflow API
    │       │       └── Leave Module depends on this
    │       │
    │       ├── Event Bus ───────────── (inter-context communication)
    │       │       └── Notification context depends on this
    │       │
    │       └── OpenAPI Specs ────────── (contracts defined for ALL modules)
    │               └── Generated SDK pipeline (CI/CD validates)
    │
Phase 1: Backend Business Modules ──── (depends on ALL engines)
    │
    ├── Auth + RBAC
    ├── Academic Structure
    ├── Attendance Module (config + rules + workflow driven)
    ├── Homework Module (config + rules driven)
    ├── Exam Module (config + rules driven)
    ├── Leave Module (workflow driven)
    ├── Notification Module (event driven)
    └── Reporting API
            │
            └── Generated TypeScript SDK ──── (ready for frontend consumption)
                    │
Phase 2: Customer Frontends ──── (depends on completed SDK)
    │
    ├── App Shell (AuthProvider, ErrorBoundary, Design System)
    ├── All Module Frontends (consuming generated SDK)
    ├── Per-Client Customization
    └── PWA + Offline
```

---

## 9.8 Risk Mitigation

| Risk | Mitigation | Owner |
|------|-----------|-------|
| **Engine complexity delays Phase 1** | Build minimum viable engine — simple condition/action rules, 2-3 workflow examples. Add complexity in Phase 3 | Backend Lead |
| **Admin UI adds backend complexity** | Keep admin UI thin — server-rendered Handlebars templates, no SPA. It validates APIs without becoming a full frontend | Backend Lead |
| **Frontend starts late, delays delivery** | Frontend develops against generated SDK — types and client functions are complete. No guesswork. Parallel team can build from OpenAPI mocks | Frontend Lead |
| **OpenAPI specs not ready for frontend** | OpenAPI specs scaffolded in Phase 0, finalized during Phase 1 implementation. CI/CD validates | Backend Lead |
| **Performance with JSONB metadata** | GIN indexes, field definition caching, limit custom fields to 50 per entity | Backend Lead |
| **Workflow engine edge cases** | Thorough testing of all transition paths, timeout handling, escalation rules | QA Lead |

---

> **Next:** See [`20-extensibility-migration.md`](./20-extensibility-migration.md) for migration strategy from the old architecture.
