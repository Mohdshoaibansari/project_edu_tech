# Auth Module — Permissions

This module doesn't define business permissions. It enforces them. Permissions are defined per-module and seeded globally.

## Module-Specific Permission Keys

| Permission | Purpose | Required Roles |
|-----------|---------|---------------|
| `admin:permissions` | View/modify role-permission assignments | SUPER_ADMIN, ADMIN |
| `admin:users` | Manage user accounts | SUPER_ADMIN, ADMIN |
| `admin:settings` | Platform-level settings | SUPER_ADMIN, ADMIN |
| `tenant:manage` | Create/delete tenants | SUPER_ADMIN only |

## Guard Behavior

| Guard | Layer | Effect |
|-------|-------|--------|
| `AuthGuard` | Global APP_GUARD | Extracts JWT from `Authorization: Bearer` header. Skips `/auth/login`, `/auth/refresh`, `/auth/logout`, `/admin/*` |
| `TenantGuard` | Global APP_GUARD | Validates `:tenantId` URL param matches JWT `tenant` claim. SUPER_ADMIN bypasses |
| `PermissionGuard` | Per-controller | Checks `@RequirePermission(permission)` decorator against `request.user.permissions`. 403 if missing |
