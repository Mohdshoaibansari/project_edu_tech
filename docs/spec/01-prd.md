# 1. Product Requirements Document (PRD)

> **Product:** EduTech — AI-Powered School Operations Platform  
> **Version:** 2.1.0  
> **Status:** Draft — Post Skill-Standards Alignment  
> **Date:** 2026-06-05  
> **Author:** Architecture & Engineering Team  

---

## 1.1 Executive Summary

EduTech is a **multi-tenant, engine-driven SaaS platform** for school operations. It serves **radically different schools** — from small K-12 schools with simple Present/Absent attendance to large chains with period-based tracking, GPA grading, and multi-step approval workflows — all from a **single shared backend** without code changes.

### Platform Architecture

- **Backend:** A shared NestJS API server with an **engine layer** (Configuration, Rules, Workflow, Metadata, Template Engines) that makes every school-specific behavior configurable, not hardcoded
- **Frontend:** Per-client Next.js deployments that consume the shared APIs and dynamically adapt to each school's configuration (attendance statuses, grading scales, workflow steps, custom fields, report templates)
- **AI Layer:** Provider-abstracted AI service (OpenAI/Anthropic/Google/Local) for chatbot, auto-grading, homework generation, and analytics

### What Makes This Different

| Traditional School Platform | EduTech |
|---------------------------|---------|
| Hardcoded enums for attendance statuses | **Configuration Engine** — each school defines its own statuses with weights, colors, i18n labels |
| Hardcoded grading (percentage only) | **Rules Engine** — grade bands, GPA, rubric-based, all configurable per school |
| Hardcoded workflows (Teacher→Principal) | **Workflow Engine** — configurable state machines with conditional transitions |
| Hardcoded database columns for custom fields | **Metadata Engine** — JSONB + field definitions, zero schema changes |
| No report card generation | **Template Engine** — Handlebars/PDF with per-school branding and dynamic data binding |
| Vendor-locked AI integration | **AI Abstraction Layer** — swap OpenAI/Anthropic/Google/Local per task per tenant |

---

## 1.2 Problem Statement

### Current State (Monolith)

The existing Attendance Engagement system is a **Next.js monolith** with an embedded Python AI microservice. It serves a single school context with hardcoded configurations.

**Problems with the monolith approach:**
1. **No multi-tenancy** — cannot serve multiple schools from one deployment
2. **Tightly coupled frontend-backend** — cannot customize UI per client
3. **Hardcoded business rules** — attendance thresholds, leave policies, homework deadlines are not configurable
4. **Single deployment** — cannot scale frontend and backend independently
5. **No client isolation** — all data in one schema without tenant boundaries
6. **Limited extensibility** — adding a new client requires forking the entire codebase

### Target State (Engine-Driven SaaS)

| Dimension | Current (Monolith) | Target (Engine-Driven) |
|-----------|-------------------|----------------------|
| **Architecture** | Next.js monolith + Python AI | Backend API + Engine Layer + Per-client Frontend |
| **Multi-tenancy** | None (single school) | Hybrid: Shared Schema (90%) → Dedicated DB (10%) |
| **Frontend** | One codebase, one look | Dynamic config-driven UI adapting to per-school statuses, grading, workflows |
| **Backend** | Embedded in Next.js | NestJS with 8 bounded contexts communicating via Event Bus |
| **Configuration** | Hardcoded | **Hierarchical Configuration Engine** with JSON Schema validation, inheritance, versioning |
| **Business Rules** | Hardcoded if/else in services | **Rules Engine** with JSON condition/action evaluation per tenant |
| **Workflows** | Hardcoded approval chains | **Workflow Engine** with configurable state machines |
| **Custom Fields** | Requires schema migration | **Metadata Engine** — JSONB + GIN indexes, zero migrations |
| **Documents** | None | **Template Engine** — Handlebars/PDF report cards, certificates |
| **AI** | Hardcoded LangChain | **AI Abstraction Layer** — multi-provider, per-task per-tenant |
| **Auth** | SuperTokens + JWT cookie | SuperTokens (identity) + JWT (session) with RBAC |
| **Deployment** | Single Docker Compose | Backend cluster + per-client frontend + engine services |

---

## 1.3 Target Users & Personas

### Primary Personas

| Persona | Role | Key Needs | Frequency |
|---------|------|-----------|-----------|
| **Teacher (Riya)** | Subject/class teacher, 30-50 years old | Take attendance fast (30-60s), create homework, grade submissions, view reports | Daily |
| **Principal (Mr. Sharma)** | School principal, 45-60 years old | View school-wide dashboards, monitor teacher activity, approve leave, export reports | Daily/Weekly |
| **Parent (Priya)** | Working parent, 30-45 years old | Check child's attendance, view homework, apply leave, receive alerts | Daily |
| **Student (Aarav)** | Student, 10-18 years old | View homework, submit assignments, check attendance, view exam results | Daily |
| **Admin (Deepak)** | School administrator / IT staff | Manage users, configure settings, manage permissions, onboard new schools | Weekly |

### Secondary Personas

| Persona | Role | Key Needs |
|---------|------|-----------|
| **Counselor (Meera)** | School counselor | View student attendance trends, flag at-risk students, read-only access to student data |
| **Staff (Rajesh)** | Non-teaching staff | Mark own attendance (check-in/out), apply for leave |
| **Super Admin** | Platform owner | Manage tenants (onboard/offboard schools), global configuration, billing/metering |
| **Chatbot User** | Any role via Telegram | Query attendance, apply leave, check homework — via natural language |

---

## 1.4 Product Vision

> **"One platform. Every school. Personalized for each."**

EduTech is a **SaaS platform for school operations**. It provides:
- **Out-of-the-box modules:** Attendance, Homework, Exams, Leave, Reports, Notifications
- **AI-powered efficiency:** Auto-grade homework, generate assignments, chatbot assistant
- **Per-client customization:** Each school gets its own branded frontend with configurable features
- **Multi-channel access:** Web (responsive), Mobile (PWA), Telegram (AI Chatbot)
- **Enterprise-grade security:** RBAC, tenant isolation, audit logging, encryption

---

## 1.5 Functional Requirements

### Module 1: Attendance Management

> **Engine-driven.** Zero hardcoded statuses. Schools define their own via Configuration Engine.

