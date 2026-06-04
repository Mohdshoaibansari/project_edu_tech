# 9. Implementation Roadmap

> **Status:** Draft — Pre-Implementation  
> **Last Updated:** 2026-06-05

---

## 9.1 Roadmap Overview

```
Phase 1: Foundation (Weeks 1-6)
    │
    ├── Scaffold backend + database
    ├── Auth system (SuperTokens + JWT)
    ├── Core modules (Attendance, Homework, Exams, Leave)
    ├── Single-tenant frontend (migrate existing)
    └── Internal AI service integration
    │
Phase 2: Multi-Tenant (Weeks 7-12)
    │
    ├── Tenant infrastructure (isolation, config, features)
    ├── Configuration engine
    ├── Second client deployment (demo customization)
    ├── Super Admin dashboard
    └── Performance optimization
    │
Phase 3: Advanced Features (Weeks 13-18)
    │
    ├── Multi-channel notifications
    ├── Advanced reporting
    ├── AI homework enhancements (OCR, quality check)
    ├── Offline support (PWA)
    └── Multi-language (i18n)
    │
Phase 4: Enterprise (Weeks 19-24)
    │
    ├── Audit & compliance
    ├── Monitoring & observability
    ├── CI/CD pipelines
    ├── Documentation portal
    └── Client SDK
```

---

## 9.2 Phase 1 — Foundation (Weeks 1-6)

**Goal:** Standalone backend API + single-client frontend (migrate from monolith)

### Week 1-2: Project Scaffold & Database

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Initialize NestJS backend project | P0 | 1d | — |
| Set up TypeScript strict config | P0 | 0.5d | — |
| Set up Prisma with PostgreSQL | P0 | 1d | — |
| Create tenant-aware schema (all models + tenant_id) | P0 | 2d | Prisma |
| Write seed script for demo data | P0 | 1d | Schema |
| Configure ESLint, Prettier, Husky | P1 | 0.5d | — |
| Set up Vitest + Supertest | P0 | 0.5d | — |
| Set up Docker Compose (PostgreSQL + Redis + SuperTokens) | P0 | 1d | — |

### Week 2-3: Auth & RBAC

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| SuperTokens Docker setup + Auth Service | P0 | 1d | Docker |
| JWT token service (issue, verify, refresh) | P0 | 1d | — |
| Auth controller (login, logout, refresh, me) | P0 | 1d | JWT service |
| Tenant context middleware (AsyncLocalStorage) | P0 | 1d | — |
| Permission model + seed data | P0 | 1d | Schema |
| RBAC guard: @RequirePermission, @RequireClassAccess | P0 | 2d | Permissions |
| Audit logging service | P0 | 1d | — |
| Auth integration tests | P0 | 1d | All above |

### Week 3-5: Core Business Modules

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| **Attendance Module** | P0 | 3d | Auth, RBAC |
| — CRUD endpoints | | | |
| — Correction workflow | | | |
| — Statistics/summary | | | |
| **Homework Module** | P0 | 4d | Auth, RBAC |
| — CRUD endpoints | | | |
| — Templates | | | |
| — Submission + grading | | | |
| — Rubric grading | | | |
| **Exam Module** | P0 | 2d | Auth, RBAC |
| — CRUD endpoints | | | |
| — Score entry + stats | | | |
| **Leave Module** | P0 | 1.5d | Auth, RBAC |
| — Apply + approve workflow | | | |
| **Notification Module** | P0 | 1.5d | — |
| — In-app notifications | | | |
| — Trigger on attendance/homework events | | | |
| **Report Module** | P0 | 2d | Attendance, Homework |
| — Daily/Monthly reports | | | |
| — CSV/Excel export | | | |
| Integration tests for all modules | P0 | 3d | All modules |

### Week 5-6: Frontend (Single Client)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Initialize Next.js 14 project | P0 | 0.5d | — |
| shadcn/ui + Tailwind setup | P0 | 1d | — |
| TanStack Query + Zustand setup | P0 | 0.5d | — |
| Generated API client from OpenAPI | P0 | 1d | Backend API |
| Auth flow (login page, token management) | P0 | 1.5d | Backend Auth |
| Layout + navigation (sidebar, header) | P0 | 1d | — |
| Attendance page (roll-call grid) | P0 | 2d | Backend Attendance |
| Homework pages (teacher + student) | P0 | 2d | Backend Homework |
| Exam pages | P0 | 1d | Backend Exam |
| Leave pages | P0 | 1d | Backend Leave |
| Dashboard pages (teacher, principal, parent, student) | P0 | 2d | All Backend |
| Reports pages | P0 | 1d | Backend Reports |
| Admin settings pages | P0 | 1.5d | Backend Admin |

