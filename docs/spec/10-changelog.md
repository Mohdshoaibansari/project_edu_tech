# 10. Changelog

> All notable changes to the EduTech specification.

---

## [Unreleased]

### 2026-06-05 — Initial Specification Created

- **Added:** [`01-prd.md`](./01-prd.md) — Product Requirements Document
  - Executive summary, problem statement (monolith → decoupled)
  - 8 user personas (Teacher, Principal, Parent, Student, Admin, Counselor, Staff, Super Admin)
  - 8 functional modules with 50+ requirements (P0-P2)
  - Non-functional requirements (performance, security, scalability, reliability, compliance)
  - Multi-tenant strategy (shared DB + tenant_id isolation)
  - Frontend-backend contract definition
  - 4-phase rollout plan (24 weeks)
  - Success metrics (8 KPIs)
  - Risk & mitigation matrix

- **Added:** [`02-spec-template.md`](./02-spec-template.md) — Spec-Driven Development Template
  - Feature specification template (user stories, acceptance criteria, APIs, DB, testing)
  - Architecture Decision Record (ADR) template
  - API contract spec template (OpenAPI 3.x)
  - Database schema spec template
  - Frontend component spec template
  - Testing specification template
  - Implementation review checklist (backend, frontend, security, general)
  - Spec lifecycle states (Draft → Archived)

- **Added:** [`03-architecture.md`](./03-architecture.md) — System Architecture
  - High-level architecture diagram (frontends → API gateway → backend → data layer → AI service)
  - Backend-frontend separation principles
  - Auth flow (SuperTokens → JWT → Access + Refresh tokens)
  - Multi-tenant data flow (5-layer request processing)
  - Domain module structure (backend: modules/, frontend: modules/)
  - Deployment topology (CDN, API Gateway, Backend cluster, Data layer, AI service)
  - Technology stack decisions with rationale

- **Added:** [`04-backend-spec.md`](./04-backend-spec.md) — Backend Specification
  - Technology stack (NestJS, TypeScript strict, Prisma, PostgreSQL, Redis, BullMQ, Zod)
  - Architecture principles (API-first, domain-oriented, layered, DTO-based)
  - API design standards (URL conventions, HTTP methods, response/error standards, pagination, versioning)
  - Database design (multi-tenant schema pattern, 25+ models, soft delete)
  - Authorization engine (3-layer guard: Route → Action → Resource)
  - Configuration service interface + keys
  - Audit logging requirements
  - Error handling with domain-specific error classes
  - Testing strategy (unit, integration, tenant isolation)

- **Added:** [`05-frontend-spec.md`](./05-frontend-spec.md) — Frontend Specification
  - Technology stack (Next.js 14, Tailwind, shadcn/ui, TanStack Query, Zustand, Recharts)
  - Per-client customization strategy (3-layer: build-time config, runtime config, static assets)
  - Feature module structure (pages, components, hooks, services, types, tests)
  - Shared design system (component library, DataTable, forms framework)
  - State management (TanStack Query for server, Zustand for UI)
  - Feature flag rendering (FeatureGate component)
  - Permission-based UI (PermissionGate — UX only)
  - Generated API client (OpenAPI → TypeScript SDK)
  - Four mandatory states per component (Loading, Empty, Error, Success)
  - Accessibility & performance standards

- **Added:** [`06-auth-spec.md`](./06-auth-spec.md) — Authentication & Authorization
  - Core principles (auth ≠ authz, backend source of truth, centralized, least privilege, zero trust)
  - Authentication flow (SuperTokens → JWT token exchange)
  - Token design (Access: 15min JWT, Refresh: 30d opaque rotated)
  - 8 roles with full 28-permission matrix
  - Resource scoping for TEACHER (section-level, subject-teacher, override)
  - Guard implementation (AuthGuard, TenantGuard, RequirePermission decorator)
  - PermissionGate for frontend (UX only)
  - Audit logging events
  - Security headers (Helmet, CORS)

