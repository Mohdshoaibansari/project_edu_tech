# 3. System Architecture

> **Status:** Draft — Pre-Implementation  
> **Last Updated:** 2026-06-05

---

## 3.1 High-Level Architecture

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
│                          ┌────────────────▼────────────────────┐       │
│                          │        Data Layer                    │       │
│                          │  ┌────────────┐  ┌───────────────┐  │       │
│                          │  │ Prisma ORM │  │ File Storage  │  │       │
│                          │  │ PostgreSQL │  │ S3 / MinIO    │  │       │
│                          │  └────────────┘  └───────────────┘  │       │
│                          │  ┌────────────┐  ┌───────────────┐  │       │
│                          │  │ Redis      │  │ Message Queue │  │       │
│                          │  │ (Cache)    │  │ (BullMQ/Rab)  │  │       │
│                          │  └────────────┘  └───────────────┘  │       │
│                          └─────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────────────────────┘
            │
            │  Internal API (x-api-key auth)
            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                   PYTHON AI SERVICE (Shared — Tenant-Aware)                 │
│                                                                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────────┐  │
│  │ Telegram Bot │──▶│ FastAPI      │──▶│ LangGraph Agent              │  │
│  │ Webhook      │   │ Endpoints    │   │ - Intent Classification      │  │
│  └──────────────┘   └──────────────┘   │ - Attendance Queries         │  │
│                                        │ - Leave Application Flow     │  │
│                                        │ - Homework Queries           │  │
│                                        └──────────────┬───────────────┘  │
│                                                       │                   │
│                                          ┌────────────▼───────────────┐  │
│                                          │ Next.js Internal API Client │  │
│                                          │ (HTTP + x-api-key)          │  │
│                                          └────────────────────────────┘  │
│                                                                            │
│  ⚠️ RULE: Python AI service NEVER directly accesses PostgreSQL.            │
│  ALL data flows through the Backend API.                                   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3.2 Backend-Frontend Separation

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
| Data Persistence | ✅ Prisma → PostgreSQL | — |
| Data Validation | ✅ Zod schemas on input | Client-side validation (UX only) |
| UI Rendering | — | ✅ React components |
| Routing & Navigation | — | ✅ Next.js App Router |
| Branding & Theming | Stores config | ✅ Applies config |
| Feature Flags | ✅ Evaluates rules | ✅ Conditional rendering |
| Offline Queue | — | ✅ IndexedDB queue |
| Caching | ✅ Redis | TanStack Query cache |
| File Storage | ✅ S3/MinIO, signed URLs | Uploads via signed URLs |

---

## 3.3 Auth Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  USER    │     │  FRONTEND    │     │  BACKEND API │     │ SUPERTOKENS  │
│ (Browser)│     │  (Next.js)   │     │  (Node.js)   │     │ (Docker)     │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
     │                  │                    │                    │
     │  1. Login Page   │                    │                    │
     │─────────────────▶│                    │                    │
     │                  │                    │                    │
     │                  │  2. POST /auth/signin (email, password)│
     │                  │───────────────────────────────────────▶│
     │                  │                    │                    │
     │                  │  3. Verify + Session Token             │
     │                  │◀───────────────────────────────────────│
     │                  │                    │                    │
     │                  │  4. POST /api/v1/auth/login            │
     │                  │  (email, supertokens_session_id)       │
     │                  │───────────────────▶│                    │
     │                  │                    │                    │
     │                  │                    │ 5. Lookup user in  │
     │                  │                    │    Prisma by email │
     │                  │                    │                    │
     │                  │  6. Access Token   │                    │
     │                  │  (JWT: userId,     │                    │
     │                  │   tenant_id, role, │                    │
     │                  │   permissions)     │                    │
     │                  │◀───────────────────│                    │
     │                  │                    │                    │
     │                  │  7. Refresh Token  │                    │
     │                  │  (HttpOnly Cookie) │                    │
     │                  │                    │                    │
     │  8. Redirect to  │                    │                    │
     │     Dashboard    │                    │                    │
     │◀─────────────────│                    │                    │
     │                  │                    │                    │
     │  ─── Subsequent Requests ───          │                    │
     │                  │                    │                    │
     │                  │  9. API Call +     │                    │
     │                  │  Authorization:    │                    │
     │                  │  Bearer <jwt>      │                    │
     │                  │───────────────────▶│                    │
     │                  │                    │                    │
     │                  │                    │ 10. Verify JWT     │
     │                  │                    │     Check permission│
     │                  │                    │     Check tenant   │
     │                  │                    │                    │
     │                  │  11. Response      │                    │
     │                  │◀───────────────────│                    │