### Week 6: AI Service Integration

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Python FastAPI service setup | P0 | 1d | — |
| LangGraph agent (intent + responses) | P0 | 2d | — |
| Telegram bot (webhook, role verification) | P0 | 1.5d | FastAPI |
| Internal API client (Next.js → Backend) | P0 | 1d | Backend Internal APIs |
| Integration testing | P0 | 1d | All above |

---

## 9.3 Phase 2 — Multi-Tenant & Scale (Weeks 7-12)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Tenant onboarding flow (create, config, deploy) | P0 | 2d | — |
| Configuration engine (TenantConfig + TenantFeature) | P0 | 2d | — |
| Feature flag system (per-tenant enable/disable) | P0 | 1d | Config engine |
| Branding system (per-tenant CSS vars + assets) | P0 | 2d | — |
| PostgreSQL Row-Level Security setup | P0 | 1d | — |
| Tenant isolation test suite (automated) | P0 | 2d | — |
| Second client deployment (demonstrate customization) | P0 | 2d | Branding |
| Super Admin dashboard (tenant management) | P0 | 2d | — |
| Rate Limiting (per-tenant, per-endpoint) | P1 | 1d | — |
| Redis caching layer (config, permissions, queries) | P1 | 2d | — |
| Connection pooling (PgBouncer) | P1 | 1d | — |
| Performance & load testing | P1 | 2d | All above |

---

## 9.4 Phase 3 — Advanced Features (Weeks 13-18)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Notification service abstraction (Email, SMS, Push, WhatsApp) | P1 | 3d | — |
| Multi-channel delivery pipeline | P1 | 2d | Notification service |
| AI homework enhancements (OCR, quality check) | P1 | 3d | AI Service |
| AI bulk grading | P1 | 2d | AI Service |
| Custom report builder | P1 | 3d | Report Module |
| Scheduled reports (email delivery) | P1 | 2d | Reports + Notifications |
| Offline support (PWA + IndexedDB queue) | P1 | 3d | Frontend |
| Multi-language framework (i18n with English, Hindi, Marathi) | P1 | 3d | Frontend |
| Teacher analytics dashboard (charts, weak students) | P1 | 2d | — |
| Parent weekly summary digests (AI-generated) | P2 | 2d | AI Service |

---

## 9.5 Phase 4 — Enterprise (Weeks 19-24)

| Task | Priority | Effort | Depends On |
|------|----------|--------|------------|
| Full audit trail UI + compliance reports | P2 | 2d | Audit Logging |
| Prometheus metrics + Grafana dashboards | P2 | 2d | — |
| Sentry error tracking (backend + frontend) | P2 | 1d | — |
| CI/CD pipeline (GitHub Actions) — test, build, deploy per client | P2 | 3d | — |
| Documentation portal (API docs, integration guide, onboarding) | P2 | 3d | — |
| Client SDK (JavaScript/TypeScript) | P2 | 3d | — |
| Data export/deletion automation | P2 | 2d | — |
| Security audit + penetration testing | P2 | 3d | — |

---

## 9.6 Dependency Graph

```
Project Scaffold
    │
    ├── Database Schema
    │       │
    │       ├── Auth System (SuperTokens + JWT)
    │       │       │
    │       │       ├── RBAC Engine
    │       │       │       │
    │       │       │       ├── Attendance Module
    │       │       │       ├── Homework Module
    │       │       │       ├── Exam Module
    │       │       │       ├── Leave Module
    │       │       │       │       │
    │       │       │       │       ├── Notification Module
    │       │       │       │       └── Report Module
    │       │       │       │
    │       │       │       └── Admin Module
    │       │       │
    │       │       └── Frontend (Single Client)
    │       │               │
    │       │               └── AI Service Integration
    │       │
    │       └── Tenant Infrastructure
    │               │
    │               ├── Configuration Engine
    │               ├── Feature Flags
    │               ├── Branding System
    │               └── Super Admin Dashboard
    │
    └── DevOps & CI/CD
```

---

## 9.7 Risk Mitigation

| Risk | Mitigation | Owner |
|------|-----------|-------|
| Schema changes breaking API contracts | DTO-based APIs, versioned contracts | Backend Lead |
| Tenant isolation leaks | Automated test suite runs on every PR | QA Lead |
| Performance at scale | Load testing from Week 10, pg_stat_statements monitoring | DevOps |
| Frontend customization divergence | Strict API contracts, feature flag boundaries, shared component library | Frontend Lead |
| Auth service downtime | Graceful degradation, token caching, health checks | Backend Lead |

---

> **Next:** See [`10-changelog.md`](./10-changelog.md) for the changelog of all specification changes.
