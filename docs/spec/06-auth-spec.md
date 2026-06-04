# 6. Authentication & Authorization Specification

> **Status:** Draft — Pre-Implementation  
> **Last Updated:** 2026-06-05

---

## 6.1 Core Principles

| Principle | Implementation |
|-----------|---------------|
| **Authentication ≠ Authorization** | Auth verifies identity (SuperTokens); Authz verifies permissions (RBAC engine) |
| **Backend is Source of Truth** | ALL security decisions happen on the backend; frontend gates are UX only |
| **Every Request Authenticated** | No request to a protected resource is ever trusted without JWT verification |
| **Centralized Authorization** | Single `requirePermission()` function — never scattered role checks |
| **Least Privilege** | Users get the minimum permissions needed for their role |
| **Zero Trust** | Never trust client-side state for security decisions |

---

## 6.2 Authentication Flow

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  FRONTEND        │     │  BACKEND API     │     │  AUTH SERVICE   │
│  (Next.js)       │     │  (NestJS/Express)│     │  (SuperTokens)  │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │  POST /auth/signin    │                        │
         │  { email, password }  │                        │
         │───────────────────────────────────────────────▶│
         │                       │                        │
         │  { status: "OK",      │                        │
         │    user: { id, email }}│                       │
         │◀───────────────────────────────────────────────│
         │                       │                        │
         │  POST /api/v1/auth/login                       │
         │  { email,            │                        │
         │    supertokens_id }   │                        │
         │──────────────────────▶│                        │
         │                       │                        │
         │                       │ Lookup user in Prisma  │
         │                       │ (email, tenant, role)  │
         │                       │                        │
         │  { access_token,      │                        │
         │    refresh_token,     │                        │
         │    user: { id, name,  │                        │
         │      role, tenant,    │                        │
         │      permissions } }  │                        │
         │◀──────────────────────│                        │
         │                       │                        │
         │  Store refresh_token  │                        │
         │  in HttpOnly cookie   │                        │
         │  Store access_token   │                        │
         │  in memory            │                        │
```

### Login Sequence

```
1. User submits email + password on frontend
2. Frontend calls Auth Service (SuperTokens): POST /auth/signin
3. Auth Service verifies credentials → returns success + user identity
4. Frontend calls Backend API: POST /api/v1/auth/login with email + supertokens_user_id
5. Backend looks up user in Prisma (by email), verifies tenant, loads permissions
6. Backend issues:
   - Access Token (JWT): 15-minute expiry, contains sub, tenant, role, permissions
   - Refresh Token: opaque, 30-day expiry, rotated on each use
7. Frontend stores:
   - Access Token: in-memory (JavaScript variable)
   - Refresh Token: HttpOnly Secure SameSite cookie

All subsequent API calls:
   Authorization: Bearer <access_token>
```

### Token Refresh Flow

```
1. Backend detects expired access token → returns 401
2. Frontend interceptor catches 401
3. Calls POST /api/v1/auth/refresh (refresh token in cookie auto-sent)
4. Backend validates refresh token, revokes old, issues new pair
5. Retry original request with new access token
```

---

## 6.3 Token Design

### Access Token (JWT)

```json
{
  "sub": "user-uuid-123",
  "tenant": "tenant-uuid-456",
  "role": "TEACHER",
  "permissions": [
    "attendance:view",
    "attendance:mark",
    "homework:create",
    "homework:grade"
  ],
  "iat": 1717620000,
  "exp": 1717620900
}
```

**Rules:**
- Signed with RS256 (asymmetric) or HS256 (symmetric) 
- NEVER includes PII (name, email) — keep claims minimal
- 15-minute lifetime
- Stateless (no DB lookup needed for verification — just JWT verification)

**Note on permissions in JWT:** Since the token is short-lived (15min), including permissions avoids a DB lookup on every request. Permission changes take effect within 15 minutes. For immediate revocation, the refresh token can be invalidated.

### Refresh Token

- Opaque token (random string)
- Stored in database (revocable)
- 30-day lifetime
- Rotated on each use (old token invalidated)
- Sent via HttpOnly Secure SameSite cookie
- NEVER exposed to JavaScript

---

## 6.4 RBAC Permission Matrix

### Roles

| Role | Description | Default Scope |
|------|-------------|---------------|
| `SUPER_ADMIN` | Platform owner (cross-tenant) | All tenants |
| `ADMIN` | School administrator | Own tenant, all resources |
| `PRINCIPAL` | School principal | Own tenant, all resources (view/manage) |
| `TEACHER` | Subject/class teacher | Own tenant, assigned classes only |
| `PARENT` | Parent/guardian | Own children's data only |
| `STUDENT` | Student | Own data only |
| `STAFF` | Non-teaching staff | Own data only |
| `COUNSELOR` | School counselor | Own tenant, read-only on students |

### Permission Matrix

| Permission Code | SUPER_ADMIN | ADMIN | PRINCIPAL | TEACHER | PARENT | STUDENT | STAFF | COUNSELOR |
|----------------|-------------|-------|-----------|---------|--------|---------|-------|-----------|
| `attendance:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `attendance:mark` | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| `attendance:correct` | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| `attendance:export` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `homework:create` | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| `homework:edit` | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| `homework:delete` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `homework:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `homework:submit` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `homework:grade` | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| `homework:return` | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| `homework:ai-generate` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `exam:create` | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| `exam:edit` | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| `exam:delete` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `exam:enter-scores` | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| `exam:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `leave:apply` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `leave:approve` | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| `leave:view` | ✅ | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ | ✅ |
| `student:view` | ✅ | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ | ✅ |
| `student:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `subject:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `report:view` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `report:export` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `admin:settings` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `admin:permissions` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `admin:users` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `tenant:manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> **\*** = Scoped to teacher's assigned classes only (via `requireClassAccess`)

### Resource Scoping for TEACHER Role

A teacher's access is determined by:

| Level | Mechanism |
|-------|-----------|
| **Section-level** | `Section.class_teacher_id` — sees ALL subjects in their section |
| **Subject-teacher** | `Class.teacher_id` — sees only their assigned subjects |
| **Override** | `UserResourceScope` — admin-granted extra access |

---

## 6.5 Guard Implementation

### Backend Guards (NestJS)

```typescript
// AuthGuard — verifies JWT, extracts claims
@Injectable()
class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    
    const payload = await this.jwtService.verify(token);
    request.user = payload;  // { sub, tenant, role, permissions }
    return true;
  }
}

