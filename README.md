# EduTech — AI-Powered School Operations Platform

> **Multi-tenant SaaS platform for school operations with engine-driven configurability.**
> Supports radically different schools without code changes.

---

## ⚠️ IMPORTANT: Read Before Implementation

The initial specification (docs 1–10) assumed relatively uniform school requirements. The **Architecture Review (docs 11–20)** identified critical gaps. **Do not start implementation** without reviewing these findings.

**Start here:** [`docs/spec/11-architecture-review.md`](./docs/spec/11-architecture-review.md)

---

## 🎯 Project Overview

EduTech is a SaaS platform that unifies school operations. It serves **radically different schools** from one backend through an **engine-first architecture**:

| Engine | Purpose | School Variability Solved |
|--------|---------|--------------------------|
| **Configuration Engine** | Hierarchical config with JSON Schema | Attendance types, grading scales, academic calendars |
| **Rules Engine** | JSON-based condition/action evaluation | Grade calculation, attendance aggregation, promotion eligibility |
| **Workflow Engine** | Configurable state machines | Leave approvals, corrections, admissions |
| **Metadata Engine** | Custom fields without schema changes | Per-school student/teacher fields |
| **Template Engine** | Handlebars/PDF document generation | Report cards, certificates, letters |

### Key Architecture Decisions

| Decision | Description |
|----------|-------------|
| **Decoupled Frontend-Backend** | Shared backend + per-client Next.js frontends |
| **Hybrid Multi-Tenant** | Shared schema (90%) → Dedicated instances (2%) |
| **Engine-First Architecture** | Engines built BEFORE business modules |
| **Domain Events** | Contexts communicate via event bus, not direct imports |
| **AI Abstraction** | OpenAI, Anthropic, Google, local models behind single interface |
| **Configuration over Code** | Zero hardcoded business rules |

---

## 📂 Repository Structure

```
project_edu_tech/
├── docs/
│   └── spec/                          # ← Specification hub
│       ├── README.md                  # Spec index + quick links
│       ├── 01-10_*.md                 # Foundation specs (v1)
│       └── 11-20_*.md                 # Architecture review + engines (v2) ⭐
│
├── server/                            # Backend API (NestJS) — Phase 0
├── client/                            # Frontend (Next.js) — Phase 1
├── ai-service/                        # Python AI Service — Phase 3
└── contracts/                         # OpenAPI YAML files — Phase 0
```

---

## 🚀 Quick Start

### Read the Specs (Recommended Order)

1. **[Architecture Review](./docs/spec/11-architecture-review.md)** — What's wrong with the current design
2. **[Configuration Engine](./docs/spec/12-configuration-engine.md)** — Foundation for all per-school variability
3. **[Extensibility & Migration](./docs/spec/20-extensibility-migration.md)** — How to get from here to there
4. **[DDD Bounded Contexts](./docs/spec/18-domain-driven-design.md)** — Proper domain boundaries

### Full Index

See [`docs/spec/README.md`](./docs/spec/README.md) for the complete 20-document index.

### Implementation Status

🟡 **Pre-Implementation, Architecture Review Complete** — Foundation refactoring (Phase 0) is the next step.

---

## 📋 Modules & Variability Support

| Module | School A | School B | School C | School D |
|--------|----------|----------|----------|----------|
| **Attendance** | Present/Absent/Late | + Half Day/Medical | Period-based | Custom statuses |
| **Grading** | A+ to F bands | Percentage | GPA (4.0) | Rubric-based |
| **Academic Structure** | Semester | Trimester | Quarterly | Custom terms |
| **Workflow** | Teacher→Principal | Teacher→Coord→Principal | Conditional (≤3d skip) | Custom chains |
| **Report Cards** | Standard layout | Detailed layout | GPA-focused | Custom templates |

---

## 🏗️ Architecture — Engines Layer

```
┌─────────────────────────────────────────────────────────┐
│                   BUSINESS CONTEXTS                       │
│  Identity │ Academic │ Attendance │ Assessment │ Leave   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                   ENGINE LAYER                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Config   │ │ Rules    │ │ Workflow │ │ Metadata │   │
│  │ Engine   │ │ Engine   │ │ Engine   │ │ Engine   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────────────────────────────────┐  │
│  │ Template │ │           EVENT BUS                   │  │
│  │ Engine   │ │                                      │  │
│  └──────────┘ └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 10 + TypeScript 5 + Prisma 5 |
| **Database** | PostgreSQL 16 + Redis 7 |
| **Frontend** | Next.js 14 + Tailwind CSS + shadcn/ui |
| **State** | TanStack Query + Zustand |
| **AI** | Provider abstraction (OpenAI/Anthropic/Google/Local) + LangGraph for chatbot |
| **Auth** | SuperTokens + JWT |
| **Templates** | Handlebars + Puppeteer (PDF) |
| **Events** | Redis Pub/Sub → BullMQ (Phase 3) |

---

## 📐 Development Principles

1. **Configuration over Code** — Zero hardcoded business rules
2. **Events over Direct Calls** — Contexts communicate via event bus
3. **Abstractions over Implementations** — AI, notifications, storage behind interfaces
4. **Metadata over Schema Changes** — Custom fields via JSONB, not ALTER TABLE
5. **Templates over Hardcoded Views** — Report cards, certificates from templates
6. **Spec First, Code Second** — No implementation without an approved spec
7. **Backend is Source of Truth** — All security decisions on the backend

---

> **Status:** Pre-Implementation | **Branch:** `spec/prd-and-template` | **Last Updated:** 2026-06-05 (v2)
