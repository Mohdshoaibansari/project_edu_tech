# 11. Architecture Review — Gap Analysis & Hardcoded Assumptions

> **Status:** Draft — Pre-Implementation  
> **Date:** 2026-06-05  
> **Purpose:** Identify all hardcoded business rules and architectural weaknesses against SaaS variability requirements.

---

## 11.1 Executive Summary

The current specification (documents 01–10) was designed for a **single school with some configurability**, not for a **true SaaS platform serving radically different schools**. The architecture has significant hardcoded assumptions that would require code changes for every new school variation.

**Critical finding:** The platform will fail to serve Schools B, C, and D without fundamental architectural changes to attendance, grading, workflows, and reporting.

---

## 11.2 Hardcoded Business Rules — Comprehensive Audit

### 11.2.1 Attendance — CRITICAL

| What's Hardcoded | Where | Why It Fails |
|-----------------|-------|--------------|
| **Attendance statuses as Prisma enum** | `schema.prisma` → `enum AttendanceStatus` | School A needs `Present/Absent/Late`. School B needs `Present/Absent/Half Day/Medical Leave`. School C needs period-based. Changing enums requires migration + code deploy. |
| **Fixed statuses:** `PRESENT, ABSENT_UNEXCUSED, ABSENT_EXCUSED, TARDY, MEDICAL_LEAVE, APPROVED_LEAVE, HALF_DAY` | Schema + all services + UI | A school with only 3 statuses has 4 unused. A school with 8 statuses cannot add them. |
| **Attendance calculation:** `present / total` | Service layer (implied) | Some schools count "Late" as 0.5 present. Some count "Medical Leave" as present. Some schools use period-based aggregation. |
| **"All PRESENT by default"** | UI logic (hardcoded) | Some schools want "unmarked" as default and require explicit action. |
| **Daily vs Subject-wise toggle** | Hardcoded boolean | This doesn't address period-based attendance, rotating schedules, or schools that mix both models. |
| **Attendance correction workflow:** `Teacher requests → Admin approves` | Hardcoded in service | Different schools have different correction approval chains. |

### 11.2.2 Grading — CRITICAL

| What's Hardcoded | Where | Why It Fails |
|-----------------|-------|--------------|
| **Score as `Decimal(5,2)`** | `ExamScore.score` | Assumes numeric/percentage grading. School A needs letter grades (A+, A, B+, B). School C needs GPA (4.0 scale). School D needs rubric-based. |
| **Pass/fail based on single threshold** | `Exam.pass_score` | Some schools have grade bands (A: 80-100, B: 60-79, etc.) not a single pass threshold. |
| **No grade-to-percentage mapping** | Missing entirely | Letter grade schools need A+ = 95%, A = 87.5%, etc., for internal calculations. |
| **No GPA system** | Missing entirely | GPA schools need grade points per subject × credit hours. |
| **"Average" as mean** | Stats calculation | Some schools use weighted averages. Some use median. Some drop lowest score. |

### 11.2.3 Academic Structure — CRITICAL

| What's Hardcoded | Where | Why It Fails |
|-----------------|-------|--------------|
| **No academic calendar model** | Missing from schema | Semester, trimester, quarterly — the platform has no concept of academic periods at all. |
| **Grade levels as string** | `Student.grade_level` (free text) | No structure for: "10th Grade → Semester 1 → Mid-Term". |
| **No term/semester concept** | Missing | Report cards aggregate per term. Attendance resets per term. Exams belong to terms. |
| **No academic year** | Missing | Multi-year data, promotion between years, historical archives all need academic year context. |

### 11.2.4 Workflows — HIGH

| What's Hardcoded | Where | Why It Fails |
|-----------------|-------|--------------|
| **Leave approval:** `Teacher → Principal` | `LeaveRequest` model + service logic | School B needs `Teacher → Coordinator → Principal`. School C needs `Teacher → Principal (if > 3 days)`. |
| **Attendance correction:** `Request → Approve/Reject` | Service logic | Some schools allow self-correction within 24 hours. Some require different approvers by grade. |
| **Homework approval** | Not modeled at all | Some schools require HOD approval before publishing homework. |
| **No workflow definition model** | Missing | Every workflow is hardcoded as a fixed sequence of steps in service code. |

### 11.2.5 Report Cards — CRITICAL

| What's Hardcoded | Where | Why It Fails |
|-----------------|-------|--------------|
| **No report card model at all** | Missing entirely | The platform generates attendance reports and exam lists, not composite report cards. |
| **No template system** | Missing | Every school's report card has different sections, layouts, calculations, and branding. |
| **No dynamic data binding** | Missing | Cannot map "Student Name" → template placeholder without hardcoding. |

### 11.2.6 Other Hardcoded Areas

