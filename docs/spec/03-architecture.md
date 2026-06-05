# 3. System Architecture

> **Spec ID:** ARCH-001  
> **Status:** Approved  
> **Author:** Architecture & Engineering Team  
> **Created:** 2026-06-05  
> **Last Updated:** 2026-06-05  
> **Related PRD Requirements:** All — this is the top-level architecture document

---

## Summary

High-level system architecture for the EduTech multi-tenant SaaS platform. Three tiers: per-client Next.js frontends, a shared NestJS backend with an engine layer and AI module, and a separate AI Chat Service for conversational interactions. All tiers are tenant-aware and communicate via REST APIs with JWT or x-api-key authentication.

### Architecture Philosophy: Engine-First

EduTech serves **radically different schools** from a single backend without code changes. This is achieved through an **engine layer** that sits between business contexts and the database:

| Engine | Problem Solved | Without It |
|--------|---------------|------------|
| **Configuration Engine** | Each school defines its own attendance statuses, grading scales, academic calendars | Hardcoded Prisma enums shared by all tenants |
| **Rules Engine** | Grade calculation, attendance aggregation, promotion eligibility vary per school | Hardcoded `if/else` in service methods |
| **Workflow Engine** | Leave approvals, corrections, admissions follow different chains per school | Hardcoded state transitions |
| **Metadata Engine** | Schools need custom fields without schema migrations | `ALTER TABLE` per new tenant field |
| **Template Engine** | Report cards, certificates, letters differ per school | No document generation at all |

These engines are built **before** any business modules (Phase 0) and all modules consume them. The result: onboarding a new school with unique requirements is a **configuration change**, not a code change.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      CLIENT FRONTENDS (Per School)                         │
│                                                                            │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐      │
│  │ School A         │   │ School B         │   │ School C         │      │
│  │ school-a.edu.app │   │ school-b.edu.app │   │ school-c.edu.app │      │
│  │                   │   │                   │   │                   │      │
│  │ Next.js 14        │   │ Next.js 14        │   │ Next.js 14        │      │
│  │ - Custom branding │   │ - Custom branding  │   │ - Custom branding │      │
│  │ - Tenant features │   │ - Tenant features  │   │ - Tenant features │      │
│  └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘      │
│           │                      │                        │                │
│           │  HTTPS + JWT Bearer  │                        │                │
│           │  X-Tenant-ID Header  │                        │                │
└───────────┼──────────────────────┼────────────────────────┼────────────────┘
            │                      │                        │
            ▼                      ▼                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     BACKEND API (Shared — Multi-Tenant)                     │
│                     api.edutech.com                                         │
│                                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐ │
│  │ API Gateway  │  │ Auth        │  │ Business    │  │ Multi-Tenant     │ │
│  │ (Nginx/Envoy)│──│ Middleware  │──│ Contexts    │──│ Middleware       │ │
│  │ Rate Limiting│  │ JWT Verify  │  │ (Identity,  │  │ Tenant Context   │ │
│  │ Load Balance │  │ RBAC Guard  │  │  Academic,  │  │ Scope Filtering  │ │
│  └─────────────┘  └─────────────┘  │  Attendance,│  └──────────────────┘ │
│                                    │  Assessment,│                       │
│  ┌─────────────────────────────────│  Leave,     │──────────────────┐  │
│  │         ENGINE LAYER            │  Communic.) │                  │  │
│  │  ┌──────────┐ ┌──────────┐     └──────┬──────┘                  │  │
│  │  │ Config   │ │ Rules    │            │                          │  │
│  │  │ Engine   │ │ Engine   │     ┌──────▼──────┐                  │  │
│  │  └──────────┘ └──────────┘     │ EVENT BUS   │                  │  │
│  │  ┌──────────┐ ┌──────────┐     │ (Pub/Sub)   │                  │  │
│  │  │ Workflow │ │ Metadata │     └──────┬──────┘                  │  │
│  │  │ Engine   │ │ Engine   │            │                          │  │
│  │  └──────────┘ └──────────┘            │                          │  │
│  │  ┌──────────┐                         │                          │  │
│  │  │ Template │                         │                          │  │
│  │  │ Engine   │                         │                          │  │
│  │  └──────────┘                         │                          │  │
│  └───────────────────────────────────────┼──────────────────────────┘  │
│                                           │                             │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    AI MODULE (In-Backend)                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐│ │
│  │  │ Homework Gen │  │ Auto-Grading │  │ Report Summaries        ││ │
│  │  │ (teacher     │  │ (evaluate    │  │ (parent digests,        ││ │
│  │  │  triggers)   │  │  submissions)│  │  report card comments)  ││ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘│ │
│  │  Uses AI Provider abstraction (OpenAI/Anthropic/Google/Local)     │ │
│  │  Runs as async BullMQ jobs — never blocks API handlers            │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                           │                             │
│                          ┌────────────────▼────────────────────┐       │
│                          │        Backend Infrastructure        │       │
│                          │  ┌────────────┐  ┌───────────────┐  │       │
│                          │  │ Prisma ORM │  │ File Storage  │  │       │
│                          │  │ (connects  │  │ via signed    │  │       │
│                          │  │ to external│  │ URLs / S3 SDK │  │       │
│                          │  │ PostgreSQL)│  └───────────────┘  │       │
│                          │  └────────────┘                     │       │
│                          │  ┌────────────┐  ┌───────────────┐  │       │
│                          │  │ BullMQ     │  │ AI Module     │  │       │
│                          │  │ Job Queue  │  │ (OpenAI/Anth) │  │       │
│                          │  └────────────┘  └───────────────┘  │       │
│                          └─────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────────────────────┘
            │
            │  Internal API (x-api-key)
            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                   AI CHAT SERVICE (Separate Repository)                    │
