# Auth Module (Identity Context)

## Purpose
Authentication and authorization for the EduTech platform. Handles login, token issuance, RBAC permission resolution, and SuperTokens identity exchange.

## Business Rules
- **Authentication ≠ Authorization** — Auth verifies identity; Authz verifies permissions
- **Dev mode** — Login with short password (≤10 chars) bypasses SuperTokens verification
- **Production mode** — Login requires `supertokens_token` verified against SuperTokens core
- **Token exchange** — Frontend gets SuperTokens session → exchanges for backend JWT at `/auth/login`
- **JWT claims** — Access token contains `{ sub, tenant, role, permissions }` — 15 min expiry
- **Refresh tokens** — Opaque, stored in DB, rotated on each use, 30-day expiry
- **Logout** — Revokes refresh token, clears HttpOnly cookie

## Dependencies
| Service | Purpose |
|---------|---------|
| `PrismaService` | User lookup, refresh token management, RBAC queries |
| `RbacService` | Permission resolution (role-based + user overrides) |
| `SuperTokensService` | SuperTokens token verification (production mode) |
| `jose` | JWT signing (HS256) and verification |

## External Integration
- **SuperTokens** (external, port 3567) — Identity verification in production. Dev mode bypasses.
- **PostgreSQL** (external) — User and refresh token storage

## Files
```
auth/
├── auth.controller.ts       # POST login, refresh, logout | GET me
├── auth.module.ts           # Module definition, exports guards + services
├── jwt-token.service.ts     # JWT issue, verify, refresh, rotate
├── rbac.service.ts          # Permission CRUD + resolution
├── guards/
│   └── auth.guards.ts       # AuthGuard (JWT), TenantGuard (tenant isolation), PermissionGuard
└── supertokens/
    └── supertokens.service.ts  # SuperTokens SDK init + token verification
```