| Area | Issue |
|------|-------|
| **Student fields** | Fixed columns: `date_of_birth`, `grade_level`, `student_id_card`. School B needs `blood_group`, `religion`, `caste_category`, `transport_route`. |
| **Teacher fields** | No teacher-specific fields beyond User table. Some schools need `qualification`, `experience_years`, `specialization`, `board_registration_number`. |
| **Subject list** | `Subject` table assumes flat list. Some schools organize subjects into departments, streams (Science/Commerce/Arts), and electives. |
| **Notifications** | Notification types are a Prisma enum — cannot add new types per school. |
| **Leave types** | `LeaveRequest.type` is a string but validation is likely hardcoded. Schools need configurable leave types with different rules. |
| **Exam types** | Hardcoded enum: `UNIT_TEST, MID_TERM, FINAL, QUIZ, ANNUAL, OTHER`. Schools have different exam naming conventions. |

---

## 11.3 Architectural Weaknesses

### Weakness 1: Enum-Based Variability (Critical)

The architecture uses PostgreSQL enums via Prisma for business variability (AttendanceStatus, SubmissionStatus, ExamType, etc.). **Enums cannot be extended per tenant** — they are database-level types shared by all tenants.

**Impact:** Every new school with a different attendance model or grading system requires a migration that affects ALL tenants.

### Weakness 2: Flat Key-Value Configuration (High)

`TenantConfig` uses a flat `key → value` model. This works for simple flags but cannot model:
- Attendance type definitions (list of statuses, their rules, their visual properties)
- Grading scales (ordered mappings between scores and grades)
- Academic calendars (nested structures with dates, terms, holidays)

### Weakness 3: No Domain Events / Message Bus (Medium)

All module interactions are synchronous function calls between services. This creates tight coupling. For example:
- `AttendanceService` directly calls `NotificationService`
- `HomeworkService` directly calls `NotificationService`

A school that wants different notification triggers needs code changes.

### Weakness 4: Missing Cross-Cutting Engines

| Engine | Current State | SaaS Requirement |
|--------|--------------|-----------------|
| **Rules Engine** | Hardcoded `if/else` in services | Configurable rules with expressions |
| **Workflow Engine** | Hardcoded state transitions | Configurable approval chains with conditions |
| **Metadata Engine** | Fixed database columns | Dynamic fields without schema changes |
| **Template Engine** | None | Report cards, certificates, letters |
| **Scheduling Engine** | None (CRON strings only) | Academic calendar, period schedules, exam timetables |

### Weakness 5: Single Database Strategy Limits

The recommendation of "Shared DB, Shared Schema" is correct for the MVP but has limits:
- **No per-tenant schema customization** — a school needing a custom table cannot have it
- **No dedicated hosting** — a large school wanting dedicated infrastructure cannot get it
- **Shared migration risk** — a broken migration affects ALL tenants

### Weakness 6: AI Vendor Lock-In Risk

The AI service is tightly designed around LangChain + LangGraph. While these are frameworks (not vendors), the architecture should abstract the AI provider interface so the platform can use:
- OpenAI, Anthropic, Google Gemini, or local models
- Different models for different tasks (cheap model for classification, powerful model for generation)

---

## 11.4 Improvement Recommendations Summary

| # | Recommendation | Priority | Impact |
|---|---------------|----------|--------|
| 1 | Replace enums with tenant-configurable reference data tables | **P0** | Attends ALL attendance/grading/exam variability |
| 2 | Design hierarchical configuration engine (not flat key-value) | **P0** | Supports nested structures for calendars, grading scales, etc. |
| 3 | Build Rules Engine for calculations | **P0** | Grade calculation, attendance aggregation, promotion eligibility |
| 4 | Build Workflow Engine for approvals | **P0** | Configurable approval chains for leave, corrections, homework |
| 5 | Build Metadata Engine for custom fields | **P1** | Custom student/teacher fields without schema changes |
| 6 | Build Template Engine for documents | **P1** | Report cards, certificates, letters |
| 7 | Adopt Domain Events / Event Bus | **P1** | Decouple module interactions |
| 8 | Design AI abstraction layer | **P1** | Avoid vendor lock-in |
| 9 | Plan hybrid multi-tenant strategy | **P2** | Allow dedicated DB for enterprise tenants |
| 10 | Add Academic Calendar as first-class model | **P0** | Foundation for terms, report cards, promotions |

---

## 11.5 What The Current Spec Gets Right

To be fair, the current specification correctly establishes:

- ✅ **Multi-tenant data isolation** — `tenant_id` on every table is the right foundation
- ✅ **Decoupled frontend/backend** — Correct for per-client customization
- ✅ **RBAC with permission-based access** — Right authorization model
- ✅ **API-first, contract-driven development** — Right for multi-client consumption
- ✅ **Domain-oriented module structure** — Right code organization
- ✅ **SuperTokens + JWT token exchange** — Right auth pattern
- ✅ **Audit logging on all mutations** — Compliance foundation
- ✅ **DTO-based APIs** — Correct for backward compatibility

**These foundations are solid.** The gaps are in the **engines layer** — the generic infrastructure that allows per-tenant variability without code changes.

---

> **Next:** See [`12-configuration-engine.md`](./12-configuration-engine.md) for the Configuration Engine design.
