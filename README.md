# EduTech — AI-Powered School Operations Platform

> **Multi-tenant SaaS platform for school operations with engine-driven configurability.**
> Supports radically different schools without code changes.

---

## ⚠️ IMPORTANT: Read Before Implementation

All specifications have been updated to reflect the engine-first architecture. **Phase 0 implementation can begin.**

**Start here:** [`docs/spec/01-prd.md`](./docs/spec/01-prd.md)

**Recommended reading order:** [`01-prd.md`](./docs/spec/01-prd.md) → [`03-architecture.md`](./docs/spec/03-architecture.md) → [`09-implementation-roadmap.md`](./docs/spec/09-implementation-roadmap.md)

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
│       ├── 01-10_*.md                 # Foundation specs
│       └── 12-20_*.md                 # Engine designs
│
├── server/                            # Backend API (NestJS)
├── client/                            # Frontend (Next.js)
├── contracts/                         # OpenAPI YAML files
└── README.md

ai_chat/                               # ← Separate repo (AI Chatbot Service)
├── docs/spec/                         # AI chatbot specifications
├── src/                               # Python/FastAPI application
└── README.md
```

---

## 🚀 Quick Start

### Read the Specs (Recommended Order)

1. **[PRD](./docs/spec/01-prd.md)** — Product vision, requirements, development standards
2. **[System Architecture](./docs/spec/03-architecture.md)** — High-level architecture + engine philosophy
3. **[Implementation Roadmap](./docs/spec/09-implementation-roadmap.md)** — Week-by-week execution plan
4. **[Domain-Driven Design](./docs/spec/18-domain-driven-design.md)** — Bounded contexts and context map

### Full Index

See [`docs/spec/README.md`](./docs/spec/README.md) for the complete 20-document index.

### Implementation Status

🟢 **Specification Complete** — All specs updated. Phase 0 implementation is the next step.

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

> **Status:** Pre-Implementation | **Branch:** `spec/prd-and-template` | **Last Updated:** 2026-06-05 (v2.1 — Skill-Standards Alignment)