| ID | Requirement | Priority | Phase |
|----|------------|----------|-------|
| AT-01 | Teacher takes manual attendance (mobile-first roll-call grid) | P0 | 1 |
| AT-02 | **Configurable default status** — School A defaults to PRESENT; School B defaults to "Unmarked" | P0 | 1 |
| AT-03 | **Tenant-defined attendance statuses** via Configuration Engine — School A: Present/Absent/Late; School B: +Half Day/Medical Leave; School C: period-based with custom statuses. Each status has: code, label (i18n), color, icon, weight, is_present flag, is_default flag | P0 | 0 |
| AT-04 | Per-grade configurable: Daily (homeroom), Subject-wise, Period-wise, or Custom mode via Configuration Engine | P0 | 0 |
| AT-05 | **Configurable correction workflow** via Workflow Engine — School A: self-correct within 24h then Teacher→Principal; School B: Teacher→Coordinator→Principal always | P0 | 0 |
| AT-06 | Attendance calculation via **Rules Engine** — School A: present/total × 100; School B: SUM(weight)/total × 100 (Late=0.5, Medical=0.75) | P0 | 0 |
| AT-07 | Offline attendance with auto-sync | P1 | 2 |
| AT-08 | Biometric/QR-based attendance for staff | P2 | 3 |

### Module 2: Homework Management

| ID | Requirement | Priority | Phase |
|----|------------|----------|-------|
| HW-01 | Teachers create homework with: title, subject, chapter, topic, instructions, due date, priority, estimated time, attachments | P0 | 1 |
| HW-02 | Homework lifecycle: DRAFT → SCHEDULED → PUBLISHED → ARCHIVED | P0 | 1 |
| HW-03 | Reusable homework templates | P0 | 1 |
| HW-04 | AI homework generator (teacher inputs subject/chapter → AI generates questions) | P0 | 1 |
| HW-05 | Students submit homework: file upload, camera capture, multiple files, save draft, resubmit | P0 | 1 |
| HW-06 | Teachers evaluate: marks, grades, rubrics, annotations, return for correction | P0 | 1 |
| HW-07 | AI-assisted grading: auto-check objective answers, suggest scores, generate feedback comments | P0 | 1 |
| HW-08 | AI image quality checker (blurry/dark/cropped detection) | P1 | 2 |
| HW-09 | AI OCR extraction of handwritten text | P1 | 2 |
| HW-10 | Bulk evaluation (batch review multiple submissions) | P0 | 1 |
| HW-11 | Teacher analytics dashboard (submission trends, weak students, class performance) | P1 | 2 |

### Module 3: Exam & Grading Management

> **Engine-driven.** Zero hardcoded grading. Schools define their own via Configuration + Rules Engine.

| ID | Requirement | Priority | Phase |
|----|------------|----------|-------|
| EX-01 | Create exams with **tenant-defined types** (stored as reference data, not enums) | P0 | 1 |
| EX-02 | Score entry: per-student, bulk save, absent toggle — **supports any score type** (numeric, letter grade, GPA, rubric) | P0 | 1 |
| EX-03 | **Configurable grading scale** via Configuration Engine — School A: A+ to F bands; School B: raw percentage; School C: GPA 4.0 scale; School D: rubric criteria. Each grade band has: label, min, max, grade_point, color | P0 | 0 |
| EX-04 | **Grade calculation via Rules Engine** — School A: score→grade_band lookup; School B: score/max×100; School C: SUM(grade_point×credit_hours)/SUM(credit_hours) | P0 | 0 |
| EX-05 | Class statistics with **tenant-specific aggregation** (average/median/mode/weighted, configurable) | P0 | 1 |
| EX-06 | Student exam results view (student + parent portals) — **display adapts to grading type** (grade badge, percentage bar, GPA number) | P0 | 1 |
| EX-07 | **Configurable promotion eligibility** via Rules Engine — thresholds, failed subject limits, conditional promotion rules | P0 | 0 |

### Module 4: Leave Management

> **Engine-driven.** Configurable approval chains via Workflow Engine.

| ID | Requirement | Priority | Phase |
|----|------------|----------|-------|
| LV-01 | Parent applies for student leave with **tenant-defined leave types** (stored as reference data, not enums) | P0 | 1 |
| LV-02 | **Configurable approval workflow** via Workflow Engine — School A: Teacher→Principal (2-step); School B: Teacher→Coordinator→Principal (3-step); School C: ≤3 days Teacher only, >3 days Teacher→Principal (conditional) | P0 | 0 |
| LV-03 | Staff leave with **separately configurable workflow** | P0 | 1 |
| LV-04 | Leave status tracking via Workflow Engine — states are tenant-defined, not hardcoded | P0 | 1 |
| LV-05 | Leave history, balance tracking, and reporting | P1 | 2 |

### Module 5: Notifications

| ID | Requirement | Priority | Phase |
|----|------------|----------|-------|
| NT-01 | Absence alerts to parents (on attendance mark) | P0 | 1 |
| NT-02 | Low attendance alerts (throttled — once per week) | P0 | 1 |
| NT-03 | Leave status alerts (approval/rejection) | P0 | 1 |
| NT-04 | Homework alerts (assigned, due-soon, missing, graded, resubmission) | P0 | 1 |
| NT-05 | Multi-channel delivery: In-App, Push, SMS, Email, WhatsApp, Telegram | P1 | 2 |
| NT-06 | Notification preference management per user | P1 | 2 |
| NT-07 | Weekly parent summary digests (AI-generated) | P2 | 3 |

### Module 6: Dashboards & Reports

> **Reporting architecture:** See [`18-domain-driven-design.md` §8 Reporting Context](./18-domain-driven-design.md) for phased build strategy, database isolation (read replicas, materialized views), and anti-patterns.

| ID | Requirement | Priority | Phase |
|----|------------|----------|-------|
| DR-01 | Teacher dashboard: KPIs, pending attendance, homework tracker, risk flags | P0 | 1 |
| DR-02 | Principal dashboard: school-wide KPIs, grade breakdown, trends, absentees | P0 | 1 |
| DR-03 | Parent dashboard: child overview, attendance chart, leave status, notifications | P0 | 1 |
| DR-04 | Student portal: homework list, submission status, exam results | P0 | 1 |
| DR-05 | Daily/Monthly attendance reports with filtering | P0 | 1 |
| DR-06 | Low attendance report (configurable threshold) | P0 | 1 |
| DR-07 | Export: CSV, Excel (xlsx), PDF (browser print) | P0 | 1 |
| DR-08 | Custom report builder | P2 | 3 |

### Module 7: AI Chatbot & AI Tasks

> **Moved to separate repository.** AI chatbot and AI task specifications are maintained in the [`ai_chat`](../../../ai_chat/) repository.
>
> - **AI Chatbot PRD:** [`ai_chat/docs/spec/01-prd.md`](../../../ai_chat/docs/spec/01-prd.md)
> - **AI Service Architecture:** [`ai_chat/docs/spec/02-architecture.md`](../../../ai_chat/docs/spec/02-architecture.md)
> - **Backend APIs consumed by AI service:** [`ai_chat/docs/spec/03-api-contracts.md`](../../../ai_chat/docs/spec/03-api-contracts.md)
>
> The AI service consumes edu_tech backend REST APIs (with `x-api-key` authentication). It never accesses the database directly.
>
> **Backend responsibility:** Expose internal AI endpoints (`/api/v1/ai/*`) for the AI service to call. See [`08-api-contracts.md`](./08-api-contracts.md) for endpoint definitions.