// TenantGuard — validates tenant from URL param matches JWT claim
@Injectable()
class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantParam = request.params.tenantId;
    const tenantClaim = request.user.tenant;
    
    // SUPER_ADMIN can access any tenant
    if (request.user.role === 'SUPER_ADMIN') return true;
    
    if (tenantParam !== tenantClaim) {
      throw new ForbiddenError('TENANT_ACCESS_DENIED');
    }
    return true;
  }
}

// PermissionGuard — checks resource:action permission
export const RequirePermission = (permission: string) => {
  return applyDecorators(
    SetMetadata('requiredPermission', permission),
    UseGuards(PermissionGuard)
  );
};

@Injectable()
class PermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string>('requiredPermission', context.getHandler());
    const { permissions } = context.switchToHttp().getRequest().user;
    
    if (!permissions.includes(required)) {
      throw new ForbiddenError(`Missing permission: ${required}`);
    }
    return true;
  }
}
```

### Frontend Guards (UX Only)

```typescript
// hooks/usePermission.ts
export function usePermission(permission: string): boolean {
  const permissions = useAuthStore(s => s.permissions);
  return permissions.includes(permission);
}

// components/PermissionGate.tsx
export function PermissionGate({ 
  permission, 
  children,
  fallback = null 
}: { 
  permission: string; 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const allowed = usePermission(permission);
  if (!allowed) return fallback;
  return <>{children}</>;
}
```

**⚠️ REMEMBER:** Frontend permission gates are UX ONLY. Backend always re-verifies.

---

## 6.6 Audit Logging

All authentication and authorization events are logged:

```typescript
// Events logged
- LOGIN_SUCCESS / LOGIN_FAILED
- LOGOUT
- TOKEN_REFRESHED
- PERMISSION_DENIED (security alert)
- TENANT_ACCESS_DENIED (security alert)
- PERMISSION_CHANGED (admin action)
- ROLE_CHANGED (admin action)
```

### Audit Log Schema

```prisma
model AuditLog {
  id          String    @id @default(uuid())
  tenant_id   String
  user_id     String?
  action      String     // 'attendance:mark', 'LOGIN_SUCCESS', etc.
  resource    String     // 'Attendance', 'User', etc.
  resource_id String?
  details     Json?      // { status: 'ABSENT', classId: '...' }
  ip_address  String?
  user_agent  String?
  created_at  DateTime   @default(now())

  @@index([tenant_id, created_at])
  @@index([user_id, created_at])
  @@index([action, created_at])
}
```

---

## 6.7 Security Headers

```typescript
// Backend: Helmet middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https://cdn.edutech.com"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS: Allow only known frontend domains
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedTenantDomains();
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // For refresh token cookie
}));
```

---

> **Next:** See [`07-multi-tenant-spec.md`](./07-multi-tenant-spec.md) for multi-tenant architecture specification.
