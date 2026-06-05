# 2. Spec-Driven Development Template

> **Purpose:** Standard template for specifying every feature, API, component, or architectural change before implementation.  
> **Principle:** Spec first, code second. No implementation without an approved spec.

---

## 2.1 When to Use This Template

| Situation | Template Section |
|-----------|-----------------|
| New feature/module | §2.2 Feature Spec |
| Architecture decision | §2.3 Architecture Decision Record (ADR) |
| New API endpoint | §2.4 API Contract Spec |
| New database model/migration | §2.5 Database Schema Spec |
| New frontend page/component | §2.6 Frontend Component Spec |
| Cross-cutting concern | §2.3 ADR + relevant section |
| Bug fix affecting spec | §2.2 Feature Spec (update) + §2.8 Changelog |

---

## 2.2 Feature Specification Template

```markdown
# Feature: [Feature Name]

> **Spec ID:** SPEC-XXX  
> **Status:** Draft | In Review | Approved | In Progress | Done  
> **Author:** [Name]  
> **Created:** YYYY-MM-DD  
> **Last Updated:** YYYY-MM-DD  
> **Related PRD Requirements:** [List PRD IDs, e.g., AT-01, HW-03]

---

## Summary

[2-3 sentences describing what this feature does and why]

## User Stories

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| US-01 | [Role] | [Action] | [Outcome] | P0/P1/P2 |

### Acceptance Criteria

**US-01: [Story Title]**
- [ ] Given [precondition], when [action], then [expected result]
- [ ] Given [precondition], when [action], then [expected result]

## Functional Requirements

| ID | Requirement | Details | Priority |
|----|------------|---------|----------|
| FR-01 | [Description] | [Details, edge cases] | P0/P1/P2 |

## Non-Functional Requirements

| ID | Category | Requirement | Target |
|----|----------|------------|--------|
| NFR-01 | Performance | [e.g., API response time] | [e.g., < 200ms p95] |
| NFR-02 | Security | [e.g., Permission check] | [e.g., homework:submit] |
| NFR-03 | Accessibility | [e.g., Keyboard navigation] | [e.g., WCAG 2.1 AA] |

## UI/UX Design

### Wireframes
[Link to Figma / attach screenshots]

### States to Handle
- [ ] Loading state (skeleton)
- [ ] Empty state (no data yet)
- [ ] Error state (API failure, network error)
- [ ] Edge cases (max length, special characters, concurrent edits)

### Responsive Behavior
- [ ] Mobile (< 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (> 1024px)

## API Contracts

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| GET | /api/v1/[resource] | [Purpose] | — | [Response DTO] |
| POST | /api/v1/[resource] | [Purpose] | [Request DTO] | [Response DTO] |

> **Note:** Full OpenAPI spec goes in [`08-api-contracts.md`](./08-api-contracts.md). Reference contract IDs here.

## Database Changes

### New Models
[Prisma model definitions]

### Model Changes
[ALTER TABLE / field additions]

### Migrations
[Description of data migration strategy if needed]

## Authorization

| Permission Required | Scope | Notes |
|--------------------|-------|-------|
| [resource]:[action] | Tenant | [Additional scoping details] |

## Multi-Tenant Considerations

- [ ] Data scoped to tenant (tenant_id on all queries)
- [ ] Configuration-driven (no hardcoded business rules)
- [ ] Feature flag gating (which tenants get this feature)
- [ ] Cross-tenant isolation verified

## Testing Strategy

### Unit Tests
- [ ] Service layer business logic
- [ ] Validation rules
- [ ] Permission checks

### Integration Tests
- [ ] API endpoint happy path
- [ ] API endpoint error cases
- [ ] Tenant isolation (cross-tenant access denied)
- [ ] Authorization (missing permission returns 403)

### E2E Tests
- [ ] Full user flow (login → action → result)
- [ ] Multi-role flows (teacher submits → parent views)

## Dependencies

| Depends On | Status | Notes |
|------------|--------|-------|
| [SPEC-XXX] | Done/In Progress | [What we need from it] |

## Rollout Plan

- [ ] Feature flag: `feature.[name]` (default: disabled)
- [ ] Beta tenants: [List]
- [ ] Monitoring: [Metrics to watch]
- [ ] Rollback plan: [How to disable quickly]

## Open Questions

- [ ] [Question 1]
- [ ] [Question 2]

---

## Review Checklist

- [ ] All acceptance criteria defined and testable
- [ ] API contracts defined (OpenAPI)
- [ ] Authorization requirements specified
- [ ] Multi-tenant isolation considered
- [ ] All UI states defined (loading, empty, error, edge cases)
- [ ] Database changes reviewed for performance (indexes)
- [ ] Testing strategy complete
- [ ] Dependencies identified
- [ ] Rollout plan defined
- [ ] Spec reviewed by: [Name], [Name]
```

