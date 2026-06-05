# 10. Changelog

> All notable changes to the EduTech specification.

---

## [Unreleased]

### 2026-06-05 (v2.9) — Backend AI Module vs AI Chat Service Clarification

- **Updated:** [`01-prd.md`](./01-prd.md) §1.8 Communication Pattern
  - Fixed architecture diagram: removed incorrect "Python AI Service" connection from backend
  - Added three-consumer model: Frontend (JWT), AI Chat Service (x-api-key), Backend AI Module (internal)
  - Documented key distinction: Backend AI Module handles backend-initiated tasks (homework gen, auto-grading), AI Chat Service handles conversational chatbot
- **Updated:** [`03-architecture.md`](./03-architecture.md)
  - Added AI Module block inside backend diagram (homework gen, auto-grading, report summaries)
  - AI Chat Service remains as separate external consumer
  - Added cross-references for both
- **Added:** [`04-backend-spec.md` §4.12](./04-backend-spec.md) — Backend AI Module
  - Distinction table: Backend AI Module vs AI Chat Service (location, trigger, runtime, use cases, data access)
  - AI task definitions: homework.ai_generate, grading.auto_evaluate, report.parent_summary, ocr.extract_text, image.quality_check
  - Implementation: AIModule, AITaskService with BullMQ async jobs, AI provider integration
  - Shared AI provider configuration: both modules use same per-tenant config stored in backend

### 2026-06-05 (v2.8) — AI Chatbot Extracted to Separate Repository

- **Removed:** [`19-ai-readiness.md`](./19-ai-readiness.md) — AI Readiness Assessment
  - Content moved to [`ai_chat` repository](../../../ai_chat/) specs
  - AI provider abstraction, task definitions, cost management, multi-channel architecture all transferred
- **Updated:** [`01-prd.md`](./01-prd.md) — Module 7 (AI Chatbot)
  - Replaced functional requirements table with reference to ai_chat repo
  - Backend responsibility clarified: expose `/api/v1/ai/*` internal endpoints for ai_chat service to consume
- **Updated:** [`03-architecture.md`](./03-architecture.md) — Architecture diagram
  - Simplified AI service block to show it's an external service in a separate repository
- **Updated:** [`09-implementation-roadmap.md`](./09-implementation-roadmap.md) — Phase 3
  - Removed AI provider abstraction, chatbot integration, auto-grading, homework generator, usage tracking tasks
  - Added Internal AI API task (expose endpoints for ai_chat service) and ai_chat integration task
- **Updated:** [`18-domain-driven-design.md`](./18-domain-driven-design.md)
  - Updated "Next" reference from doc 19 to doc 20
- **Updated:** README files and spec index
  - Added ai_chat repo reference to repository structure, How to Use, and architectural decisions
