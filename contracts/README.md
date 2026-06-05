# EduTech — API Contracts

> **Contract-first development.** Every bounded context has an OpenAPI 3.1 spec.
> Backend implements against these contracts. Frontend SDK generated from these specs.

## Bounded Context Index (8 contexts)

| # | File | Context | Phase | Status |
|---|------|---------|-------|--------|
| 1 | [`config-context.yaml`](./config-context.yaml) | **Configuration** | Phase 0 | ✅ Implemented |
| 2 | [`identity-context.yaml`](./identity-context.yaml) | **Identity** | Phase 1 | 📋 Scaffolded |
| 3 | [`academic-structure-context.yaml`](./academic-structure-context.yaml) | **Academic Structure** | Phase 1 | 📋 Scaffolded |
| 4 | [`attendance-context.yaml`](./attendance-context.yaml) | **Attendance** | Phase 1 | 📋 Scaffolded |
| 5 | [`assessment-context.yaml`](./assessment-context.yaml) | **Assessment** | Phase 1 | 📋 Scaffolded |
| 6 | [`leave-context.yaml`](./leave-context.yaml) | **Leave** | Phase 1 | 📋 Scaffolded |
| 7 | [`communication-context.yaml`](./communication-context.yaml) | **Communication** | Phase 1 | 📋 Scaffolded |
| 8 | [`reporting-context.yaml`](./reporting-context.yaml) | **Reporting** | Phase 1 | 📋 Scaffolded |
| — | [`domain-events.yaml`](./domain-events.yaml) | **Domain Events Catalog** | Phase 0 | ✅ Defined |

## API Standards (from PRD §1.5a)

| Standard | Convention |
|----------|-----------|
| Response format | `{ "data": ..., "meta": { "page", "pageSize", "total", "totalPages" } }` |
| Error format | `{ "error": { "code": "MODULE_ERROR_CODE", "message": "...", "details": {} } }` |
| Pagination | `?page=1&pageSize=20` (default 20, max 100) |
| Filtering | `?status=active&type_code=MID_TERM` |
| Sorting | `?sortBy=created_at&sortDir=desc` |
| Search | `?search=rahul` (ILIKE across searchable fields) |
| Idempotency | `Idempotency-Key: <uuid>` header for POST/PUT |
| Versioning | Path-based: `/api/v1/...` |

## Common Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_FAILED` | 400 | Request body validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Permission denied |
| `TENANT_ACCESS_DENIED` | 403 | Cross-tenant access attempt |
| `CONFIG_VALIDATION_FAILED` | 400 | Config does not match JSON Schema |
| `DUPLICATE` | 409 | Unique constraint violation |
| `TRANSITION_INVALID` | 400 | Workflow transition not allowed |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

## CI/CD Pipeline (Planned)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ OpenAPI Lint │ ──▶ │ Generate SDK │ ──▶ │ Type Check   │
│ (spectral)   │     │ (openapi-ts) │     │ (tsc)        │
└──────────────┘     └──────────────┘     └──────────────┘
```