### Module 8: Administration

| ID | Requirement | Priority | Phase |
|----|------------|----------|-------|
| AD-01 | User management: create, deactivate, reactivate users | P0 | 1 |
| AD-02 | Subject & class management with teacher assignment | P0 | 1 |
| AD-03 | Section management (class teacher + supervisor per grade/section) | P0 | 1 |
| AD-04 | Permission management: role defaults + per-user overrides (UI) | P0 | 1 |
| AD-05 | Per-grade configuration: subject-based vs daily attendance mode | P0 | 1 |
| AD-06 | Tenant onboarding/offboarding (Super Admin) | P0 | 1 |
| AD-07 | Tenant-level configuration: branding, features, limits, business rules | P0 | 1 |
| AD-08 | Audit logging (all admin actions, all data mutations) | P0 | 1 |

---

## 1.5a API Design Standards

> **Contract-first development.** All APIs follow consistent patterns for response format, pagination, filtering, sorting, error codes, and idempotency.

### Unified Response Format

Every API endpoint returns the same envelope structure:

**Success:**
```json
{
  "success": true,
  "data": { },
  "meta": { }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Human-readable description",
    "details": { }
  }
}
```

### Module-Scoped Error Codes

All error codes are UPPER_SNAKE_CASE and prefixed by module:

| Module | Error Code Examples |
|--------|-------------------|
| Global | `RESOURCE_NOT_FOUND`, `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR` |
| Student | `STUDENT_NOT_FOUND`, `STUDENT_ALREADY_EXISTS`, `INVALID_GRADE` |
| Attendance | `ATTENDANCE_ALREADY_MARKED`, `ATTENDANCE_WINDOW_CLOSED` |
| Homework | `HOMEWORK_PAST_DUE`, `HOMEWORK_ALREADY_SUBMITTED` |
| Leave | `LEAVE_INSUFFICIENT_BALANCE`, `LEAVE_OVERLAPPING` |
| Exam | `EXAM_NOT_FOUND`, `GRADE_OUT_OF_RANGE` |

Every backend module **must** maintain an `error-codes.md` documenting all module-specific errors with HTTP status codes, trigger conditions, and suggested frontend handling.

### Pagination (Offset — Default)

```http
GET /api/v1/students?page=1&pageSize=20
```

Response `meta`:
```json
{
  "page": 1,
  "pageSize": 20,
  "totalItems": 145,
  "totalPages": 8,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

**Defaults:** `page=1`, `pageSize=20`, `maxPageSize=100`. Cursor pagination used for large datasets (>10K records).

### Standardized Filtering & Sorting

```http
# Filtering
GET /api/v1/students?className=Grade%205A&status=active
GET /api/v1/students?search=john                    # Global search
GET /api/v1/attendance?dateFrom=2026-01-01&dateTo=2026-06-01  # Range
GET /api/v1/users?role=teacher,admin                # Multiple values (OR)

# Sorting
GET /api/v1/students?sort=name                      # Ascending
GET /api/v1/students?sort=-createdAt                # Descending
GET /api/v1/students?sort=className,-name           # Multi-field
```

### Idempotency Support

All `POST` and `PATCH` endpoints support the `Idempotency-Key` header (UUID). Retried requests with the same key return the cached original response within a 24-hour window. Keys are scoped per user.

### Field Conventions

- JSON keys: **camelCase** (JavaScript/TypeScript native)
- Dates: **ISO 8601** (`2026-06-04T14:30:00Z`)
- IDs: **UUID v4** strings (no auto-increment integers)

### Backward Compatibility

| Safe (Same Version) | Breaking (New Version Required) |
|--------------------|-------------------------------|
| Add optional fields | Remove fields |
| Add endpoints | Rename fields |
| Add query parameters | Change field types |
| Extend pagination meta | Make optional fields required |
| Add enum values | Remove endpoints |

Deprecated fields carry `x-deprecated: true` in OpenAPI and a `Deprecation` / `Sunset` response header.

### OpenAPI as Single Source of Truth

The OpenAPI 3.x specification is the **authoritative contract** for all API behavior:
1. Backend validation, swagger docs, and request/response schemas derive from it
2. Frontend TypeScript SDK is **auto-generated** from it (never handwritten)
3. CI/CD pipeline **fails** if: spec is invalid, SDK won't generate, or DTOs are inconsistent with spec

---

## 1.6 Non-Functional Requirements

### Performance

| ID | Requirement | Target |
|----|------------|--------|
| NF-P01 | Attendance marking completion time | < 60 seconds for a class of 60 students |
| NF-P02 | API response time (p95) | < 200ms for reads, < 500ms for writes |
| NF-P03 | Page load time (LCP) | < 2.5 seconds |
| NF-P04 | AI chatbot response time | < 5 seconds |
| NF-P05 | Concurrent users per tenant | 500+ simultaneous |
| NF-P06 | Cumulative Layout Shift (CLS) | < 0.1 |
| NF-P07 | First Input Delay (FID) | < 100ms |
| NF-P08 | Time to First Byte (TTFB) | < 800ms |
| NF-P09 | Initial JavaScript bundle size | < 200KB (gzipped) |

### Security

| ID | Requirement | Standard |
|----|------------|----------|
| NF-S01 | Authentication | JWT access tokens (15min) + refresh tokens (30d rotation) |
| NF-S02 | Authorization | RBAC with fine-grained `resource:action` permissions |
| NF-S03 | Tenant isolation | `tenant_id` on all queries + PostgreSQL Row-Level Security |
| NF-S04 | Data encryption | TLS in transit, AES-256 at rest for sensitive fields |
| NF-S05 | API security | Rate limiting, CSRF protection, secure headers, Zod validation |
| NF-S06 | Audit logging | All mutations logged with user, action, resource, timestamp, IP |
| NF-S07 | Password policy | Minimum 8 chars, hashed (bcrypt/argon2), account lockout after 5 attempts |

### Scalability

| ID | Requirement | Target |
|----|------------|--------|
| NF-SC01 | Tenants supported | 1,000+ schools |
| NF-SC02 | Users per tenant | 5,000+ (students + parents + teachers + staff) |
| NF-SC03 | Backend horizontal scaling | Stateless API servers behind load balancer |
| NF-SC04 | Database connection pooling | PgBouncer or equivalent |
| NF-SC05 | File storage | Cloud object storage (S3/MinIO) with signed URLs |

### Reliability

| ID | Requirement | Target |
|----|------------|--------|
| NF-R01 | System uptime | 99.9% (school hours: 7AM–5PM, Mon–Sat) |
| NF-R02 | Data backup | Daily automated backups, 30-day retention |
| NF-R03 | Disaster recovery | RPO < 1 hour, RTO < 4 hours |
| NF-R04 | Graceful degradation | Offline attendance queuing when backend unavailable |

### Observability

| ID | Requirement | Standard |
|----|------------|----------|
| NF-O01 | Structured logging | JSON logs (not plaintext). Every log includes: requestId, tenantId, userId, service, environment |
| NF-O02 | Correlation IDs | `X-Request-ID` header propagated across all services |
| NF-O03 | Metrics endpoint | Prometheus `/metrics` exposing HTTP request counts, latency histograms, DB query durations, cache hit ratios |
| NF-O04 | Health check endpoints | `/health` (liveness), `/health/ready` (readiness with DB/Redis/storage checks) |
| NF-O05 | Distributed tracing | OpenTelemetry spans for cross-service request flows |
| NF-O06 | Frontend error tracking | Sentry initialized at app startup with ErrorBoundary, Web Vitals reporting, source maps uploaded |
| NF-O07 | User action tracking | Meaningful event names (e.g., `attendance_marked`, `homework_submitted`) with context properties |
| NF-O08 | Session replay | Record sessions with errors (100% rate); sample healthy sessions (10% rate) |
| NF-O09 | Sensitive data filtering | Passwords, tokens, credit card numbers filtered from logs, Sentry, and session replays |

### Background Processing

| ID | Requirement | Standard |
|----|------------|----------|
| NF-B01 | Async job queue | Bull/BullMQ (Redis) for long-running operations: report generation, bulk imports, mass notifications, PDF generation |
| NF-B02 | Job retry | Exponential backoff (3 attempts), dead letter queue for failed jobs |
| NF-B03 | Job monitoring | Queue dashboard showing pending/active/completed/failed counts |

### Rate Limiting & API Security

| ID | Requirement | Standard |
|----|------------|----------|
| NF-RL01 | Global rate limit | 1000 requests/minute across all endpoints |
| NF-RL02 | Auth endpoint limits | Login: 5 req/15min, Password reset: 3 req/hour |
| NF-RL03 | Rate limit headers | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` on all responses |
| NF-RL04 | API key authentication | Supported for programmatic/integration access with scoped permissions and revocable keys |
| NF-RL05 | Webhook support | HMAC-SHA256 signature verification, retry with exponential backoff, delivery logs |

