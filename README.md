# EduTech — AI-Powered School Operations Platform

> **Multi-tenant, decoupled frontend-backend platform for Attendance, Homework, Exams, Leave Management, and AI Chatbot.**

---

## 🎯 Project Overview

EduTech is a SaaS platform that unifies school operations into a single, scalable system. It serves multiple schools from one backend while giving each school its own customized frontend.

### Key Architecture Decisions

| Decision | Description |
|----------|-------------|
| **Decoupled Frontend-Backend** | Shared Node.js backend API + per-client Next.js frontends |
| **Multi-Tenant** | One database serves all schools with `tenant_id` isolation |
| **API-First** | OpenAPI 3.x contracts defined before implementation |
| **AI-Powered** | LangGraph agent for Telegram chatbot + auto-grading + homework generation |
| **Enterprise Auth** | SuperTokens (identity) + JWT (session) + RBAC with fine-grained permissions |

---

## 📂 Repository Structure

```
project_edu_tech/
├── docs/
│   └── spec/                          # ← Specification hub (all docs are here)
│       ├── README.md                  # Spec index + quick links
│       ├── 01-prd.md                  # Product Requirements Document
│       ├── 02-spec-template.md        # Spec-Driven Development Template
│       ├── 03-architecture.md         # System Architecture
│       ├── 04-backend-spec.md         # Backend Specification
│       ├── 05-frontend-spec.md        # Frontend Specification
│       ├── 06-auth-spec.md            # Authentication & Authorization
│       ├── 07-multi-tenant-spec.md    # Multi-Tenant Architecture
│       ├── 08-api-contracts.md        # API Contracts
│       ├── 09-implementation-roadmap.md # Implementation Roadmap
│       └── 10-changelog.md            # Changelog
│
├── server/                            # Backend API (NestJS) — COMING IN PHASE 1
├── client/                            # Frontend (Next.js) — COMING IN PHASE 1
├── ai-service/                        # Python AI Service — COMING IN PHASE 1
├── contracts/                         # OpenAPI YAML files — COMING IN PHASE 1
└── docker/                            # Docker Compose — COMING IN PHASE 1
```

---

## 🚀 Quick Start

### Read the Specs

1. **New to the project?** Start at [`docs/spec/01-prd.md`](./docs/spec/01-prd.md)
2. **Want to understand architecture?** See [`docs/spec/03-architecture.md`](./docs/spec/03-architecture.md)
3. **Building a feature?** Use the template in [`docs/spec/02-spec-template.md`](./docs/spec/02-spec-template.md)
4. **Need API details?** See [`docs/spec/08-api-contracts.md`](./docs/spec/08-api-contracts.md)

### Implementation Status

🟡 **Pre-Implementation** — Specifications are drafted. Implementation begins in Phase 1.

---

## 📋 Key Feature Modules

| Module | Description | Phase |
|--------|-------------|-------|
| **Attendance** | Teacher roll-call, correction workflow, per-grade configurable | 1 |
| **Homework** | Create, distribute, submit, grade, AI-generate, AI-grade | 1 |
| **Exams** | Create exams, enter scores, pass/fail tracking, statistics | 1 |
| **Leave** | Apply, multi-level approve (Teacher → Principal), tracking | 1 |
| **Notifications** | Absence alerts, homework alerts, leave updates | 1 |
| **Dashboards** | Teacher, Principal, Parent, Student role-specific dashboards | 1 |
| **Reports** | Daily/Monthly/Low-attendance reports, CSV/Excel/PDF export | 1 |
| **AI Chatbot** | Telegram bot for attendance queries, leave applications | 1 |
| **Admin** | User management, permissions UI, subject/class/section config | 1 |
| **Tenant Mgmt** | Onboard/offboard schools, per-tenant config, feature flags | 2 |

---

## 👥 Roles & Permissions

| Role | Scope |
|------|-------|
| `SUPER_ADMIN` | Platform-wide, cross-tenant |
| `ADMIN` | All resources within own tenant |
| `PRINCIPAL` | School-wide view + management |
| `TEACHER` | Assigned classes only |
| `PARENT` | Own children's data only |
| `STUDENT` | Own data only |
| `STAFF` | Own attendance + leave |
| `COUNSELOR` | Read-only student data |

> Full permission matrix: [`docs/spec/06-auth-spec.md`](./docs/spec/06-auth-spec.md)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 10 + TypeScript 5 + Prisma 5 |
| **Database** | PostgreSQL 16 + Redis 7 |
| **Frontend** | Next.js 14 + Tailwind CSS + shadcn/ui |
| **State** | TanStack Query + Zustand |
| **AI** | FastAPI + LangGraph + LangChain |
| **Auth** | SuperTokens + JWT |
| **Queue** | BullMQ |
| **Storage** | S3 / MinIO |

---

## 📐 Development Principles

1. **Spec First, Code Second** — No implementation without an approved spec
2. **Backend is Source of Truth** — All security decisions on the backend
3. **API-First Design** — Design APIs around business capabilities
4. **Domain-Oriented Modules** — Code organized by business domain, not technical layer
5. **Contract-Driven** — OpenAPI contracts as the bridge between frontend and backend
6. **Configuration-Driven** — No hardcoded business rules; everything per-tenant configurable
7. **Zero Trust** — Every request independently authenticated and authorized

---

> **Status:** Pre-Implementation | **Branch:** `spec/prd-and-template` | **Last Updated:** 2026-06-05
