# 1. Product Requirements Document (PRD)

> **Product:** EduTech — AI-Powered School Operations Platform  
> **Version:** 2.0.0  
> **Status:** Draft — Post-Architecture-Review  
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

### Module 7: AI Chatbot

| ID | Requirement | Priority | Phase |
|----|------------|----------|-------|
| AI-01 | Telegram-based chatbot for attendance queries | P0 | 1 |
| AI-02 | Role-based responses (teacher vs parent vs student context) | P0 | 1 |
| AI-03 | Intent classification: attendance, leave, homework, exam queries | P0 | 1 |
| AI-04 | Leave application via Telegram conversation flow | P0 | 1 |
| AI-05 | Homework status queries via chatbot | P1 | 2 |
| AI-06 | Multi-language support (English, Hindi, Marathi) | P1 | 2 |
| AI-07 | Voice note → Homework generation | P2 | 3 |

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

## 1.6 Non-Functional Requirements

### Performance

| ID | Requirement | Target |
|----|------------|--------|
| NF-P01 | Attendance marking completion time | < 60 seconds for a class of 60 students |
| NF-P02 | API response time (p95) | < 200ms for reads, < 500ms for writes |
| NF-P03 | Page load time (LCP) | < 2.5 seconds |
| NF-P04 | AI chatbot response time | < 5 seconds |
| NF-P05 | Concurrent users per tenant | 500+ simultaneous |

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

### Compliance

| ID | Requirement | Standard |
|----|------------|----------|
| NF-C01 | Data residency | Per-tenant configurable data storage region |
| NF-C02 | Data export | Per-tenant data export for school migrations |
| NF-C03 | Data deletion | Hard delete on tenant offboarding (GDPR-compliant) |
| NF-C04 | Accessibility | WCAG 2.1 AA compliance for frontend |

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

### Frontend Responsibilities

- **UI Rendering** (React components, responsive design)
- **Client-Side State** (Zustand stores for UI state)
- **API Consumption** (via generated TypeScript SDK from OpenAPI)
- **Client Branding** (colors, logos, school name — from tenant config)
- **Feature Flags** (show/hide UI elements based on tenant config)
- **Offline Queue** (queue attendance marks when offline)
- **PWA Features** (service worker, install prompt, push notifications)
- **Error & Loading States** (skeletons, toast notifications, error boundaries)

### Communication Pattern

```
┌──────────────────────┐         ┌──────────────────────┐
│   Frontend (Client A) │         │   Frontend (Client B) │
│   school-a.edu.app    │         │   school-b.edu.app    │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           │  HTTPS + JWT Bearer Token       │
           │  X-Tenant-ID Header             │
           │                                │
           ▼                                ▼
┌──────────────────────────────────────────────────┐
│              Backend API (Shared)                 │
│              api.edutech.com                      │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Auth     │  │ Business │  │ Multi-Tenant  │  │
│  │ Service  │  │ Logic    │  │ Middleware     │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                       │                           │
│              ┌────────▼────────┐                  │
│              │  Prisma + PG    │                  │
│              └─────────────────┘                  │
└──────────────────────────────────────────────────┘
           │
           │  Internal API (x-api-key)
           ▼
┌──────────────────────────────────────────────────┐
│         Python AI Service (FastAPI + LangGraph)   │
│         Telegram Bot → LangGraph → Backend APIs   │
└──────────────────────────────────────────────────┘
```

---

## 1.9 Phased Rollout Plan (Engine-First)

### Phase 0 — Engine Foundation (Weeks 1-4) ⭐ CRITICAL

**Goal:** Build the engine layer FIRST — before any business modules.