### Data Integrity

| ID | Requirement | Standard |
|----|------------|----------|
| NF-D01 | Soft deletes | All major entities use `deleted_at` + `deleted_by` columns. Normal queries auto-exclude soft-deleted records |
| NF-D02 | Unique constraints | Include `deleted_at IS NULL` in unique indexes to allow re-creation of soft-deleted resources |
| NF-D03 | Idempotency | All POST/PATCH operations idempotent via `Idempotency-Key` header |

### Search

| ID | Requirement | Standard |
|----|------------|----------|
| NF-SH01 | Search infrastructure | PostgreSQL Full Text Search (FTS) with GIN indexes in Phase 1-2. Materialized `tsvector` columns in Phase 3. OpenSearch only introduced at Phase 4 when scale/relevance demands it (see [04 §4.11](./04-backend-spec.md)) |
| NF-SH02 | Tenant isolation | All search queries tenant-scoped — `tenant_id` always applied as first filter. Global search never crosses tenant boundaries |
| NF-SH03 | Per-module search | Students, teachers, homework separately searchable from Phase 1. Unified cross-module search from Phase 3 |

### Compliance

| ID | Requirement | Standard |
|----|------------|----------|
| NF-C01 | Data residency | Per-tenant configurable data storage region |
| NF-C02 | Data export | Per-tenant data export for school migrations |
| NF-C03 | Data deletion | Hard delete on tenant offboarding (GDPR-compliant) |
| NF-C04 | Accessibility | WCAG 2.1 AA compliance for frontend — semantic HTML, ARIA attributes, keyboard navigation, color contrast ≥ 4.5:1, screen reader support |
| NF-C05 | Audit log retention | 90 days online (application UI), 7 years cold storage (S3 Glacier)

---

## 1.7 Multi-Tenant Strategy

### Tenant Model

A **Tenant** represents a single school/client. Each tenant gets:
- Isolated data (shared DB, `tenant_id` column on every table)
- Custom frontend deployment with school-specific branding
- Configurable feature set (enable/disable modules per tenant)
- Configurable business rules (attendance thresholds, leave limits, grading policies)
- Dedicated Telegram bot (or shared bot with tenant routing)

### Tenant Isolation Matrix

| Layer | Mechanism |
|-------|-----------|
| **API** | Tenant context extracted from JWT `tenant` claim |
| **Service** | Tenant ID passed to all repository calls |
| **Repository** | `WHERE tenant_id = $1` on every query |
| **Database** | PostgreSQL Row-Level Security as defense-in-depth |
| **Storage** | Per-tenant prefix in object storage (`/{tenant_id}/...`) |
| **Cache** | Per-tenant cache key prefixing |

### Tenant Onboarding Flow

```
1. Super Admin creates Tenant record (name, slug, domain, plan)
2. Default configuration generated from template
3. Admin user created for the tenant
4. Frontend deployment provisioned with tenant's branding config
5. Admin configures school: subjects, classes, sections, users
6. Bulk import of students, teachers, parents (CSV)
7. School goes live
```

---

## 1.8 Frontend-Backend Contract

### Backend Responsibilities

- **Authentication & Authorization** (all security decisions)
- **Business Logic** (attendance rules, homework grading, leave workflows)
- **Data Persistence** (Prisma ORM → PostgreSQL)
- **API Contracts** (OpenAPI 3.x — single source of truth)
- **Multi-Tenancy** (tenant isolation, configuration management)
- **Notifications** (send via providers, queue management)
- **File Management** (upload, signed URLs, virus scanning)
- **Audit Logging** (all mutations)
- **Rate Limiting & Throttling**

### Backend Development Standards

#### Domain-Oriented Modular Architecture

All backend code is organized by **business domain**, not technical layers:

```
server/modules/
├── identity/          # Auth, users, roles, permissions
├── academic/          # Grades, sections, subjects, academic years/terms
├── attendance/        # Attendance marking, statuses, reports
├── assessment/        # Exams, grading, homework
├── leave/             # Leave requests, approvals, balances
├── communication/     # Notifications, templates, delivery
├── configuration/     # Config engine, reference data
└── reporting/         # Dashboards, exports, analytics
```

Each module contains:
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