---

## 2.3 Architecture Decision Record (ADR) Template

```markdown
# ADR-XXX: [Title]

> **Status:** Proposed | Accepted | Deprecated | Superseded by ADR-YYY  
> **Date:** YYYY-MM-DD  
> **Deciders:** [Names]

---

## Context

[What is the issue that we're seeing that is motivating this decision or change?]

## Decision

[What is the change that we're proposing and/or doing?]

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|-------------|
| [Option 1] | [Pros] | [Cons] | [Reason] |
| [Option 2] | [Pros] | [Cons] | [Reason] |

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative (Trade-offs)
- [Cost 1]
- [Cost 2]

### Mitigations
- [How we handle the negative consequences]

## References

- [Link to related specs, docs, discussions]
```

---

## 2.4 API Contract Spec Template

> **See also:** [`08-api-contracts.md`](./08-api-contracts.md) for the full OpenAPI specification.

```yaml
# API Contract: [Resource Name]
# Contract ID: API-XXX
# Version: v1

openapi: "3.0.3"
info:
  title: "[Resource] API"
  version: "1.0.0"
  description: "[Description]"

paths:
  /api/v1/{tenant_id}/[resource]:
    get:
      summary: "List [resources]"
      description: "Returns paginated list of [resources] scoped to tenant"
      tags: ["[Resource]"]
      security:
        - BearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
        - name: sort
          in: query
          schema:
            type: string
        - name: filter
          in: query
          schema:
            type: string
      responses:
        '200':
          description: "Success"
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/[Resource]ListResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

    post:
      summary: "Create [resource]"
      tags: ["[Resource]"]
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Create[Resource]Request'
      responses:
        '201':
          description: "Created"
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/[Resource]Response'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

  /api/v1/{tenant_id}/[resource]/{id}:
    get:
      summary: "Get [resource] by ID"
      tags: ["[Resource]"]
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: "Success"
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/[Resource]Response'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Create[Resource]Request:
      type: object
      required: [required_fields]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 200

    [Resource]Response:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    [Resource]ListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/[Resource]Response'
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        total_pages:
          type: integer

  responses:
    Unauthorized:
      description: "Missing or invalid authentication"
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    Forbidden:
      description: "Insufficient permissions"
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    NotFound:
      description: "Resource not found"
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    BadRequest:
      description: "Validation error"
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    ErrorResponse:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: array
              items:
                type: object
```

---

## 2.5 Database Schema Spec Template

```markdown
# Database: [Model Name]

> **Spec ID:** DB-XXX  
> **Status:** Draft | Approved | Implemented  
> **Related Feature:** SPEC-XXX  
> **Related PRD:** [PRD IDs]

---

## Model Definition

```prisma
model [ModelName] {
  id         String   @id @default(uuid())
  tenant_id  String
  // ... fields

  // Timestamps
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  deleted_at DateTime?

  // Relations
  // ...

  @@index([tenant_id])
  @@index([tenant_id, created_at])
}
```

## Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | Yes | auto | Primary key |
| tenant_id | UUID | Yes | — | Tenant isolation |
| [field] | [type] | [Yes/No] | [default] | [Description] |

## Indexes

| Index | Type | Columns | Purpose |
|-------|------|---------|---------|
| idx_[name] | B-tree | tenant_id | Tenant-scoped queries |
| idx_[name] | B-tree | tenant_id, [col] | Common query pattern |

## Relationships

| From | To | Type | On Delete | Notes |
|------|----|------|-----------|-------|
| [Model] | [RelatedModel] | 1:N / N:1 | Cascade / SetNull / Restrict | [Description] |

## Migration Notes

[Any special migration considerations, data backfill, breaking changes]
```