- **Created:** `ai_chat` repository at `D:\IT Solutions\Schools IT\ai_chat\`
  - `01-prd.md` — AI Chatbot PRD (chatbot features, AI tasks, multi-channel, provider abstraction, cost management)
  - `02-architecture.md` — Service architecture (FastAPI, channel adapters, intent classifier, backend API client, deployment)
  - `03-api-contracts.md` — Backend APIs consumed by chatbot (auth, attendance, homework, leave, exams, config, internal AI endpoints)
  - `README.md` — Project overview, tech stack, data access rule (never direct DB)

### 2026-06-05 (v2.7) — Reporting Architecture + Search Strategy

- **Enhanced:** [`18-domain-driven-design.md`](./18-domain-driven-design.md) — DDD Bounded Contexts
  - **§8 Reporting Context:** Expanded from a single table to a full deferred architecture. Phased build strategy (Phase 1: direct query → Phase 3: read replica → Phase 4: dedicated analytics DB with materialized views). Database isolation rule prohibiting analytical queries on OLTP tables. Reporting data patterns (live dashboard, periodic snapshot, pre-aggregated metric, cross-year analysis, export). Anti-patterns documented (no unbounded `COUNT(*)`, no synchronous PDF generation, no heavy queries during attendance rush hour).
- **Added:** [`04-backend-spec.md` §4.11](./04-backend-spec.md) — Search Strategy
  - Phased search strategy: PostgreSQL FTS with trigram GIN indexes (Phase 1-2) → `tsvector` columns with weighted FTS (Phase 3) → OpenSearch (Phase 4, only when thresholds exceeded). `SearchService` implementation with tenant-scoped ILIKE search. OpenSearch trigger conditions: 500ms p95, 50+ req/s, multi-language stemming, faceted search, relevance tuning needed. Explicit "DO NOT introduce OpenSearch before these thresholds" constraint.
- **Updated:** [`01-prd.md`](./01-prd.md)
  - Module 6: Added reference to reporting architecture in doc 18.
  - NFRs: Added Search section (NF-SH01, NF-SH02, NF-SH03) with phased FTS/OpenSearch strategy.
  - Risks: Added "Reporting performance impact on OLTP" and "Search strategy missing" entries with mitigations.
- **Updated:** [`09-implementation-roadmap.md`](./09-implementation-roadmap.md)
  - Phase 1: Added search index + SearchService tasks.
  - Phase 4: Added reporting read replica, materialized views, analytics DB, PostgreSQL FTS upgrade, OpenSearch evaluation tasks.
- **Remediated risks:** Reporting Context Underspecified (now has full deferred architecture with DB isolation), Search Strategy Missing (now has phased PostgreSQL FTS → OpenSearch plan with explicit trigger conditions).

### 2026-06-05 (v2.6) — Configuration Governance (Sprawl Prevention)

- **Enhanced:** [`12-configuration-engine.md`](./12-configuration-engine.md) — Configuration Engine Design
  - **§12.6a Template Catalog (NEW):** Four standard school templates defined — CBSE Standard, ICSE Standard, Preschool, International School. Each template specifies default values for attendance.statuses, grading.scale, academic.calendar, leave.types, and promotion.rules.
  - **§12.6b Mandatory Template Inheritance (NEW):** Enforcement that new tenants **must** start from a template — blank configuration is impossible. Tenant onboarding flow clones all template configs. Template lineage tracked on tenant record (`source_template_id`, `source_template_version`).
  - **§12.6c Template Management Lifecycle (NEW):** Template versioning (tenants NOT auto-updated on template changes). `TemplateUpgradeService` with impact analysis before upgrade. Template deprecation workflow.
  - **§12.6d Configuration Governance (NEW):** Guardrails with hard limits (max 100 configs/tenant, max 50 overrides, max 100KB per config, max 50 versions). `ConfigGovernanceService` with weekly drift detection cron job. Config Sprawl Dashboard in backend-admin UI showing template distribution, drift alerts, and override counts.
  - **Remediated risk:** Configuration Sprawl — after 100 schools managing 5,000 configs is now prevented by mandatory templates, drift detection, and hard guardrails.

### 2026-06-05 (v2.5) — Rules Engine Hardening (Execution Tracing + Advanced Capabilities)

- **Enhanced:** [`13-rules-engine.md`](./13-rules-engine.md) — Rules Engine Design
  - **§13.4 Condition Format:** Expanded to full operator table (10 leaf operators + AND/OR/NOT/always/lookup). Documented arbitrary nesting depth support.
  - **§13.4 Action Format:** Expanded to 8 action types including new `compute` (intermediate calculated fields) and `lookup` (enrich context from external datasets).
  - **§13.4a Formula Expression Language (NEW):** Defined sandboxed formula engine with 12 supported functions (SUM, AVG, COUNT, MIN, MAX, ROUND, FLOOR, CEIL, ABS, IF, COALESCE, WEIGHTED_AVG). Arithmetic operators. Safety constraints.
  - **§13.4b Cross-Dataset References (NEW):** `lookup` condition type for querying other tables within rules. `lookup` action type for enriching context from external data. DataSourceRegistry pattern for registered resolvers (no raw SQL in rules).
  - **§13.6 Rule Execution Engine:** Complete rewrite — added `ExecutionTrace`, `RuleTrace`, and `ConditionTrace` models. Engine now returns detailed per-condition match/fail reasons (e.g., "score (85) is not ≥ 90"). Trace enabled via `{ trace: true }` option; production hot-path skips trace overhead. Leaf condition tracing includes field name, actual value, expected value, and human-readable reason.
  - **§13.9 Rule Administration UI:** Redesigned with trace-integrated tester showing per-condition pass/fail with values and reasons. Added rule editor with condition builder UI. Added `rule_execution_logs` table for audit trail.
  - **Remediated risk:** Rules Engine Complexity — nested conditions, formula builders, cross-dataset references, calculated fields, and execution tracing all now specified.

### 2026-06-05 (v2.4) — Backend-First Implementation + Backend-Admin UI

- **Restructured implementation plan:** Backend built before customer frontends (see rationale below)
  - **Phase 0 (Weeks 1-4):** Backend Engine Foundation + Backend-Admin UI — engines, APIs, and a thin server-rendered admin interface (NestJS MVC + Handlebars) for configuring tenants. Customer frontends not yet built.
  - **Phase 1 (Weeks 5-10):** Backend Business Modules — all business logic on top of engines. OpenAPI specs finalized. Generated TypeScript SDK ready.
  - **Phase 2 (Weeks 11-16):** Customer Frontends — Next.js apps consuming completed APIs via generated SDK
  - **Phase 3 (Weeks 17-22):** Advanced Engines + AI — Metadata, Template, AI abstraction
  - **Phase 4 (Weeks 23-28):** Enterprise + Scale — Tier 2-4 multi-tenant, monitoring, CI/CD
- **Rationale:** Frontend is independent of backend. Building backend first with a thin admin UI proves the APIs are truly generic and consumable by any client. Generated SDK eliminates guesswork when frontend development begins.
- **Files updated:**
  - **`09-implementation-roadmap.md`** — Complete rewrite with backend-first phases, week-by-week tasks, admin UI details
  - **`01-prd.md`** — Updated Phase 0-4 descriptions to reflect backend-first sequencing and backend-admin UI
  - **`04-backend-spec.md`** — Added §4.10 Backend-Admin UI section with technology, pages, and architecture rule
  - **`03-architecture.md`** — Added admin UI to cross-reference table

### 2026-06-05 (v2.3) — Architecture Review Document Retired

- **Removed:** [`11-architecture-review.md`](./11-architecture-review.md) — Architecture Review & Gap Analysis
  - All 10 improvement recommendations have been implemented across the current specs (v2.1–v2.2)
  - The document's critiques no longer apply to the updated specs, creating a self-contradictory narrative
  - Architectural rationale (why engine-first) merged into [`03-architecture.md`](./03-architecture.md) as a "Philosophy" section
  - All cross-references cleaned up across README.md, docs/spec/README.md, docs/spec/20-extensibility-migration.md

### 2026-06-05 (v2.2) — Redundancy Elimination & Spec Template Migration

- **Restructured docs 03–09** using spec-driven template format from [`02-spec-template.md`](./02-spec-template.md):
  - **`03-architecture.md`** — Slimmed from 474 lines to a concise high-level architecture overview. Removed duplicated auth flow (→06), domain module tree (→18), multi-tenant data flow (→07), and tech stack table (→04/05). Added cross-reference table mapping each topic to its canonical document.
  - **`04-backend-spec.md`** — Removed duplicated bounded contexts tree (→18), engine service interfaces (→12-16), and API design standards (→PRD §1.5a). Added spec header and cross-references. Kept unique content: reference data tables, domain events, config-driven service code, authorization, testing.
  - **`05-frontend-spec.md`** — Slimmed from 638 to ~330 lines. Removed sections duplicated in PRD §1.8 (module structure, state management, UX states, accessibility, performance standards). Kept unique implementation content: per-client customization layers, dynamic config-driven UI code examples, design system, feature flags, generated API client.
  - **`07-multi-tenant-spec.md`** — Renamed to "Multi-Tenant Implementation Patterns". Removed strategy content (→17). Added clear disambiguation: doc 07 = code-level patterns, doc 17 = strategy decisions. Removed section numbering.
  - **`08-api-contracts.md`** — Removed generic API conventions (URL structure, headers, query params → PRD §1.5a). Added spec header. Kept per-module endpoint tables as unique value. Removed subsection numbering.
  - **`09-implementation-roadmap.md`** — Added spec header + cross-reference note that PRD §1.9 has the executive-level phase summary.
  - **`02-spec-template.md`** — Added cross-reference to PRD Definition of Done in the review checklist.

### 2026-06-05 (v2.1) — Skill-Standards Alignment Update

- **Updated:** [`01-prd.md`](./01-prd.md) — Product Requirements Document (v2.0.0 → v2.1.0)
  - **Added Section 1.5a — API Design Standards:** Unified success/error response format, module-scoped error codes, pagination (offset + cursor), standardized filtering/sorting conventions, idempotency-key support, backward compatibility rules, OpenAPI as single source of truth
  - **Enhanced Section 1.6 — Non-Functional Requirements:** Added Observability (structured logging, correlation IDs, Prometheus metrics, health checks, distributed tracing, Sentry, Web Vitals, user action tracking, session replay), Background Processing (Bull/BullMQ job queue, retry, dead letter queue), Rate Limiting & API Security (rate limit headers, API keys, webhooks), Data Integrity (soft deletes, unique constraints with soft-delete awareness)
  - **Enhanced Section 1.8 — Backend Development Standards:** Domain-oriented module architecture with mandatory per-module documentation (README.md, api-contract.yaml, permissions.md, workflows.md, dto.md, error-codes.md). Strict layered architecture (Controller/Service/Repository). DTO-based APIs (no raw entities exposed). Service abstractions for FileService, NotificationService, ConfigurationService, FeatureFlagService, AuditService. Template-based notification system with background delivery. File management abstraction with per-tenant organization. Contract-driven development enforcement with CI/CD validation. Definition of Done with 10-step checklist.
  - **Added Section 1.8 — Frontend Development Standards:** Feature-based domain architecture with generated/ and shared/ directory structure. AI-agent friendly conventions (module naming, page suffixes, hook prefixes, named exports, path aliases, barrel exports). State management separation (TanStack Query for server state, Zustand for UI state, React Hook Form for forms). API layer isolation with DTO mapping pipeline (OpenAPI → Generated SDK → API Layer → Mappers → Hooks → Components). Mandatory generated types (handwritten DTOs prohibited). Strict TypeScript with `any` forbidden. UX four-state pattern (Loading/Empty/Error/Success). Offline resilience with OfflineBanner. Component libraries (Design System, DataTable, Form Framework). Performance patterns (code splitting, lazy loading, memoization, virtualization). Auth patterns (AuthProvider, permission-based UI, backend-driven navigation, global error interceptor, ErrorBoundary).
  - **Added Section 1.9a — Testing Strategy:** Testing pyramid with Vitest, MSW, Playwright. Unit tests (components, hooks, mappers, utilities) at 80%+ coverage. Integration tests for module workflows. E2E tests for critical user journeys (login, attendance, homework lifecycle, leave request, reports, student CRUD). CI/CD integration with coverage gates.
  - **Updated Phase 0:** Added service abstractions, API standards enforcement, OpenAPI scaffolding, testing infrastructure, observability setup, CI/CD scaffolding, module documentation templates
  - **Updated Phase 1:** Added frontend infrastructure deliverables (AuthProvider, generated SDK, design system, DataTable, forms, ErrorBoundary), frontend testing coverage, feature flags, environment config pattern
  - **Updated Section 1.11 — Risks:** Added 7 new risks: OpenAPI contract drift, frontend-backend type mismatch, observability blind spots, notification delivery failures, file storage provider lock-in, accessibility non-compliance, codebase inconsistency for AI agents

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