#### Strict Layered Architecture

| Layer | Responsibility | Must NOT |
|-------|---------------|----------|
| **Controller** | Parse requests, extract auth/tenant context, call service, format response | Contain business logic |
| **Service** | Execute business rules, check permissions, manage transactions, coordinate repositories | Access HTTP request/response objects |
| **Repository** | Database CRUD, query optimization, entity ↔ DTO mapping | Contain business logic or reference controllers/services |

#### DTO-Based APIs (Mandatory)

- **Never** expose database entities directly in API responses
- Sensitive fields (password hashes, tokens) must never leak
- DTO naming: `CreateStudentRequestDTO`, `StudentResponseDTO`, `StudentListQueryDTO`

#### Service Abstractions (Mandatory)

All external integrations **must** be behind abstract service interfaces — modules never call external providers directly:

| Abstraction | Interface | Implementations |
|-------------|-----------|----------------|
| **FileService** | `upload()`, `download()`, `delete()`, `getSignedUrl()`, `getSignedUploadUrl()` | S3, MinIO, Azure Blob, Local FS (dev) |
| **NotificationService** | `send()`, `sendBulk()`, `getDeliveryStatus()` | Email (SendGrid/SES/SMTP), SMS (Twilio), Push (FCM), WhatsApp, In-App DB |
| **ConfigurationService** | `get<T>()`, `set()`, `getAll()`, `getDefaults()` | Database-backed with in-memory cache |
| **FeatureFlagService** | `isEnabled()`, `getAllFlags()` | Database-backed per-tenant |
| **AuditService** | `log()`, `logBulk()`, `query()`, `export()` | Database-backed with cold storage archival |

#### Notification System

- **Template-based**: Notification content stored as templates with variable substitution (Mustache/Handlebars)
- **Background delivery**: `NotificationService.send()` enqueues a job; actual delivery is async via Bull/BullMQ worker — never synchronous in API handlers
- **Multi-template per channel**: Each notification type has separate templates for email, SMS, push, WhatsApp, in-app
- **User preferences**: Per-user per-template per-channel enable/disable stored in `notification_preferences` table
- **Delivery tracking**: `notification_logs` table with status (queued/sent/delivered/failed/bounced), attempts, errors
- **Channel selection**: Resolve active channels from user preferences, fall back to template defaults

#### File Management

- **FileService abstraction**: Modules call `fileService.upload()`, never `s3Client.putObject()` directly
- **Organization**: `/{tenantId}/{module}/{year}/{month}/{uuid}-{originalName}`
- **Metadata**: File metadata stored in application DB (`files` table), raw file in storage provider
- **Security**: Signed URLs with expiration; storage buckets never publicly accessible; server-side MIME validation; unique filenames generated server-side (never trust client names)

#### Contract-Driven Development Enforcement

1. Update OpenAPI spec (`api-contract.yaml`) first
2. Regenerate server stubs & frontend SDK
3. Implement backend logic
4. CI/CD pipeline validates: valid OpenAPI → successful SDK generation → type check passes
5. **Pipeline fails** if SDK won't generate or contracts are broken

#### Definition of Done (Backend Feature)

A backend feature is **not complete** until:
- [ ] Business logic implemented
- [ ] OpenAPI contract defined (api-contract.yaml)
- [ ] DTO documentation updated (dto.md)
- [ ] Error codes documented (error-codes.md)
- [ ] Permissions documented (permissions.md)
- [ ] Workflows documented (workflows.md, if applicable)
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Frontend SDK successfully generated from contract
- [ ] CI/CD pipeline passes all contract validation checks

### Frontend Responsibilities

- **UI Rendering** (React components, responsive design)
- **Client-Side State** (Zustand stores for UI state)
- **API Consumption** (via generated TypeScript SDK from OpenAPI)
- **Client Branding** (colors, logos, school name — from tenant config)
- **Feature Flags** (show/hide UI elements based on tenant config)
- **Offline Queue** (queue attendance marks when offline)
- **PWA Features** (service worker, install prompt, push notifications)
- **Error & Loading States** (skeletons, toast notifications, error boundaries)

### Frontend Development Standards

#### Feature-Based (Domain) Architecture

Frontend mirrors backend business domains:

```
src/
├── app/                     # App entry, root layout, providers
├── modules/                 # Feature modules (domain-oriented)
│   ├── students/            # pages/, components/, hooks/, types/, routes/
│   ├── teachers/
│   ├── attendance/
│   ├── homework/
│   ├── exams/
│   ├── leave/
│   ├── reports/
│   └── administration/
├── generated/               # Auto-generated from OpenAPI (NEVER hand-edit)
│   ├── students.ts          # Student API client + types
│   ├── attendance.ts
│   └── index.ts
├── shared/                  # Reusable cross-cutting code
│   ├── api/                 # Centralized API layer (wraps generated SDK + mappers)
│   ├── components/          # Design system (Button, Input, Modal, DataTable)
│   ├── forms/               # Form framework (TextField, SelectField, DateField)
│   ├── tables/              # DataTable framework
│   ├── auth/                # AuthProvider, usePermissions, error interceptor
│   ├── config/              # Env config, feature flags, runtime config
│   ├── monitoring/          # Sentry, analytics, Web Vitals
│   ├── hooks/               # Shared hooks (useOnlineStatus, etc.)
│   └── utils/               # cn(), formatters, validators
├── store/                   # Global UI state (Zustand)
└── types/                   # Shared TypeScript types
```

#### AI-Agent Friendly Conventions

All modules follow the **exact same structure** for predictable AI-assisted development:

| Element | Convention |
|---------|-----------|
| **Module name** | Plural, lowercase: `students`, `teachers`, `attendance` |
| **Page suffix** | `Page` suffix: `StudentsListPage`, `StudentCreatePage` |
| **Hook prefix** | `use` prefix: `useStudents`, `useCreateStudent` |
| **Default exports** | Pages **only** (for lazy loading). All other files use **named exports** |
| **Path aliases** | `@/` = `src/`, `@shared/` = `src/shared/`, `@modules/` = `src/modules/`. No deep relative paths |
| **Barrel exports** | Each module has `index.ts` exporting its public API (pages, hooks, types) |

#### State Management — Server vs UI Separation

| State Type | Examples | Tool | Storage |
|-----------|----------|------|---------|
| **Server State** | Students, teachers, attendance, homework | **TanStack Query** | Cache (memory + persistence) |
| **UI State** | Modal open/close, sidebar collapsed, selected tab | **Zustand** | Memory |
| **Form State** | Input values, validation errors | **React Hook Form** | Ephemeral |

**Never** put server data in Zustand. **Never** put UI state in TanStack Query.

