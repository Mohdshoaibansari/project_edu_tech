# 1. Product Requirements Document (PRD)

> **Product:** EduTech — AI-Powered School Operations Platform  
> **Version:** 1.0.0  
> **Status:** Draft — Pre-Implementation  
> **Date:** 2026-06-05  
> **Author:** Architecture & Engineering Team  

---

## 1.1 Executive Summary

EduTech is a **multi-tenant, AI-powered school operations platform** that unifies Attendance Management, Homework Management, Exam Tracking, Leave Management, Parent Communication, and AI Chatbot capabilities into a single, scalable system.

The platform is architected as **decoupled frontend and backend applications**:
- **Backend:** A shared Node.js API server that serves ALL client schools through a single multi-tenant deployment
- **Frontend:** Per-client customizable Next.js applications that consume the shared backend APIs

This architecture enables:
- One backend codebase, one database cluster — serving unlimited schools
- Each school gets a customized frontend (branding, feature set, workflows)
- Centralized security, auth, and data management
- Independent scaling of frontend and backend layers
- AI capabilities shared across all tenants

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

### Target State (Decoupled Multi-Tenant)

| Dimension | Current (Monolith) | Target (Decoupled) |
|-----------|-------------------|-------------------|
| **Architecture** | Next.js monolith + Python AI | Separate Backend API + Per-client Frontend |
| **Multi-tenancy** | None (single school) | Full tenant isolation with `tenant_id` |
| **Frontend** | One codebase, one look | Per-client customizable (branding, features, workflows) |
| **Backend** | Embedded in Next.js | Standalone Node.js API (Express/NestJS) |
| **Configuration** | Hardcoded | Database-driven, per-tenant |
| **Auth** | SuperTokens + JWT cookie | SuperTokens (centralized) + JWT access tokens |
| **Deployment** | Single Docker Compose | Independent backend cluster + per-client frontend deployments |
| **AI Service** | FastAPI microservice | Same FastAPI + LangGraph, now tenant-aware |

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

| ID | Requirement | Priority | Phase |
|----|------------|----------|-------|
| AT-01 | Teacher takes manual attendance (mobile-first roll-call grid) | P0 | 1 |
| AT-02 | All students marked PRESENT by default; teacher marks absentees only | P0 | 1 |
| AT-03 | Support attendance statuses: PRESENT, ABSENT_UNEXCUSED, ABSENT_EXCUSED, TARDY, MEDICAL_LEAVE, APPROVED_LEAVE, HALF_DAY | P0 | 1 |
| AT-04 | Per-grade configurable: Daily (homeroom) vs Subject-wise attendance | P0 | 1 |
| AT-05 | Attendance correction workflow (Request → Approve/Reject) | P0 | 1 |
| AT-06 | Offline attendance with auto-sync | P1 | 2 |
| AT-07 | Biometric/QR-based attendance for staff | P2 | 3 |
| AT-08 | Period-wise attendance (multiple periods per day) | P1 | 2 |

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

### Module 3: Exam Management

| ID | Requirement | Priority | Phase |
|----|------------|----------|-------|
| EX-01 | Create exams: unit test, mid-term, final, quiz, annual | P0 | 1 |
| EX-02 | Score entry: per-student, bulk save, absent toggle | P0 | 1 |
| EX-03 | Pass/fail tracking with configurable pass score | P0 | 1 |
| EX-04 | Class statistics: average, highest, lowest, pass/fail rates, grade distribution | P0 | 1 |
| EX-05 | Student exam results view (student + parent portals) | P0 | 1 |
| EX-06 | Rubric-based grading for exams | P0 | 1 |

### Module 4: Leave Management

| ID | Requirement | Priority | Phase |
|----|------------|----------|-------|
| LV-01 | Parent applies for student leave (type, dates, reason) | P0 | 1 |
| LV-02 | Multi-level approval: Teacher → Principal workflow | P0 | 1 |
| LV-03 | Staff leave application workflow | P0 | 1 |
| LV-04 | Leave status tracking (pending, approved, rejected, cancelled) | P0 | 1 |
| LV-05 | Leave history and reporting | P1 | 2 |

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

## 1.9 Phased Rollout Plan

### Phase 1 — Foundation (Weeks 1–6)

**Goal:** Standalone backend API + Single client frontend (migrate existing functionality)

| Deliverable | Description |
|-------------|-------------|
| Backend API scaffold | Express/NestJS with TypeScript, modular domain structure |
| Database schema migration | Prisma schema with `tenant_id` on all tables |
| Auth system | SuperTokens integration + JWT access/refresh tokens |
| RBAC engine | Permission-based authorization with role-permission mapping |
| Tenant infrastructure | Tenant model, context middleware, query filtering |
| Attendance module | Full CRUD + correction workflow |
| Homework module | Full CRUD + submission + grading |
| Frontend scaffold | Next.js 14 client with Tailwind + shadcn/ui |
| API client generation | OpenAPI → TypeScript SDK |
| Migrate existing data | Seed script for demo data, tenant import tool |

### Phase 2 — Multi-Tenant & Scale (Weeks 7–12)

**Goal:** Multiple tenants, configuration system, second client frontend

| Deliverable | Description |
|-------------|-------------|
| Configuration engine | Per-tenant config service with database storage |
| Feature flags | Per-tenant feature enable/disable |
| Branding system | Per-tenant logo, colors, school name |
| Second client deployment | Demonstrate per-client customization |
| Admin dashboard | Super Admin tenant management UI |
| Performance optimization | Query optimization, caching, connection pooling |
| Rate limiting | Per-tenant and per-endpoint rate limits |

### Phase 3 — Advanced Features (Weeks 13–18)

**Goal:** AI enhancements, notifications, reporting, offline support

| Deliverable | Description |
|-------------|-------------|
| Notification service | Multi-channel (Push, SMS, Email, WhatsApp, Telegram) |
| Advanced reporting | Custom report builder, scheduled reports |
| AI homework features | OCR extraction, image quality check, bulk AI grading |
| Offline support | PWA with IndexedDB queue |
| Analytics dashboard | Teacher/principal analytics |
| Multi-language | i18n framework with English, Hindi, Marathi |

### Phase 4 — Enterprise (Weeks 19–24)

**Goal:** Compliance, monitoring, observability, marketplace

| Deliverable | Description |
|-------------|-------------|
| Audit & compliance | Full audit trail, compliance reports, data export |
| Monitoring | Prometheus metrics, Grafana dashboards, Sentry error tracking |
| CI/CD | Automated testing, deployment pipelines per client |
| Documentation | API docs, integration guides, client onboarding guide |
| Client SDK | JavaScript/Python SDK for third-party integrations |

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

---

> **Next:** See [`02-spec-template.md`](./02-spec-template.md) for the standard template used to specify individual features.