```

### Token Design

| Token | Storage | Lifetime | Rotation | Contents |
|-------|---------|----------|----------|----------|
| **Access Token (JWT)** | In-memory (JS variable) | 15 minutes | Auto-refresh | `sub`, `tenant`, `role`, `permissions[]`, `exp`, `iat` |
| **Refresh Token** | HttpOnly Secure Cookie | 30 days | Rotate on use | Opaque token, server-validated |

### JWT Claims (Minimal)

```json
{
  "sub": "user-uuid",
  "tenant": "tenant-uuid",
  "role": "TEACHER",
  "permissions": ["attendance:mark", "homework:create", "homework:grade"],
  "iat": 1717620000,
  "exp": 1717620900
}
```

---

## 3.4 Multi-Tenant Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     INCOMING REQUEST                          │
│  GET /api/v1/attendance?class_id=xxx                         │
│  Headers: Authorization: Bearer <jwt>                        │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  1. AUTH MIDDLEWARE                                          │
│     - Verify JWT signature                                   │
│     - Extract tenant_id from JWT claim                       │
│     - Extract user_id, role, permissions from JWT            │
│     - Attach to request context                              │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  2. TENANT CONTEXT RESOLVER                                  │
│     - Validate tenant_id exists and is active                │
│     - Set tenant context on AsyncLocalStorage                │
│     - Load tenant config into cache (if not cached)          │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  3. PERMISSION GUARD                                         │
│     - Check requiredPermission('attendance:view')            │
│     - Check resource scope (requireClassAccess)              │
│     - If PRINCIPAL/TEACHER → verify class belongs to tenant  │
│     - If PARENT → verify student is parent's child           │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  4. SERVICE LAYER                                            │
│     - Execute business logic                                 │
│     - Pass tenant_id to all repository calls                 │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  5. REPOSITORY LAYER                                         │
│     - ALL queries include: WHERE tenant_id = $tenant_id      │
│     - PostgreSQL RLS enforces as defense-in-depth            │
│     - Return data (already tenant-scoped)                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 3.5 Domain Module Structure

### Backend (`server/`) — Bounded Contexts + Engine Layer

```
server/
├── src/
│   ├── contexts/                        # Bounded contexts (DDD)
│   │   ├── identity/                    # Users, roles, auth, sessions
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── interfaces/
│   │   ├── academic-structure/          # Tenants, grades, sections, subjects, classes, calendar
│   │   ├── attendance/                  # Attendance CRUD, status validation, rate calculation
│   │   ├── assessment/                  # Homework, exams, grading, rubrics, submissions
│   │   ├── leave/                       # Leave requests, workflow integration
│   │   ├── communication/               # Notifications, chatbot, messaging
│   │   │
│   │   ├── configuration/               # ⭐ ENGINE LAYER (Cross-cutting)
│   │   │   ├── config-engine/           # Hierarchical JSON Schema configuration
│   │   │   ├── rules-engine/            # JSON condition/action evaluation
│   │   │   ├── workflow-engine/         # Configurable state machines
│   │   │   ├── metadata-engine/         # Custom fields without schema changes
│   │   │   └── template-engine/         # Document generation (Handlebars + PDF)
│   │   │
│   │   └── reporting/                   # Reports, analytics, dashboards, exports
│   │
│   ├── shared-kernel/                    # Branded types, errors, event bus, DB client
│   │   ├── types/                        # TenantId, UserId, StudentId branded types
│   │   ├── errors/                       # NotFoundError, ForbiddenError, ValidationError
│   │   ├── events/                       # Domain event definitions + EventBus
│   │   └── database/                     # Prisma client, transaction helper
│   │
│   ├── providers/                       # External integrations
│   │   ├── auth/                        # SuperTokens adapter
│   │   ├── ai/                          # AI provider abstraction + implementations
│   │   ├── notifications/               # Email, SMS, Push providers
│   │   └── storage/                     # S3/MinIO file storage
│   │
│   └── main.ts                          # Application entry point
│
├── prisma/
│   ├── schema.prisma                    # Zero business enums — reference data tables instead
│   ├── migrations/
│   └── seed.ts                          # 3 diverse school configs
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── config-variability/              # ⭐ Tests with 3+ school configs
│
├── package.json
└── tsconfig.json
```
│   └── main.ts                    # Application entry point
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── package.json
└── tsconfig.json
```

### Frontend (`client/`)

