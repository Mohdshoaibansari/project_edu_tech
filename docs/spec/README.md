# Project EduTech — Specification Hub

> **Centralized specification index for the multi-tenant, decoupled frontend-backend Attendance & Homework Management System.**

---

## 📋 Document Index

| # | File | What It Covers |
|---|------|---------------|
| 1 | [`01-prd.md`](./01-prd.md) | **Product Requirements Document** — executive summary, problem statement, personas, product vision, functional & non-functional requirements, multi-tenant strategy, phased rollout |
| 2 | [`02-spec-template.md`](./02-spec-template.md) | **Spec-Driven Development Template** — standard template for feature specs, architecture decision records, API contracts, DB schema, frontend components, testing, review checklists |
| 3 | [`03-architecture.md`](./03-architecture.md) | **System Architecture** — high-level architecture, backend-frontend separation, multi-tenant data flow, auth flow, deployment topology |
| 4 | [`04-backend-spec.md`](./04-backend-spec.md) | **Backend Specification** — tech stack, domain module structure, API design standards, database schema, authorization engine |
| 5 | [`05-frontend-spec.md`](./05-frontend-spec.md) | **Frontend Specification** — per-client customization strategy, feature module structure, component library, state management, client branding |
| 6 | [`06-auth-spec.md`](./06-auth-spec.md) | **Authentication & Authorization** — SuperTokens integration, JWT token design, RBAC permission matrix, tenant isolation enforcement |
| 7 | [`07-multi-tenant-spec.md`](./07-multi-tenant-spec.md) | **Multi-Tenant Architecture** — tenant isolation strategies, configuration-driven design, feature flags per client, tenant onboarding |
| 8 | [`08-api-contracts.md`](./08-api-contracts.md) | **API Contracts** — OpenAPI 3.x specifications for all modules, request/response schemas, error codes |
| 9 | [`09-implementation-roadmap.md`](./09-implementation-roadmap.md) | **Implementation Roadmap** — phased rollout plan, milestone definitions, dependency graph |
| 10 | [`10-changelog.md`](./10-changelog.md) | **Changelog** — date-stamped entries of all architectural and specification changes |

---

## 🎯 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Separate Backend & Frontend** | Backend serves ALL clients; frontend customized per client (branding, features, workflows) |
| **Multi-Tenant Backend** | Shared database with `tenant_id` isolation — one backend, many schools |
| **API-First Design** | OpenAPI contracts defined before implementation; frontend consumes via generated SDK |
| **Domain-Oriented Modules** | Both backend and frontend organized around business domains (attendance, homework, exams, etc.) |
| **Centralized Auth (SuperTokens)** | Single identity provider for all clients; JWT token exchange pattern |
| **Permission-Based RBAC** | Fine-grained `resource:action` permissions; roles are groupings of permissions |
| **Configuration-Driven** | Per-tenant configuration for business rules, features, branding, and limits |
| **Contract-Driven Development** | API contracts are the source of truth; frontend and backend developed in parallel |

---

## 📐 How to Use

1. **New to the project?** Start with [`01-prd.md`](./01-prd.md) → then [`03-architecture.md`](./03-architecture.md)
2. **Building a new feature?** Use [`02-spec-template.md`](./02-spec-template.md) as your template
3. **Need API details?** See [`08-api-contracts.md`](./08-api-contracts.md)
4. **Planning implementation?** See [`09-implementation-roadmap.md`](./09-implementation-roadmap.md)
5. **Reviewing architecture?** See [`03-architecture.md`](./03-architecture.md) + [`07-multi-tenant-spec.md`](./07-multi-tenant-spec.md)

---

> **Status:** Pre-implementation specification phase. These documents define WHAT to build and HOW to build it before any code is written.