TanStack Query conventions: Query keys are hierarchical (`["students"]`, `["students", id]`, `["students", { classId, page }]`). Mutations **always** invalidate related queries on success. Global config: `staleTime: 30s`, `gcTime: 5min`, `retry: 2`.

#### API Layer Isolation & DTO Mapping

**Components and pages must never call APIs directly.** Always use:

```
Backend OpenAPI Spec
    ↓ (auto-generate)
Generated TypeScript SDK  (in generated/, never hand-edited)
    ↓ (wrap)
Shared API Layer          (shared/api/ — adds auth headers, error handling)
    ↓ (map)
DTO Mappers               (shared/api/*.mapper.ts — backend DTO → Frontend ViewModel)
    ↓ (consume)
TanStack Query Hooks      (modules/*/hooks/ — call API layer, invoke mapper)
    ↓ (render)
Components/Pages          (receive ViewModels, never DTOs)
```

**Backend change resilience:** If backend renames a field, only the corresponding mapper file changes — pages, components, forms, tables are untouched.

#### Generated Types (Mandatory)

- **All API DTO types are auto-generated from OpenAPI** — handwritten DTOs are **prohibited**
- CI/CD pipeline **fails** if SDK generation fails or type check breaks
- Three-tier type system: API DTO (generated) → View Model (UI) → Form Data (input)

#### Strict TypeScript

- `strict: true` in tsconfig.json with `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`
- **`any` usage is forbidden** — ESLint rule: `@typescript-eslint/no-explicit-any: error`
- Use `unknown` + type guards when type is truly undetermined
- Zod/Valibot runtime validation at API boundaries

#### UX Standards — The Four Essential States

Every data-driven screen **must** handle:

| State | Component | Behavior |
|-------|-----------|----------|
| **Loading** | `TableSkeleton`, `CardSkeleton`, `PageSkeleton` | Skeleton matching content shape (never a single spinner) |
| **Empty** | `EmptyState` (icon + title + description + CTA) | "No students yet. Add your first student." |
| **Error** | `ErrorState` (clear message + "Try Again" button) | User-friendly, no stack traces |
| **Success** | Rendered data | Actual content |

#### Offline & Network Resilience

- `OfflineBanner` component shown when network disconnected
- TanStack Query `retry: 2` + cache persistence (localStorage, 24h maxAge)
- Disable write operations with clear messaging when offline
- Attendance queued in IndexedDB for later sync (Phase 2)

#### Component Libraries

- **Design system**: All common UI elements in `shared/components/` (Button, Input, Modal, Badge, Card, Spinner, Toast)
- **DataTable**: Single reusable `DataTable<T>` component with server-side pagination, sorting, filtering, column visibility, row actions, CSV export
- **Form framework**: Reusable form fields (TextField, SelectField, DateField, FileUploadField) integrated with React Hook Form

#### Performance

- **Route-based code splitting** — all page components are `React.lazy()` loaded
- **Component-level lazy loading** for heavy components (charts, export dialogs, rich text editors)
- **`React.memo`** on frequently re-rendered pure components
- **`useMemo`** for expensive computations (large array filtering)
- **Virtualization** (TanStack Virtual) for lists > 1,000 rows
- Images: WebP/AVIF formats, lazy loading below the fold, responsive sizes

#### Auth & Security Patterns

- **Centralized `AuthProvider`** wraps the entire app — manages login, logout, session refresh, user context
- **Permission-based UI**: Components use `can("students:create")` — **never** `user.role === "admin"`
- **Backend-driven navigation**: Sidebar/menu filtered by user permissions from backend
- **Global error interceptor**: Single Axios interceptor handles 401→logout, 403→forbidden page, 404→not-found, 422→form validation, 429→toast, 500→server error
- **`ErrorBoundary`** wraps sections of the app for crash recovery

### Communication Pattern

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│ Frontend (Client A)│  │ Frontend (Client B)│  │ AI Chat Service      │
│ school-a.edu.app  │  │ school-b.edu.app  │  │ (Separate Repo)      │
└────────┬─────────┘  └────────┬─────────┘  │ Telegram/WhatsApp/   │
         │                     │             │ WebChat              │
         │ HTTPS + JWT         │             └────────┬─────────────┘
         │ X-Tenant-ID         │                      │
         ▼                     ▼                      ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Backend API (Shared)                             │
│                    api.edutech.com                                  │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ Auth     │  │ Business │  │ Multi-    │  │ AI Module        │  │
│  │ Service  │  │ Contexts │  │ Tenant    │  │ (In-Backend)     │  │
│  └──────────┘  └──────────┘  │ Middleware│  │                  │  │
│                              └───────────┘  │ - Homework Gen   │  │
│  ┌──────────┐  ┌──────────┐                 │ - Auto-Grading   │  │
│  │ Engine   │  │ Event    │                 │ - Report         │  │
│  │ Layer    │  │ Bus      │                 │   Summaries      │  │
│  └──────────┘  └──────────┘                 └──────────────────┘  │
│                       │                                             │
│              ┌────────▼────────┐                                    │
│              │  Prisma + PG    │                                    │
│              └─────────────────┘                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Three consumers, one backend:**

| Consumer | Auth | Purpose | Access Pattern |
|----------|------|---------|----------------|
| **Frontend** | JWT (user session) | Customer-facing UI for teachers, parents, students | User-interactive, real-time |
| **AI Chat Service** | x-api-key (service-to-service) | Conversational chatbot + AI task execution via chat | User-interactive via chat channels |
| **Backend AI Module** | Internal (same process) | Backend-initiated AI tasks: homework generation, auto-grading, report summaries | Triggered by business logic, async (BullMQ jobs) |

**Key distinction:**
- The **AI Chat Service** (separate repo) is a consumer of backend APIs — just like the frontend. It handles conversational interactions (Telegram, WhatsApp, WebChat).
- The **Backend AI Module** lives inside the NestJS backend. It handles AI tasks triggered by backend operations (teacher clicks "Generate Homework" → backend AI module calls OpenAI → returns questions). It uses the same AI provider abstraction but runs as part of the backend process.
- Both share the same AI provider configuration (per-tenant model selection, cost limits) stored in the backend.

---

## 1.9 Phased Rollout Plan (Engine-First)

### Phase 0 — Backend Engine Foundation + Admin UI (Weeks 1-4) ⭐ CRITICAL

**Goal:** Build engines, APIs, and a thin **backend-served admin UI** (NestJS MVC with Handlebars). The admin UI allows Super Admins and School Admins to configure attendance statuses, grading scales, academic calendars, and workflows — proving the APIs are generic and consumable by any client. No customer frontend exists yet.

