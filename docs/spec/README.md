# Project EduTech — Specification Hub

> **Centralized specification index for the multi-tenant, SaaS platform serving schools with radically different requirements.**

---

## 📋 Document Index

### Foundation (Original Specs — Docs 1–10)

| # | File | What It Covers |
|---|------|---------------|
| 1 | [`01-prd.md`](./01-prd.md) | **Product Requirements Document** — executive summary, problem statement, personas, product vision, functional & non-functional requirements, multi-tenant strategy, phased rollout |
| 2 | [`02-spec-template.md`](./02-spec-template.md) | **Spec-Driven Development Template** — standard template for feature specs, ADRs, API contracts, DB schema, frontend components, testing, review checklists |
| 3 | [`03-architecture.md`](./03-architecture.md) | **System Architecture** — high-level architecture, backend-frontend separation, multi-tenant data flow, auth flow, deployment topology |
| 4 | [`04-backend-spec.md`](./04-backend-spec.md) | **Backend Specification** — tech stack, domain module structure, API design standards, database schema, authorization engine |
| 5 | [`05-frontend-spec.md`](./05-frontend-spec.md) | **Frontend Specification** — per-client customization strategy, feature module structure, component library, state management, client branding |
| 6 | [`06-auth-spec.md`](./06-auth-spec.md) | **Authentication & Authorization** — SuperTokens integration, JWT token design, RBAC permission matrix, tenant isolation enforcement |
| 7 | [`07-multi-tenant-spec.md`](./07-multi-tenant-spec.md) | **Multi-Tenant Architecture** — tenant isolation strategies, configuration-driven design, feature flags per client, tenant onboarding |
| 8 | [`08-api-contracts.md`](./08-api-contracts.md) | **API Contracts** — ~75 endpoints across 10 modules, request/response schemas, error codes |
| 9 | [`09-implementation-roadmap.md`](./09-implementation-roadmap.md) | **Implementation Roadmap** — phased rollout plan, milestone definitions, dependency graph |
| 10 | [`10-changelog.md`](./10-changelog.md) | **Changelog** — date-stamped entries of all architectural and specification changes |

### Architecture Review & Engine Designs (Docs 11–20) ⭐ NEW

| # | File | What It Covers |
|---|------|---------------|
| 11 | [`11-architecture-review.md`](./11-architecture-review.md) | **Architecture Review & Gap Analysis** — identifies ALL hardcoded business rules, architectural weaknesses, and improvement recommendations |
| 12 | [`12-configuration-engine.md`](./12-configuration-engine.md) | **Configuration Engine** — hierarchical, type-safe configuration with JSON Schema validation, inheritance, versioning, per-tenant schemas for attendance statuses, grading scales, academic calendars |
| 13 | [`13-rules-engine.md`](./13-rules-engine.md) | **Rules Engine** — lightweight JSON-based rule evaluation for grade calculation, attendance aggregation, promotion eligibility with condition/action model |
| 14 | [`14-workflow-engine.md`](./14-workflow-engine.md) | **Workflow Engine** — configurable state machine for leave approvals, attendance corrections, admissions with conditional transitions and actor resolution |
| 15 | [`15-metadata-engine.md`](./15-metadata-engine.md) | **Metadata Engine** — custom fields without schema changes (EAV with JSONB), dynamic forms, field definitions registry, GIN-indexed querying |
| 16 | [`16-template-engine.md`](./16-template-engine.md) | **Template Engine** — Handlebars/React-PDF based document generation for report cards, certificates, letters with per-school branding and dynamic data binding |
| 17 | [`17-multi-tenant-strategy.md`](./17-multi-tenant-strategy.md) | **Multi-Tenant Strategy Deep Dive** — hybrid 4-tier approach (shared schema → dedicated instance), connection routing, migration strategy, data residency |
| 18 | [`18-domain-driven-design.md`](./18-domain-driven-design.md) | **DDD Bounded Contexts** — 8 bounded contexts (Identity, Academic Structure, Attendance, Assessment, Leave, Communication, Configuration, Reporting) with context map |
| 19 | [`19-ai-readiness.md`](./19-ai-readiness.md) | **AI Readiness Assessment** — AI provider abstraction layer (OpenAI, Anthropic, Google, local), configurable AI tasks per tenant, multi-channel chatbot, cost tracking |
| 20 | [`20-extensibility-migration.md`](./20-extensibility-migration.md) | **Extensibility Review & Migration Plan** — risk matrix, anti-patterns, migration from current spec to engine-based architecture, backward compatibility guarantees |

---

## 🎯 Key Architectural Decisions (Updated)

| Decision | Rationale |
|----------|-----------|
| **Separate Backend & Frontend** | Backend serves ALL clients; frontend customized per client |
| **Hybrid Multi-Tenant** | Tier 1 (shared schema) for 90%, Tier 2-4 for enterprise — see [#17](./17-multi-tenant-strategy.md) |
| **Configuration over Code** | Business variability in engines, not hardcoded — see [#12](./12-configuration-engine.md) |
| **Engine-First Architecture** | Rules, Workflow, Metadata, Template engines BEFORE business modules — see [#20](./20-extensibility-migration.md) |
| **Domain Events over Direct Calls** | Contexts communicate via event bus, not service imports — see [#18](./18-domain-driven-design.md) |
| **API-First + Contract-Driven** | OpenAPI 3.x contracts; generated TypeScript SDK for frontend |
| **AI Abstraction Layer** | OpenAI, Anthropic, Google, local models behind single interface — see [#19](./19-ai-readiness.md) |
| **Centralized Auth (SuperTokens + JWT)** | Single identity provider; token exchange pattern |
| **Permission-Based RBAC** | Fine-grained `resource:action` permissions |

---

## ⚠️ CRITICAL: Read Before Implementation

**Do NOT start Phase 1 implementation as currently specified in docs 1–10.** The architecture review (docs 11–20) identifies fundamental gaps that must be addressed first:

1. **Prisma enums hardcode business variability** — must be replaced with reference data + configuration
2. **No academic calendar model** — semesters/trimesters/quarters must be configurable
3. **Approval workflows are hardcoded** — must become configurable state machines
4. **Grading is hardcoded** — must move to Rules Engine
5. **No support for custom fields** — must add Metadata Engine

**Recommended reading order:** [#11](./11-architecture-review.md) → [#12](./12-configuration-engine.md) → [#20](./20-extensibility-migration.md) → [#18](./18-domain-driven-design.md)

---

## 📐 How to Use

1. **New to the project?** Start with [`01-prd.md`](./01-prd.md) → [`11-architecture-review.md`](./11-architecture-review.md) → [`18-domain-driven-design.md`](./18-domain-driven-design.md)
2. **Building a new feature?** Use [`02-spec-template.md`](./02-spec-template.md) as your template
3. **Need API details?** See [`08-api-contracts.md`](./08-api-contracts.md)
4. **Planning implementation?** See [`09-implementation-roadmap.md`](./09-implementation-roadmap.md) + [`20-extensibility-migration.md`](./20-extensibility-migration.md)
5. **Designing configurations?** See [`12-configuration-engine.md`](./12-configuration-engine.md)
6. **Designing workflows?** See [`14-workflow-engine.md`](./14-workflow-engine.md)
7. **Reviewing architecture?** See [`11-architecture-review.md`](./11-architecture-review.md) + [`17-multi-tenant-strategy.md`](./17-multi-tenant-strategy.md)

---

> **Status:** Pre-implementation with architecture review complete. Foundation specs (#1–10) need updates to incorporate engine-first approach from review (#11–20).
