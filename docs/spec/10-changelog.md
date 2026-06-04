# 10. Changelog

> All notable changes to the EduTech specification.

---

## [Unreleased]

### 2026-06-05 (v2) — Architecture Review & Engine Designs

- **Added:** [`11-architecture-review.md`](./11-architecture-review.md) — Architecture Review & Gap Analysis
  - Comprehensive audit of ALL hardcoded business rules (attendance statuses, grading, academic structure, workflows, report cards, custom fields, notifications)
  - 6 architectural weaknesses identified (enum-based variability, flat config, no domain events, missing engines, single DB limits, AI lock-in)
  - 10 improvement recommendations with priorities

- **Added:** [`12-configuration-engine.md`](./12-configuration-engine.md) — Configuration Engine Design
  - Hierarchical JSON Schema-validated configuration (replaces flat key-value)
  - Full attendance statuses configuration with per-status weights, labels (i18n), colors
  - Grading scale configuration (grade bands, percentage, GPA, rubric — all in one schema)
  - Academic calendar configuration (semester/trimester/quarterly with terms, exams, holidays)
  - Configuration inheritance (templates → tenants with overrides)
  - Admin UI design with live preview

- **Added:** [`13-rules-engine.md`](./13-rules-engine.md) — Rules Engine Design
  - JSON-based condition/action rule evaluation
  - Grade conversion rules, attendance calculation rules, promotion eligibility rules
  - Priority-based rule matching (first-match + all-matches modes)
  - Custom function registry for extensibility
  - Admin UI with rule tester

- **Added:** [`14-workflow-engine.md`](./14-workflow-engine.md) — Workflow Engine Design
  - Configurable state machine per workflow type per tenant
  - Three workflow examples: School A (Teacher→Principal), School B (Teacher→Coordinator→Principal), Conditional (skip Coordinator for ≤3 days)
  - Five actor resolution types (role, specific_user, relationship, dynamic, any_admin)
  - Transition conditions, side-effect actions, full history tracking
  - Visual Workflow Designer UI

- **Added:** [`15-metadata-engine.md`](./15-metadata-engine.md) — Metadata Engine Design
  - Entity-Attribute-Value with JSONB for zero-schema-change custom fields
  - Field definitions registry with types, validation, enum values, UI hints
  - Dynamic form builder with conditional sections
  - GIN-indexed JSONB querying for searchable custom fields
  - Migration path from fixed columns to metadata

- **Added:** [`16-template-engine.md`](./16-template-engine.md) — Template Engine Design
  - Handlebars/React-PDF based document generation
  - Complete report card template with school branding, dynamic data binding, conditional sections
  - HTML→PDF via Puppeteer, HTML output, DOCX output
  - Template data schema for validation
  - Template Designer UI with component palette + live preview

- **Added:** [`17-multi-tenant-strategy.md`](./17-multi-tenant-strategy.md) — Multi-Tenant Strategy Deep Dive
  - Hybrid 4-tier approach: Shared Schema (90%) → Separate Schema (5%) → Dedicated DB (3%) → Dedicated Instance (2%)
  - Connection pool manager with tier-based routing
  - Backward-compatible migration rules
  - Tenant schema registry, cross-tenant operations, data residency
  - Decision matrix for tier selection

- **Added:** [`18-domain-driven-design.md`](./18-domain-driven-design.md) — DDD Bounded Contexts
  - 8 bounded contexts: Identity, Academic Structure, Attendance, Assessment, Leave, Communication, Configuration, Reporting
  - Context map with dependency directions
  - Integration patterns: Shared Kernel, Published Language (OpenAPI), Event-Driven, Anti-Corruption Layer
  - Revised module structure following DDD (domain/application/infrastructure/interfaces)
  - Aggregate root identification per context

- **Added:** [`19-ai-readiness.md`](./19-ai-readiness.md) — AI Readiness Assessment
  - AI provider abstraction layer (OpenAI, Anthropic, Google, local/Ollama)
  - Configurable AI task definitions per tenant per task
  - Multi-channel abstraction (Telegram, WhatsApp, Web Chat, Voice)
  - Per-tenant AI configuration (model mapping, cost limits, data policy, language)
  - Usage/cost tracking and observability
  - Vendor lock-in prevention checklist

- **Added:** [`20-extensibility-migration.md`](./20-extensibility-migration.md) — Extensibility Review & Migration Plan
  - 10-area risk matrix (grading, attendance, reports, curriculum, workflows, notifications, payments, integrations, regulations, i18n)
  - 4 anti-patterns in current spec with fixes
  - Migration plan: Phase 0 (Foundation Refactoring) → Phase 1A-D (Engines) → Phase 2 (Metadata+Template) → Phase 3 (AI Abstraction)
  - Strangler Fig pattern for incremental migration
  - Backward compatibility guarantees (API versioning, additive migrations, feature flags, dual-write, rollback)
  - What changes vs what stays summary table
  - 10 final recommendations

- **Updated:** [`README.md`](./README.md) — Spec index restructured with foundation + review sections, added critical warning about implementation readiness

---

### 2026-06-05 (v1) — Initial Specification Created

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