---

## 2.6 Frontend Component Spec Template

```markdown
# Component: [Component Name]

> **Spec ID:** UI-XXX  
> **Status:** Draft | Approved | Built  
> **Module:** [attendance | homework | exams | ...]  
> **Route:** [/route-path]

---

## Purpose

[2-3 sentences describing what this page/component does]

## User Flow

```
1. [Step 1]
2. [Step 2]
3. [Step 3]
```

## Component Tree

```
[PageName]
├── [Layout Component]
├── [Header Component]
│   ├── [Breadcrumb]
│   └── [Action Button]
├── [Filter Bar]
├── [Data Grid / Table]
│   ├── [Row Component]
│   └── [Empty State]
└── [Modal / Drawer]
```

## State Management

| State | Source | Type |
|-------|--------|------|
| [data] | Server (TanStack Query / SWR) | `[DataType]` |
| [ui state] | Client (Zustand store) | `[UIType]` |
| [form state] | Local (React Hook Form) | `[FormType]` |

## API Consumption

| Hook / Call | Endpoint | Method | Purpose |
|-------------|----------|--------|---------|
| use[Resource]List | /api/v1/[tenant]/[resource] | GET | Fetch list |
| use[Resource]Create | /api/v1/[tenant]/[resource] | POST | Create new |

## States

| State | Visual | Trigger |
|-------|--------|---------|
| **Loading** | Skeleton grid | Initial fetch |
| **Empty** | Illustration + "No [items] yet" + CTA | Empty response |
| **Error** | Error card + Retry button | API failure, network error |
| **Success** | Populated grid/table | Successful fetch |
| **Optimistic Update** | Immediate UI change + revert on error | Mutations |

## Client Customization Points

| Aspect | Config Key | Default | How Customized |
|--------|-----------|---------|---------------|
| [Brand color] | branding.primary_color | #3B82F6 | CSS variable override |
| [School name] | branding.school_name | "My School" | Layout header |
| [Feature visibility] | feature.[name] | true | Conditional render |
| [Labels/text] | i18n.[key] | "Default Label" | i18n bundle per tenant |

## Accessibility Checklist

- [ ] Semantic HTML (headings, landmarks, form labels)
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus management (trap focus in modals, restore on close)
- [ ] ARIA labels for icon-only buttons
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Screen reader announcements for dynamic content

## Performance Checklist

- [ ] Lazy loaded at route level (code splitting)
- [ ] Images optimized (next/image, lazy loading)
- [ ] List virtualization for > 50 items
- [ ] Memoized callbacks (useCallback, useMemo)
- [ ] No unnecessary re-renders
```

---

## 2.7 Testing Specification Template

```markdown
# Test Plan: [Feature/Module]

> **Spec ID:** TEST-XXX  
> **Related Feature:** SPEC-XXX

---

## Test Matrix

| Layer | Framework | Scope | Count |
|-------|-----------|-------|-------|
| Unit | Vitest / Jest | Service logic, validation, permissions | [N] |
| Integration | Supertest / MSW | API endpoints, DB interactions | [N] |
| E2E | Playwright / Cypress | Full user flows | [N] |
| Contract | Pact / OpenAPI validator | API contract compliance | [N] |

## Test Cases

### Unit Tests
```
✓ [Service].[method] - returns correct data for valid input
✓ [Service].[method] - throws error for invalid input
✓ [Service].[method] - enforces tenant isolation
✓ [Guard].[function] - allows with correct permission
✓ [Guard].[function] - denies with missing permission
✓ [Guard].[function] - denies with expired token
```

### Integration Tests
```
✓ GET /api/v1/[tenant]/[resource] - returns 200 with paginated data
✓ GET /api/v1/[tenant]/[resource] - returns 401 without auth
✓ GET /api/v1/[tenant]/[resource] - returns 403 without permission
✓ GET /api/v1/[tenant]/[resource] - tenant A cannot see tenant B data
✓ POST /api/v1/[tenant]/[resource] - returns 201 on success
✓ POST /api/v1/[tenant]/[resource] - returns 400 on validation error
```

### E2E Tests
```
✓ [Role] can [action] from [page]
✓ [Role] cannot [action] from [page] (UI hidden, API blocked)
✓ [Role] sees correct data scoped to their [class/child/school]
```

### Tenant Isolation Tests (Mandatory)
```
✓ Tenant A user cannot access Tenant B resources
✓ Tenant A user cannot list Tenant B resources
✓ Tenant A user cannot create resources in Tenant B
✓ Tenant A admin cannot see Tenant B users
```

## Test Data

| Fixture | Description | Source |
|---------|-------------|--------|
| seed.ts | Demo data for all tenants | scripts/seed.ts |
| factories | Test factories for dynamic data | tests/factories/ |
```