│                   See: `ai_chat/` repo for full specification              │
│                                                                            │
│  FastAPI + LangGraph + Telegram/WhatsApp/WebChat                           │
│  Consumes edu_tech backend REST APIs — NEVER accesses database directly    │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Backend-Frontend Separation

### Principles

| Principle | Description |
|-----------|-------------|
| **Backend is the Source of Truth** | All business logic, authorization, and data validation lives in the backend |
| **Backend is API-First** | All backend features are exposed via RESTful APIs (OpenAPI 3.x) |
| **Frontend is a Consumer** | Frontend consumes backend APIs; never contains business logic or direct DB access |
| **Frontend is Client-Aware** | Frontend fetches tenant config on boot and customizes itself (branding, features) |
| **Contract is the Bridge** | OpenAPI spec is the contract; both teams develop against it independently |

### Separation of Concerns

| Concern | Backend | Frontend |
|---------|---------|----------|
| Authentication | ✅ JWT issuance & verification | Stores token, attaches to requests |
| Authorization | ✅ Permission checks, RBAC guard | Hides UI elements (UX only) |
| Business Logic | ✅ All rules, workflows, validations | — |
| Data Persistence | ✅ Prisma → PostgreSQL (external) | — |
| Data Validation | ✅ Zod schemas on input | Client-side validation (UX only) |
| UI Rendering | — | ✅ React components |
| Routing & Navigation | — | ✅ Next.js App Router |
| Branding & Theming | Stores config | ✅ Applies config |
| Feature Flags | ✅ Evaluates rules | ✅ Conditional rendering |
| Offline Queue | — | ✅ IndexedDB queue |
| Caching | ✅ Redis (optional, external) | TanStack Query cache |
| File Storage | ✅ S3/MinIO, signed URLs | Uploads via signed URLs |

---

