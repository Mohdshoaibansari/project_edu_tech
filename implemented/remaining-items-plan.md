# Implementation Status

> **Last Updated:** 2026-06-06  
> **Status:** ✅ Phase 0 Complete | ✅ Phase 1 Complete (3 audit gaps fixed) | ⬜ Phase 2 — Ready to Start  
> **Test Suite:** 9 files (~144 tests), unit tests all passing  
> **API Tests:** 88/102 passing, 1 known API gap, 13 skipped (no students in DB)

---

## 🔍 Audit Gaps — Found 2026-06-06

Three gaps identified during spec-vs-implementation audit. See audit report for details.

### Gap 1 — Hardcoded Statuses in Reporting Dashboard ✅ FIXED

| Field | Detail |
|-------|--------|
| **Severity** | Medium — violates config-driven principle |
| **Fix** | `reporting.service.ts`: Injected `ConfigurationEngine`, replaced hardcoded `'PRESENT'\|'LATE'\|'MEDICAL'` with `configEngine.getAttendanceStatuses()` filtered by `is_present` flag |
| **Files** | `server/src/modules/reporting/reporting.module.ts`, `server/src/modules/reporting/services/reporting.service.ts` |

### Gap 2 — Missing Config Variability Tests ✅ CREATED

| Field | Detail |
|-------|--------|
| **File** | `server/test/integration/config-variability.spec.ts` |
| **Tests** | Attendance (3 configs: status validation), Grading (score→grade conversion across 3 schools, GPA calculation, promotion eligibility), Leave (workflow definitions + transitions per school), Rules Engine (rule set presence + evaluation modes) |
| **Count** | ~25 tests across 4 describe blocks |

### Gap 3 — Missing Business Module Integration Tests ✅ CREATED

| Field | Detail |
|-------|--------|
| **File** | `server/test/integration/business-modules.spec.ts` |
| **Tests** | Cross-tenant isolation (5 endpoints), Authentication (6: missing/invalid token, login, me, refresh), CRUD (attendance statuses, dashboard, config API, grades, subjects, students, homework, search, notifications) |
| **Count** | ~25 tests across 8 describe blocks |

---

## Phase 0 — Engine Foundation ✅

| Task | Status |
|------|:------:|
| NestJS + Vitest + ESLint + Prettier | ✅ |
| External service connections (env vars) | ✅ |
| NestJS MVC (Handlebars — 7 admin pages) | ✅ |
| Prisma schema (NO business enums) | ✅ |
| Reference data tables (attendance, assessment, leave, homework, notification) | ✅ |
| Academic years + terms tables | ✅ |
| Metadata JSONB columns | ✅ |
| Engine tables (14 tables) | ✅ |
| Migrations applied (4 total) | ✅ |
| ConfigurationEngine (get, set, validate, history, rollback, inheritance) | ✅ |
| JSON Schema validation (AJV) | ✅ |
| Config templates (CBSE, ICSE, International) | ✅ |
| Config API endpoints (CRUD, history, rollback, templates, 7 convenience) | ✅ |
| EventBus (13 domain event types) | ✅ |
| RulesEngine (condition + formula evaluators) | ✅ |
| Default rule sets (grading.convert_score, attendance.calculate_rate, promotion.eligibility) | ✅ |
| Rules API endpoints | ✅ |
| WorkflowEngine (start, transition, conditions, actor resolution) | ✅ |
| Default workflows (leave_approval: 2-step, 3-step, conditional + attendance_correction) | ✅ |
| Workflow API endpoints | ✅ |
| Admin UI — Dashboard + tenant selector | ✅ |
| Admin UI — Attendance Statuses editor | ✅ |
| Admin UI — Grading Scale editor | ✅ |
| Admin UI — Academic Calendar editor | ✅ |
| Admin UI — Workflow viewer | ✅ |
| Admin UI — Rules viewer | ✅ |
| Admin UI — Seed loader | ✅ |
| OpenAPI specs (8 contexts, aligned with implementation) | ✅ |
| Unit tests (68 engine + RBAC + guards) | ✅ |
| Seed data (3 schools, templates, rules, workflows) | ✅ |
| CI/CD pipeline | ⏸️ Deferred |

---

## Phase 1 — Business Modules ✅

### Auth (Identity)
| Component | Status | Details |
|-----------|:------:|---------|
| JWT token service | ✅ | Issue, verify, refresh, rotate (jose/HS256) |
| Auth controller | ✅ | POST login, refresh, logout | GET me |
| RBAC engine | ✅ | Permission, RolePermission, UserPermission tables + seed |
| RBAC service | ✅ | Permission resolution, grant/revoke, seed helpers |
| AuthGuard | ✅ | Global — JWT extraction, public path bypass |
| TenantGuard | ✅ | Global — cross-tenant isolation |
| PermissionGuard | ✅ | Per-controller — @RequirePermission decorator |
| SuperTokens integration | ✅ | SDK-based token verification, dev-mode bypass |
| Audit logging | ✅ | Silent-fail audit service |
| Module docs | ✅ | README, permissions, error-codes |

### Academic Structure
| Component | Status |
|-----------|:------:|
| Grades, Sections, Subjects, Classes CRUD | ✅ |
| Student enrollment + paginated list | ✅ |
| Staff management | ✅ |
| Module docs | ✅ |