| Deliverable | Description |
|-------------|-------------|
| **Reference Data Tables** | Replace ALL Prisma enums (AttendanceStatus, ExamType, NotificationType, LeaveType) with tenant-configurable reference data tables |
| **Configuration Engine** | Hierarchical JSON Schema config. Attendance statuses, grading scales, academic calendars — all tenant-defined |
| **Rules Engine** | JSON condition/action evaluation for grade calculation, attendance aggregation, promotion eligibility |
| **Workflow Engine** | Configurable state machines for leave approvals, corrections, admissions |
| **Event Bus** | In-process typed event bus for inter-context communication (Redis Pub/Sub later) |
| **Academic Calendar Tables** | AcademicYear + AcademicTerm models (semester/trimester/quarterly) |
| **Metadata Columns** | JSONB `metadata` on Student, Staff, Homework, Exam tables |
| **Configuration Admin UI** | Form generated from JSON Schema — admins define statuses, grading scales, calendars without code |

### Phase 1 — Business Modules (Weeks 5-12)

**Goal:** Build modules ON TOP of the engine layer. Zero hardcoded business rules.

| Deliverable | Description |
|-------------|-------------|
| Auth + RBAC | SuperTokens + JWT + permission-based RBAC |
| Academic Structure | Tenants, grades, sections, subjects, classes, students, teachers |
| **Attendance (config-driven)** | Dynamic statuses from ConfigEngine, RulesEngine calculation, WorkflowEngine corrections |
| **Homework (config-driven)** | RulesEngine grading, AI generation, submission workflow |
| **Exam (config-driven)** | Config-driven types + RulesEngine grading + RulesEngine promotion |
| **Leave (workflow-driven)** | WorkflowEngine approvals — School A: 2-step, School B: 3-step, School C: conditional |
| **Notifications (event-driven)** | Listen to domain events → send alerts. Tenant-configurable notification types |
| Seed data | 3 diverse school configs (grade bands, percentage, GPA) |
| **Frontend (config-driven UI)** | Dynamic status toggles, grade displays, workflow steps — all rendered from tenant config |

### Phase 2 — Advanced Engines + Scale (Weeks 13-18)

| Deliverable | Description |
|-------------|-------------|
| **Metadata Engine** | Custom fields (JSONB + field definitions), dynamic forms, zero schema changes |
| **Template Engine** | Handlebars/PDF report cards, certificates, letters with per-school branding |
| **Workflow Designer UI** | Visual state machine editor |
| **Rules Admin UI** | Rule editor with live tester |
| Hybrid multi-tenant routing | Tier 1 (shared schema) → Tier 2 (separate schema) → Tier 3 (dedicated DB) |
| Performance optimization | Redis caching, connection pooling, query optimization |

### Phase 3 — AI + Advanced (Weeks 19-24)

| Deliverable | Description |
|-------------|-------------|
| **AI abstraction layer** | Multi-provider (OpenAI, Anthropic, Google, local). Configurable AI tasks per tenant |
| Multi-channel notifications | Push, SMS, Email, WhatsApp, Telegram |
| Advanced reporting | Custom report builder, analytics dashboards |
| Offline support | PWA with IndexedDB queue |
| Multi-language | i18n framework (English, Hindi, Marathi) |

### Phase 4 — Enterprise (Weeks 25-30)

| Deliverable | Description |
|-------------|-------------|
| Tier 3/4 deployments | Dedicated DB + dedicated instance for enterprise tenants |
| Audit & compliance | Full audit UI, compliance reports, data export/deletion |
| Monitoring | Prometheus + Grafana + Sentry |
| CI/CD | Automated pipelines per client |
| Documentation + SDK | API docs, integration guides, client SDK |

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
| Performance at scale | Medium | High | Load testing from Phase 1, query optimization |
| Frontend customization scope creep | High | Medium | Strict API contract, feature flag boundaries |
| AI service latency | Medium | Medium | Async processing, caching, fallback responses |
| Teacher resistance to change | High | Medium | UX research, teacher-friendly design, training videos |
| **Engine complexity delays Phase 1** | Medium | High | Build minimum viable engine first. Add advanced features in Phase 2. Thorough documentation |
| **Configuration sprawl** | Medium | Medium | Configuration templates for common school types. Inheritance to reduce duplication |
| **Event bus reliability** | Low | High | Start with in-process event bus. Add persistence (Redis Streams) before production |

---

> **Next:** See [`02-spec-template.md`](./02-spec-template.md) for the standard template used to specify individual features.