| Deliverable | Description |
|-------------|-------------|
| **Reference Data Tables** | Replace ALL Prisma enums with tenant-configurable reference data tables |
| **Configuration Engine** | Hierarchical JSON Schema config. Attendance statuses, grading scales, academic calendars — all tenant-defined |
| **Rules Engine** | JSON condition/action evaluation for grade calculation, attendance aggregation, promotion eligibility |
| **Workflow Engine** | Configurable state machines for leave approvals, corrections, admissions |
| **Event Bus** | In-process typed event bus for inter-context communication (Redis Pub/Sub later) |
| **Academic Calendar Tables** | AcademicYear + AcademicTerm models (semester/trimester/quarterly) |
| **Metadata Columns** | JSONB `metadata` on Student, Staff, Homework, Exam tables |
| **Engine API Endpoints** | Config, Rules, and Workflow REST APIs with OpenAPI contracts |
| **Backend-Admin UI** | Server-rendered admin interface (NestJS MVC) — attendance statuses editor, grading scale editor, academic calendar editor, workflow viewer, rules viewer, seed-data loader. Consumes the same APIs that customer frontends will use |
| **OpenAPI Scaffolding** | Per-module api-contract.yaml files for all 8 bounded contexts, SDK generation pipeline |
| **Service Abstractions** | FileService, NotificationService, AuditService, ConfigurationService interfaces + dev implementations |
| **Testing Infrastructure** | Vitest config, Supertest for API tests, contract tests against OpenAPI specs |
| **Observability Setup** | Structured JSON logging, Request ID middleware, `/health` + `/health/ready` endpoints, Prometheus `/metrics` endpoint |
| **CI/CD Scaffolding** | OpenAPI validation → SDK generation → type check → lint → unit tests → contract tests pipeline |

### Phase 1 — Backend Business Modules (Weeks 5-10)

**Goal:** Build all business modules ON TOP of the engine layer. Zero hardcoded business rules. All APIs tested with config variability tests. OpenAPI contracts finalized. Generated TypeScript SDK ready for frontend consumption. No customer frontend yet.

| Deliverable | Description |
|-------------|-------------|
| Auth + RBAC | SuperTokens + JWT + permission-based RBAC with `resource:action` permissions |
| Academic Structure | Tenants, grades, sections, subjects, classes, students, teachers |
| **Attendance (config-driven)** | Dynamic statuses from ConfigEngine, RulesEngine calculation, WorkflowEngine corrections |
| **Homework (config-driven)** | RulesEngine grading, AI generation endpoint, submission workflow with file upload |
| **Exam (config-driven)** | Config-driven types + RulesEngine grading + RulesEngine promotion |
| **Leave (workflow-driven)** | WorkflowEngine approvals — School A: 2-step, School B: 3-step, School C: conditional |
| **Notifications (event-driven)** | Template-based notifications triggered by domain events via Event Bus |
| **Reporting API** | Attendance reports, exam results, dashboards, export (CSV/Excel/PDF) |
| Seed data | 3 diverse school configs (grade bands, percentage, GPA) — loaded via backend-admin UI |
| **Full API Test Suite** | Supertest integration tests, config variability tests (3+ school configs per module), tenant isolation tests, contract tests against OpenAPI specs |
| **Finalized OpenAPI Specs** | All api-contract.yaml files validated against implementation. Generated TypeScript SDK builds successfully |
| **Module Documentation** | README.md, permissions.md, dto.md, error-codes.md, workflows.md completed for all modules |
| **CI/CD Pipeline** | OpenAPI validation → SDK gen → type check → lint → unit → integration → contract tests — all passing |

### Phase 2 — Customer Frontends (Weeks 11-16)

**Goal:** Build customer-facing Next.js frontends consuming the completed backend APIs via generated TypeScript SDK. The backend-admin UI (Phase 0) remains for configuration. Per-tenant deployments with school-specific branding.

| Deliverable | Description |
|-------------|-------------|
| **Frontend Foundation** | Next.js 14 + TypeScript strict + Tailwind + shadcn/ui + generated SDK integration |
| **AuthProvider + Permissions** | Centralized auth context, `can("resource:action")` hook, PermissionGate, global error interceptor, ErrorBoundary |
| **Design System** | DataTable (pagination/sort/filter/export), Form framework (TextField/SelectField/DateField/FileUploadField), EmptyState, ErrorState, LoadingSkeleton, OfflineBanner |
| **Attendance UI** | Dynamic status toggles rendered from ConfigEngine — adapts to school's statuses |
| **Homework UI** | Create/assign/submit/grade with dynamic grade display from ConfigEngine |
| **Exam UI** | Score entry grid with grade badges, percentage bars, GPA display — all config-driven |
| **Leave UI** | Dynamic workflow stepper from WorkflowEngine — shows tenant-specific approval chains |
| **Dashboards** | Teacher, Principal, Parent, Student role-based dashboards |
| **Admin Pages** | Subject/class/section management, user management, permission editor, feature flags UI |
| **Per-Client Customization** | Build-time config (tenant slug, API URL) + runtime branding (CSS vars, logo, school name from ConfigEngine) |
| **PWA + Offline** | Service worker, install prompt, IndexedDB attendance queue for offline marking |
| **Frontend Testing** | Unit tests (Vitest, 80%+ coverage on hooks/mappers/components), integration tests (MSW on critical flows), E2E tests (Playwright on login, attendance, homework lifecycle, leave, reports) |
| **3-Client Proof** | Deploy 3 diverse school frontends against same backend — prove config-driven variability |

### Phase 3 — Advanced Engines + AI (Weeks 17-22)

| Deliverable | Description |
|-------------|-------------|
| **Metadata Engine** | Custom fields (JSONB + field definitions), dynamic forms, zero schema changes. Admin UI extends backend-admin |
| **Template Engine** | Handlebars/PDF report cards, certificates, letters with per-school branding. Admin UI extends backend-admin |
| **Workflow Designer** | Visual state machine editor (extends backend-admin UI) |
| **Rules Editor** | Rule editor with live tester (extends backend-admin UI) |
| **AI abstraction layer** | Multi-provider (OpenAI, Anthropic, Google, local). Configurable AI tasks per tenant |
| **AI Chatbot** | Telegram bot with LangGraph agent, intent classification, leave application flow |
| **AI Auto-Grading** | Evaluate objective answers, suggest scores, generate feedback comments |
| **AI Homework Generator** | Teacher inputs subject/chapter → AI generates questions |
| Multi-channel notifications | Push (FCM), SMS (Twilio), Email (SendGrid), WhatsApp |
| Advanced reporting | Custom report builder, analytics dashboards |
| Multi-language | i18n framework (English, Hindi, Marathi) — backend + frontend |

### Phase 4 — Enterprise + Scale (Weeks 23-28)