### Attendance
| Component | Status |
|-----------|:------:|
| Config-driven statuses | ✅ |
| Batch marking with validation | ✅ |
| RulesEngine-driven rate calculation | ✅ |
| WorkflowEngine-driven corrections | ✅ |
| Event emission | ✅ |
| Module docs | ✅ |

### Homework
| Component | Status |
|-----------|:------:|
| Full lifecycle (DRAFT→PUBLISHED) | ✅ |
| Submissions + file URLs | ✅ |
| RulesEngine-driven grading | ✅ |
| AI generation (stub) | ✅ |
| Event emission | ✅ |
| Module docs | ✅ |

### Exam
| Component | Status |
|-----------|:------:|
| Reference-data-driven types | ✅ |
| Score entry with grade conversion | ✅ |
| Statistics (avg, median, pass rate) | ✅ |
| GPA calculation | ✅ |
| Promotion eligibility check | ✅ |
| Module docs | ✅ |

### Leave
| Component | Status |
|-----------|:------:|
| Reference-data-driven types | ✅ |
| WorkflowEngine-driven approvals | ✅ |
| Event emission | ✅ |
| Module docs | ✅ |

### Notification
| Component | Status |
|-----------|:------:|
| Event-driven (5 subscribers) | ✅ |
| Inbox + read/read-all | ✅ |
| Multi-channel stub | ✅ |
| Module docs | ✅ |

### Reporting
| Component | Status |
|-----------|:------:|
| Dashboard (aggregated stats) | ✅ |
| Attendance report | ✅ |
| Exam report | ✅ |
| Leave report | ✅ |
| Module docs | ✅ |

### Shared
| Component | Status |
|-----------|:------:|
| Search Service (tenant-scoped, fuzzy, multi-entity) | ✅ |
| Search indexes (pg_trgm GIN on students, staff, homework, exams) | ✅ |

---

## Phase 2 — Customer Frontends ⬜ Ready to Start

| Week | Scope |
|:----:|-------|
| 11-12 | Frontend foundation + Design system (Next.js 14, Tailwind, shadcn/ui, DataTable, Form framework) |
| 13-14 | Module frontends (Attendance, Homework, Exam, dynamic config-driven UI) |
| 15 | Module frontends (Leave, Reports, Student portal, Parent dashboard, Admin pages) |
| 16 | Per-client customization, PWA, E2E testing, multi-school deployment |

---

## Infrastructure

| Service | Provider | Status |
|---------|----------|:------:|
| PostgreSQL | Externally managed | ✅ Connected |
| Redis | Externally managed (optional) | ⬜ Not configured |
| SuperTokens Core | Externally managed (port 3567) | ✅ Connected |
| SuperTokens Auth Service | Externally managed (port 4000) | ✅ Running |

---

## File Inventory

### New Files Created
```
server/src/modules/auth/rbac.service.ts
server/src/modules/auth/guards/auth.guards.ts (rewritten)
server/src/modules/auth/supertokens/supertokens.service.ts
server/src/shared/search/search.service.ts
server/src/shared/search/search.module.ts
server/prisma/seed-rbac.ts
server/prisma/migrations/20260605180000_add_search_indexes/migration.sql
server/src/modules/auth/__tests__/rbac.service.spec.ts
server/src/modules/auth/__tests__/guards.spec.ts
server/src/modules/auth/README.md
server/src/modules/auth/permissions.md
server/src/modules/auth/error-codes.md
server/src/modules/academic/README.md
server/src/modules/academic/permissions.md
server/src/modules/academic/error-codes.md
server/src/modules/attendance/README.md
server/src/modules/attendance/permissions.md
server/src/modules/attendance/error-codes.md
server/src/modules/homework/README.md
server/src/modules/homework/permissions.md
server/src/modules/homework/error-codes.md
server/src/modules/exam/README.md
server/src/modules/exam/permissions.md
server/src/modules/exam/error-codes.md
server/src/modules/leave/README.md
server/src/modules/leave/permissions.md
server/src/modules/leave/error-codes.md
server/src/modules/notification/README.md
server/src/modules/notification/permissions.md
server/src/modules/notification/error-codes.md
server/src/modules/reporting/README.md
server/src/modules/reporting/permissions.md
server/src/modules/reporting/error-codes.md
implemented/remaining-items-plan.md
server/test/integration/config-variability.spec.ts
server/test/integration/business-modules.spec.ts
```

### Modified Files
```
docker-compose.yml                           # External services only
server/src/app.module.ts                     # Global guards + SearchModule
server/src/modules/auth/auth.module.ts       # RbacService + SuperTokensService
server/src/modules/auth/auth.controller.ts   # supertokens_token param
server/src/modules/auth/jwt-token.service.ts # ST verification + RbacService
server/prisma/seed.ts                        # Rule sets + attendance_correction workflow
server/vitest.config.ts                      # test/ directory include
server/.env                                  # ST port 3567
server/.env.example                          # ST port 3567
test-api.sh                                  # Comprehensive 102-test script
docs/spec/03-architecture.md                 # External services topology
docs/spec/04-backend-spec.md                 # External service notes
docs/spec/09-implementation-roadmap.md       # Removed provisioning tasks
contracts/specs/identity-context.yaml        # supertokens_token field
contracts/specs/assessment-context.yaml      # Path alignment
```