## Deployment Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PROJECT INFRASTRUCTURE                           │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────┐        │
│  │                    CDN / Edge (Cloudflare)                     │        │
│  │  - Static assets caching                                       │        │
│  │  - DDoS protection                                             │        │
│  └──────────────────────────────────────────────────────────────┘        │
│                           │                                               │
│  ┌────────────────────────▼──────────────────────────────────────┐       │
│  │                Frontend Hosting (Vercel / AWS Amplify)         │       │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │       │
│  │  │ school-a.app │  │ school-b.app │  │ school-c.app │  ...   │       │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │       │
│  └───────────────────────────────────────────────────────────────┘       │
│                           │                                               │
│  ┌────────────────────────▼──────────────────────────────────────┐       │
│  │                    API Gateway (AWS API GW / Nginx)            │       │
│  │  - Rate limiting per tenant                                    │       │
│  │  - Request validation                                          │       │
│  │  - SSL termination                                             │       │
│  └────────────────────────┬──────────────────────────────────────┘       │
│                           │                                               │
│  ┌────────────────────────▼──────────────────────────────────────┐       │
│  │              Backend API (ECS / EKS / App Runner)             │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │       │
│  │  │ Instance 1  │  │ Instance 2  │  │ Instance N  │           │       │
│  │  └─────────────┘  └─────────────┘  └─────────────┘           │       │
│  └───────────────────────────────────────────────────────────────┘       │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────┐        │
│  │               AI Chat Service (ECS / App Runner)               │        │
│  │  ┌─────────────────────────────────────────────┐              │        │
│  │  │ FastAPI + LangGraph + Telegram Bot Webhook   │              │        │
│  │  └─────────────────────────────────────────────┘              │        │
│  └──────────────────────────────────────────────────────────────┘        │
│                                                                           │
│  ════════════════════════════════════════════════════════════════        │
│  EXTERNAL SERVICES (managed outside this project)                         │
│  ════════════════════════════════════════════════════════════════        │
│                                                                           │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────────┐                  │
│  │ PostgreSQL   │  │ Redis      │  │ SuperTokens      │                  │
│  │ (RDS/managed)│  │ (ElastiCache│  │ (Identity/Auth)  │                  │
│  │              │  │ — optional)│  │                  │                  │
│  └──────┬───────┘  └─────┬──────┘  └────────┬─────────┘                  │
│         │                │                   │                             │
│         │   DATABASE_URL │ REDIS_URL         │ SUPERTOKENS_CONNECTION_URI  │
│         │                │ (optional)        │ SUPERTOKENS_API_KEY         │
│         └────────────────┼───────────────────┘                             │
│                          │                                                 │
│              Backend connects via env vars                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

### External Services

PostgreSQL, Redis, and SuperTokens are **externally managed services**. The backend connects to them via environment variables. They are NOT built, deployed, or provisioned as part of this project.

| Service | Required | Env Var(s) | Notes |
|---------|:--------:|------------|-------|
| **PostgreSQL** | ✅ Yes | `DATABASE_URL` | Schema managed via Prisma migrations; server managed externally |
| **Redis** | ❌ Optional | `REDIS_URL` | Backend uses in-process EventEmitter by default; degrades gracefully if unavailable |
| **SuperTokens** | ✅ Yes | `SUPERTOKENS_CONNECTION_URI`, `SUPERTOKENS_API_KEY` | Identity provider; project integrates via JWT token exchange (see [06-auth-spec.md](./06-auth-spec.md)) |

---

## Cross-References

| Topic | Canonical Document |
|-------|-------------------|
| **API Design Standards** (response format, pagination, error codes, idempotency) | [`01-prd.md` §1.5a](./01-prd.md) |
| **Authentication Flow & Token Design** | [`06-auth-spec.md`](./06-auth-spec.md) |
| **Multi-Tenant Data Flow & Tenant Context** | [`07-multi-tenant-spec.md`](./07-multi-tenant-spec.md) |
| **Multi-Tenant Strategy (Tier decisions, routing)** | [`17-multi-tenant-strategy.md`](./17-multi-tenant-strategy.md) |
| **Bounded Contexts (DDD domain boundaries)** | [`18-domain-driven-design.md`](./18-domain-driven-design.md) |
| **Backend Implementation (module structure, stack, engines)** | [`04-backend-spec.md`](./04-backend-spec.md) |
| **Frontend Implementation (customization, components, state)** | [`05-frontend-spec.md`](./05-frontend-spec.md) |
| **API Endpoint Contracts (per-module)** | [`08-api-contracts.md`](./08-api-contracts.md) |
| **Implementation Roadmap (phases, tasks, exit criteria)** | [`09-implementation-roadmap.md`](./09-implementation-roadmap.md) |
| **Backend-Admin UI** (configuration tool — Phase 0, served from backend) | [`04-backend-spec.md` §4.10](./04-backend-spec.md) |
| **Backend AI Module** (homework gen, auto-grading, report summaries — in-backend) | [`04-backend-spec.md` §4.12](./04-backend-spec.md) |
| **AI Chat Service** (conversational chatbot — separate repo) | [`ai_chat` repo](../../../ai_chat/) |
| **Engine Designs (Configuration, Rules, Workflow, Metadata, Template)** | [`12`](./12-configuration-engine.md) — [`16`](./16-template-engine.md) |
| **External Services** (PostgreSQL, Redis, SuperTokens — connection config) | This document (§Deployment Topology — External Services) |
| **Deployment & Infrastructure** | This document (§Deployment Topology) |

---

> **Next:** See [`04-backend-spec.md`](./04-backend-spec.md) for detailed backend implementation specification.