| Deliverable | Description |
|-------------|-------------|
| Tier 2-4 multi-tenant | Separate schema → Dedicated DB → Dedicated instance routing |
| Performance optimization | Redis caching, PgBouncer connection pooling, query optimization |
| Monitoring | Prometheus + Grafana dashboards + Sentry error tracking |
| Audit & compliance | Full audit UI, compliance reports, data export/deletion (GDPR) |
| CI/CD per client | Automated test → build → deploy pipelines per client frontend |
| Documentation + SDK | API docs (Swagger/Scalar), integration guides, client SDK |
| Security | Penetration testing, load testing (1000 users/tenant, 100 tenants) |

---

## 1.9a Testing Strategy

> **Layered testing approach** covering unit, integration, and end-to-end tests from Phase 0.

### Testing Pyramid

```
        ╱╲
       ╱  ╲
      ╱ E2E╲         ← Few: Critical user journeys (Playwright)
     ╱______╲
    ╱        ╲
   ╱Integration╲     ← Some: Module workflows, API integration (Vitest + MSW)
  ╱____________╲
 ╱              ╲
╱   Unit Tests   ╲    ← Many: Components, hooks, utils, mappers (Vitest)
╱__________________╲
```

| Layer | Tool | Coverage Target | Speed |
|---|---|---|---|
| Unit | Vitest + @testing-library/react | 80%+ | Fast (ms) |
| Integration | Vitest + MSW (Mock Service Worker) | 60%+ | Medium (s) |
| E2E | Playwright | Critical paths | Slow (min) |

### Unit Tests (Vitest)

Cover in isolation: components, hooks, utility functions, mappers, validators.

**Component tests** verify: rendering, user interactions (click, type), conditional rendering, accessibility.
**Hook tests** verify: loading state, success state, error state, parameter handling.
**Mapper tests** verify: DTO → ViewModel transformation, edge cases (null, empty, undefined).
**Utility tests** verify: formatting, calculation, validation logic.

### Integration Tests (Vitest + MSW)

Test module-level workflows with realistic API mocking via MSW (Mock Service Worker):

- Form submission workflows (fill → validate → submit → success/error)
- Search + filter + pagination flows
- CRUD lifecycles (create → list → edit → delete)
- Error recovery flows (network failure → retry)

### End-to-End Tests (Playwright)

Test critical user journeys from the user's perspective:

| Journey | Description |
|----------|------------|
| **Login → Dashboard** | Authentication flow, permission loading |
| **Mark Attendance** | Select class, mark students, save — < 60s completion |
| **Homework Lifecycle** | Create → Publish → Student Submit → Teacher Grade |
| **Leave Request** | Parent applies → Teacher approves → Principal approves |
| **Reports Generation** | Select filters → Generate → Export CSV/Excel/PDF |
| **Student CRUD** | List, create, edit, delete students |

### CI/CD Integration

- Tests run on every commit/PR
- Coverage reports generated and gated (unit < 80% = fail)
- Playwright E2E runs against staging environment
- MSW mocks validated against latest OpenAPI spec for consistency

---

## 1.10 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Attendance completion time** | < 60 seconds per class | Telemetry on attendance submission |
| **Teacher adoption rate** | > 80% within 30 days | Login frequency, attendance marks |
| **Parent engagement** | > 40% weekly active parents | Notification opens, portal visits |
| **API availability** | 99.9% during school hours | Uptime monitoring |
| **Tenant onboarding time** | < 2 hours from signup to live | Onboarding workflow tracking |
| **Student homework submission** | > 90% on-time rate | Submission timestamp analysis |
| **Chatbot query resolution** | > 85% without human escalation | Conversation completion tracking |
| **NPS (Net Promoter Score)** | > 50 | Quarterly teacher/principal surveys |

---

## 1.11 Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Data migration complexity | Medium | High | Incremental migration with dual-write period |
| Tenant isolation breach | Low | Critical | RLS + integration tests + security audit |
| Performance at scale | Medium | High | Load testing from Phase 1, query optimization, virtualization for large lists |
| Frontend customization scope creep | High | Medium | Strict API contract, feature flag boundaries, DTO mapping layer isolates backend changes |
| AI service latency | Medium | Medium | Async processing, caching, fallback responses |
| Teacher resistance to change | High | Medium | UX research, teacher-friendly design, training videos |
| **Engine complexity delays Phase 1** | Medium | High | Build minimum viable engine first. Add advanced features in Phase 2. Thorough documentation |
| **Configuration sprawl** | Medium | Medium | Mandatory template inheritance (never start from blank). 4 standard templates (CBSE, ICSE, Preschool, International). Max 100 configs/tenant, 50 overrides. Weekly drift detection. Template upgrade impact analysis. See [`12-configuration-engine.md` §12.6a-12.6d](./12-configuration-engine.md) |
| **Reporting performance impact on OLTP** | Medium | High | Reporting context uses phased isolation: Phase 1 direct query (acceptable at <100 tenants), Phase 3 read replica, Phase 4 dedicated analytics DB with materialized views. Heavy reports run as background jobs. See [`18-domain-driven-design.md` §8](./18-domain-driven-design.md) |
| **Search strategy missing** | Medium | Medium | PostgreSQL FTS with GIN indexes in Phase 1-2. `tsvector` columns in Phase 3. OpenSearch only at Phase 4 when PostgreSQL FTS thresholds exceeded (500ms p95 or 50+ req/s). See [`04-backend-spec.md` §4.11](./04-backend-spec.md) |
| **Event bus reliability** | Low | High | Start with in-process event bus. Add persistence (Redis Streams) before production |
| **OpenAPI contract drift** | Medium | High | CI/CD pipeline fails on contract break. Generated SDK blocks deployment. Contract tests in pipeline |
| **Frontend-backend type mismatch** | Medium | High | All API types auto-generated from OpenAPI. Handwritten DTOs prohibited. Pipeline blocks on type errors |
| **Observability blind spots** | Medium | High | Structured logging + Request IDs from Phase 0. Sentry + Prometheus in Phase 1. Distributed tracing in Phase 3 |
| **Notification delivery failures** | Medium | Medium | Background job queue with exponential backoff retry. Dead letter queue. Delivery monitoring dashboard |
| **File storage provider lock-in** | Low | Medium | FileService abstraction with multiple provider implementations. Local FS for dev, S3/MinIO for prod |
| **Accessibility non-compliance** | Medium | Medium | WCAG 2.1 AA checklist enforced from Phase 1. axe-core in CI. Semantic HTML + ARIA attributes mandatory |
| **Codebase inconsistency for AI agents** | Medium | Medium | Strict AI-agent friendly conventions (named exports, path aliases, consistent module structure). ESLint rules enforce |

---

> **Next:** See [`02-spec-template.md`](./02-spec-template.md) for the standard template used to specify individual features.
