# Project EduTech — Specification Hub

> **Centralized specification index for the multi-tenant, SaaS platform serving schools with radically different requirements.**

---

## 📋 Document Index

### Foundation (Original Specs — Docs 1–10)

| # | File | What It Covers |
|---|------|---------------|
| 1 | [`01-prd.md`](./01-prd.md) | **Product Requirements Document v2.1** — executive summary, problem statement, personas, product vision, functional & non-functional requirements, API design standards, backend & frontend development standards, testing strategy, multi-tenant strategy, phased rollout |
| 2 | [`02-spec-template.md`](./02-spec-template.md) | **Spec-Driven Development Template** — standard template for feature specs, ADRs, API contracts, DB schema, frontend components, testing, review checklists |
| 3 | [`03-architecture.md`](./03-architecture.md) | **System Architecture** — high-level architecture diagram, backend-frontend separation, deployment topology, cross-reference map to all other docs |
| 4 | [`04-backend-spec.md`](./04-backend-spec.md) | **Backend Specification** — tech stack, integration rules, reference data tables (no enums), domain events, config-driven service code examples, authorization, testing strategy (references engine docs 12-16 for full interfaces) |
| 5 | [`05-frontend-spec.md`](./05-frontend-spec.md) | **Frontend Specification** — tech stack, per-client customization layers, dynamic config-driven UI code examples, shared design system, feature flags, generated API client (references PRD §1.8 for development standards) |
| 6 | [`06-auth-spec.md`](./06-auth-spec.md) | **Authentication & Authorization** — SuperTokens integration, JWT token design, RBAC permission matrix, tenant isolation enforcement |
| 7 | [`07-multi-tenant-spec.md`](./07-multi-tenant-spec.md) | **Multi-Tenant Implementation Patterns** — code-level patterns: tenant data model, AsyncLocalStorage context resolution, configuration-driven design, tenant onboarding, RLS policies (strategy decisions in doc 17) |
| 8 | [`08-api-contracts.md`](./08-api-contracts.md) | **API Contracts** — per-module endpoint tables across 10 modules with request/response schemas and error codes (API standards in PRD §1.5a) |
| 9 | [`09-implementation-roadmap.md`](./09-implementation-roadmap.md) | **Implementation Roadmap** — phased rollout plan, milestone definitions, dependency graph |
| 10 | [`10-changelog.md`](./10-changelog.md) | **Changelog** — date-stamped entries of all architectural and specification changes |

### Engine Designs (Docs 12–20)

| # | File | What It Covers |
|---|------|---------------|
| 12 | [`12-configuration-engine.md`](./12-configuration-engine.md) | **Configuration Engine** — hierarchical, type-safe configuration with JSON Schema validation, inheritance, versioning, per-tenant schemas for attendance statuses, grading scales, academic calendars |
| 13 | [`13-rules-engine.md`](./13-rules-engine.md) | **Rules Engine** — lightweight JSON-based rule evaluation for grade calculation, attendance aggregation, promotion eligibility with condition/action model |
| 14 | [`14-workflow-engine.md`](./14-workflow-engine.md) | **Workflow Engine** — configurable state machine for leave approvals, attendance corrections, admissions with conditional transitions and actor resolution |
| 15 | [`15-metadata-engine.md`](./15-metadata-engine.md) | **Metadata Engine** — custom fields without schema changes (EAV with JSONB), dynamic forms, field definitions registry, GIN-indexed querying |
| 16 | [`16-template-engine.md`](./16-template-engine.md) | **Template Engine** — Handlebars/React-PDF based document generation for report cards, certificates, letters with per-school branding and dynamic data binding |
| 17 | [`17-multi-tenant-strategy.md`](./17-multi-tenant-strategy.md) | **Multi-Tenant Strategy Deep Dive** — hybrid 4-tier approach (shared schema → dedicated instance), connection routing, migration strategy, data residency |
| 18 | [`18-domain-driven-design.md`](./18-domain-driven-design.md) | **DDD Bounded Contexts** — 8 bounded contexts (Identity, Academic Structure, Attendance, Assessment, Leave, Communication, Configuration, Reporting) with context map |
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
| **AI Abstraction Layer** | OpenAI, Anthropic, Google, local models behind single interface — maintained in [`ai_chat`](../../../ai_chat/) repo |
| **Centralized Auth (SuperTokens + JWT)** | Single identity provider; token exchange pattern |
| **Permission-Based RBAC** | Fine-grained `resource:action` permissions |

---

## ⚠️ CRITICAL: Read Before Implementation

All specifications now reflect the engine-first architecture. **Phase 0 implementation can begin.**

Key compliance points before writing any code:
1. **Zero Prisma business enums** — all statuses, types, categories use reference data tables (see [04 §4.3](./04-backend-spec.md))
2. **Engines built before business modules** — Configuration, Rules, Workflow engines precede attendance/grading/leave (see [09](./09-implementation-roadmap.md))
3. **Contract-first development** — OpenAPI spec updated before any implementation (see [PRD §1.5a](./01-prd.md))
4. **Module documentation mandatory** — every backend module has README, api-contract, permissions, workflows, dto, error-codes (see [PRD §1.8](./01-prd.md))

**Recommended reading order:** [`01-prd.md`](./01-prd.md) → [`03-architecture.md`](./03-architecture.md) → [`09-implementation-roadmap.md`](./09-implementation-roadmap.md)

---

## 📐 How to Use

1. **New to the project?** Start with [`01-prd.md`](./01-prd.md) → [`03-architecture.md`](./03-architecture.md) → [`09-implementation-roadmap.md`](./09-implementation-roadmap.md)
2. **Building a new feature?** Use [`02-spec-template.md`](./02-spec-template.md) as your template
3. **Need API details?** See [`08-api-contracts.md`](./08-api-contracts.md)
4. **Planning implementation?** See [`09-implementation-roadmap.md`](./09-implementation-roadmap.md) + [`20-extensibility-migration.md`](./20-extensibility-migration.md)
5. **Designing configurations?** See [`12-configuration-engine.md`](./12-configuration-engine.md)
6. **Designing workflows?** See [`14-workflow-engine.md`](./14-workflow-engine.md)
7. **Reviewing architecture?** See [`03-architecture.md`](./03-architecture.md) + [`17-multi-tenant-strategy.md`](./17-multi-tenant-strategy.md)
8. **Building AI chatbot?** See [`ai_chat` repo](../../../ai_chat/) — separate specifications maintained there

---

> **Status:** Specifications complete — ready for Phase 0 implementation.