- **Added:** [`07-multi-tenant-spec.md`](./07-multi-tenant-spec.md) — Multi-Tenant Architecture
  - Chosen model: Shared Database, Shared Schema with tenant_id
  - Tenant data model (Tenant, TenantConfig, TenantFeature)
  - Tenant isolation pattern (every table has tenant_id)
  - Context resolution flow (URL → JWT → Header → Subdomain)
  - AsyncLocalStorage implementation
  - Configuration-driven design (NO hardcoded business rules)
  - Configuration service with Redis caching
  - Feature flag system (per-tenant enable/disable)
  - Tenant onboarding flow (5 steps)
  - Default configuration template
  - Tenant isolation test suite (mandatory for every module)
  - PostgreSQL Row-Level Security (defense-in-depth)
  - Data export & deletion (GDPR compliance)

- **Added:** [`08-api-contracts.md`](./08-api-contracts.md) — API Contracts
  - Naming convention (URL structure, standard headers, query parameters)
  - 10 module API contract summaries:
    - Authentication (6 endpoints)
    - Attendance (8 endpoints)
    - Homework (14 endpoints)
    - Exams (8 endpoints)
    - Leave (3 endpoints)
    - Notifications (3 endpoints)
    - Reports (5 endpoints)
    - Administration (15 endpoints)
    - Tenant Management (5 endpoints)
    - Internal APIs (6 endpoints)
  - Standard response envelope (success + error)
  - API versioning policy

- **Added:** [`09-implementation-roadmap.md`](./09-implementation-roadmap.md) — Implementation Roadmap
  - 4-phase plan (24 weeks total)
  - Phase 1 (Weeks 1-6): Foundation — scaffold, auth, core modules, single-tenant frontend, AI integration
  - Phase 2 (Weeks 7-12): Multi-Tenant — tenant infra, config engine, branding, second client, Super Admin
  - Phase 3 (Weeks 13-18): Advanced — notifications, advanced reporting, AI enhancements, offline, i18n
  - Phase 4 (Weeks 19-24): Enterprise — audit, monitoring, CI/CD, docs, SDK
  - Dependency graph
  - Risk mitigation table

- **Added:** [`10-changelog.md`](./10-changelog.md) — Changelog (this file)

---

## Architectural Decisions Log

| ADR | Decision | Date | Status |
|-----|----------|------|--------|
| ADR-001 | **Decouple frontend-backend.** Backend as shared Node.js API; frontend as per-client Next.js deployments | 2026-06-05 | Accepted |
| ADR-002 | **Multi-tenant via shared DB + tenant_id.** One PostgreSQL cluster with `tenant_id` on all tables + RLS | 2026-06-05 | Accepted |
| ADR-003 | **SuperTokens + JWT Token Exchange.** SuperTokens for identity; own JWT for session management | 2026-06-05 | Accepted |
| ADR-004 | **Permissions in JWT.** Short-lived (15min) access token includes permissions[] to avoid DB lookup per request | 2026-06-05 | Accepted |
| ADR-005 | **Configuration-driven design.** All business rules stored in database per tenant, nothing hardcoded | 2026-06-05 | Accepted |
| ADR-006 | **Contract-driven development.** OpenAPI 3.x specs as source of truth; generated TypeScript SDK for frontend | 2026-06-05 | Accepted |
| ADR-007 | **NestJS for backend.** Opinionated, modular, decorator-based — fits domain-oriented architecture | 2026-06-05 | Accepted |
| ADR-008 | **TanStack Query for server state.** Separates server cache from UI state; Zustand only for UI | 2026-06-05 | Accepted |
| ADR-009 | **Per-client frontend deployment.** Each school gets own Next.js deploy with tenant-specific build config | 2026-06-05 | Accepted |
| ADR-010 | **Python AI service stays separate.** FastAPI + LangGraph, never directly accesses PostgreSQL | 2026-06-05 | Accepted |

---

> **Status:** Pre-implementation. All specs are in Draft state, ready for review.