---

## 2.8 Implementation Review Checklist

> Use this checklist when reviewing any spec implementation before merging.
>
> Also verify the mandatory **Definition of Done** from [`01-prd.md` §1.8](./01-prd.md) is met before marking a feature complete.

### Backend Checklist

- [ ] Domain module structure follows convention (`modules/[domain]/controller|service|repository|dto|validation|permissions|tests`)
- [ ] Controller has NO business logic (delegates to service)
- [ ] Service calls `requirePermission()` and `requireClassAccess()` / `requireStudentAccess()` where needed
- [ ] Repository includes `tenant_id` in ALL where clauses
- [ ] DTOs used for ALL request validation and response serialization
- [ ] Zod schemas for all input validation (not ad-hoc checks)
- [ ] API follows REST conventions (resource names, status codes, error format)
- [ ] Pagination, filtering, and sorting standardized
- [ ] Error responses use consistent format (`{ error: { code, message, details } }`)
- [ ] Audit logging on all mutations (`logAction()`)
- [ ] Database indexes added for common query patterns
- [ ] No raw database entities exposed in API responses

### Frontend Checklist

- [ ] Module structure follows convention (`modules/[domain]/pages|components|hooks|services|types|tests`)
- [ ] Uses generated API client types (no manual type definitions for API data)
- [ ] All states handled: Loading (skeleton), Empty, Error, Edge cases
- [ ] Uses TanStack Query / SWR for server state (not manual fetch + useState)
- [ ] Uses Zustand only for UI state (not server data)
- [ ] Responsive: Mobile-first, tested at 375px, 768px, 1440px
- [ ] Client customization points use config keys (not hardcoded)
- [ ] Feature flags respected (do not show disabled features)
- [ ] Accessibility: semantic HTML, keyboard nav, ARIA labels, focus management
- [ ] Performance: lazy loaded, memoized where needed, virtualized for large lists

### Security Checklist

- [ ] Every protected endpoint requires authentication
- [ ] Every protected endpoint checks authorization via `requirePermission()`
- [ ] Tenant isolation verified (cross-tenant access tested)
- [ ] Input validation on ALL endpoints (Zod schemas)
- [ ] Rate limiting configured for public endpoints
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS prevention (React auto-escapes, no dangerouslySetInnerHTML without sanitization)
- [ ] CSRF protection for cookie-based sessions (if used)
- [ ] Secure headers configured (Helmet)

### General Checklist

- [ ] Spec document updated with final decisions
- [ ] Changelog entry added to [`10-changelog.md`](./10-changelog.md)
- [ ] All acceptance criteria met (from feature spec)
- [ ] Tests written and passing (unit + integration + tenant isolation)
- [ ] Code reviewed by at least one other engineer
- [ ] No TODO comments without associated ticket/issue
- [ ] Documentation updated (README, API docs if applicable)

---

## 2.9 Spec Lifecycle

```
Draft → In Review → Approved → In Progress → Done → Archived
  │                                              │
  └──────────────── (Update) ────────────────────┘
```

| State | Meaning | Who Can Move |
|-------|---------|-------------|
| **Draft** | Author is writing the spec | Author |
| **In Review** | Spec is open for team review | Author → Reviewers |
| **Approved** | Spec is finalized and ready for implementation | Tech Lead / Architect |
| **In Progress** | Implementation has begun | Developer |
| **Done** | Implementation complete, tests pass, deployed | Developer |
| **Archived** | Feature is sunset or superseded | Tech Lead |

---

> **Next:** See [`03-architecture.md`](./03-architecture.md) for the detailed system architecture.