```
client/
├── src/
│   ├── app/                        # Next.js App Router entry
│   │   ├── layout.tsx              # Root layout + providers
│   │   ├── page.tsx                # Landing / redirect
│   │   └── [tenant]/               # Tenant-scoped routes
│   │       └── (dashboard)/
│   │           ├── layout.tsx      # Dashboard layout (sidebar + header)
│   │           ├── attendance/
│   │           ├── homework/
│   │           ├── exams/
│   │           ├── reports/
│   │           └── admin/
│   │
│   ├── modules/                    # Feature modules (domain)
│   │   ├── attendance/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── tests/
│   │   ├── homework/
│   │   ├── exams/
│   │   ├── reports/
│   │   └── admin/
│   │
│   ├── shared/                     # Cross-cutting shared code
│   │   ├── api/                    # Generated API client + hooks
│   │   ├── components/             # Design system (shadcn/ui)
│   │   ├── forms/                  # Form framework
│   │   ├── tables/                 # Table framework
│   │   ├── layouts/                # Layout components
│   │   ├── hooks/                  # Shared hooks
│   │   └── utils/                  # Utilities
│   │
│   ├── services/                   # Cross-cutting services
│   │   ├── auth.service.ts
│   │   ├── tenant-config.service.ts
│   │   └── feature-flags.service.ts
│   │
│   ├── store/                      # Zustand stores (UI state only)
│   ├── types/                      # Shared TypeScript types
│   ├── config/                     # Client configuration
│   └── lib/                        # Utility functions
│
├── public/
│   └── tenants/                    # Per-tenant static assets
│       └── [tenant-slug]/
│           ├── logo.svg
│           └── favicon.ico
│
├── tests/
│   ├── unit/
│   └── e2e/
│
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3.6 Deployment Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          INFRASTRUCTURE                                   │
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
│  └────────────────────────┬──────────────────────────────────────┘       │
│                           │                                               │
│  ┌────────────────────────▼──────────────────────────────────────┐       │
│  │                      Data Layer                                 │       │
│  │  ┌──────────────┐  ┌────────────┐  ┌──────────────────┐       │       │
│  │  │ PostgreSQL   │  │ Redis      │  │ S3 / MinIO       │       │       │
│  │  │ (RDS)       │  │ (ElastiCache)│  │ (Object Storage) │       │       │
│  │  └──────────────┘  └────────────┘  └──────────────────┘       │       │
│  └───────────────────────────────────────────────────────────────┘       │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────┐        │
│  │               AI Service (ECS / App Runner)                    │        │
│  │  ┌─────────────────────────────────────────────┐              │        │
│  │  │ FastAPI + LangGraph + Telegram Bot Webhook   │              │        │
│  │  └─────────────────────────────────────────────┘              │        │
│  └──────────────────────────────────────────────────────────────┘        │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────┐        │
│  │               Auth Service (ECS / Docker)                      │        │
│  │  ┌──────────────┐  ┌────────────────────┐                      │        │
│  │  │ PostgreSQL   │  │ SuperTokens Core   │                      │        │
│  │  │ (Auth DB)   │  │ + Auth Service     │                      │        │
│  │  └──────────────┘  └────────────────────┘                      │        │
│  └──────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3.7 Technology Stack Decision

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Backend Framework** | NestJS (or Express + TypeScript) | Modular, opinionated, enterprise-ready, decorator-based |
| **Backend Language** | TypeScript 5 (strict) | Type safety, shared types with frontend |
| **ORM** | Prisma 5 | Type-safe, migration tooling, multi-tenant friendly |
| **Database** | PostgreSQL 16 | Robust, RLS support, JSONB for config |
| **Cache** | Redis 7 | Session store, rate limit counter, config cache |
| **Queue** | BullMQ (Redis-backed) | Notifications, file processing, AI jobs |
| **File Storage** | S3 / MinIO | Scalable, signed URL support |
| **Frontend Framework** | Next.js 14 (App Router) | SSR/SSG, routing, image optimization |
| **UI Library** | shadcn/ui + Tailwind CSS | Customizable, accessible, theme-friendly |
| **State (Server)** | TanStack Query (React Query) | Cache, refetch, mutation management |
| **State (UI)** | Zustand | Lightweight, simple API |
| **Forms** | React Hook Form + Zod | Performant, type-safe validation |
| **API Client** | OpenAPI Generator → TypeScript SDK | Contract-driven, type-safe |
| **AI Service** | FastAPI + LangGraph + LangChain | Python AI ecosystem, graph-based agents |
| **Chatbot** | python-telegram-bot | Telegram Bot API wrapper |
| **Auth** | SuperTokens (Docker) + JWT | Centralized identity, token exchange pattern |
| **API Docs** | Swagger UI / Scalar (from OpenAPI) | Auto-generated from contracts |
| **Monitoring** | Prometheus + Grafana + Sentry | Metrics, traces, error tracking |
| **CI/CD** | GitHub Actions | Automated test, build, deploy per client |

---

> **Next:** See [`04-backend-spec.md`](./04-backend-spec.md) for detailed backend specification.
