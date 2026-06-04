# 4. Backend Specification

> **Status:** Draft — Pre-Implementation  
> **Last Updated:** 2026-06-05

---

## 4.1 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | NestJS | 10.x |
| Language | TypeScript | 5.x (strict) |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16 |
| Cache | Redis | 7.x |
| Queue | BullMQ | 5.x |
| Validation | Zod | 3.x |
| Auth | jose (JWT) | 5.x |
| File Storage | @aws-sdk/client-s3 | 3.x |
| Testing | Vitest + Supertest | Latest |

---

## 4.2 Backend Architecture Principles

### API-First Design

Every feature is exposed through RESTful APIs designed around **business capabilities** — never around UI screens.

```
Business Capability → API Contract → Controller → Service → Repository → Database
```

### Domain-Oriented Modules

```
modules/
├── attendance/     # Everything attendance-related
│   ├── controller/ # Request handling, response formatting
│   ├── service/    # Business logic, permission checks, transactions
│   ├── repository/ # Database queries (tenant-scoped)
│   ├── dto/        # Request/Response DTOs
│   ├── validation/ # Zod schemas
│   ├── permissions/# Module-specific permission definitions
│   └── tests/      # Unit + Integration tests
├── homework/
├── exams/
├── leave/
├── notifications/
├── reports/
├── users/
├── tenants/
└── auth/
```

### Strict Layered Architecture

```
Controller  →  Never contains business logic
Service     →  Business rules, permission checks, transactions
Repository  →  Database operations only (tenant-scoped, no business logic)
```

### DTO-Based APIs

**Never expose database entities directly.** All API responses go through DTOs.

```typescript
// ✅ CORRECT
class AttendanceResponseDTO {
  id: string;
  student_id: string;
  student_name: string;  // Denormalized for consumer
  class_id: string;
  date: string;
  status: AttendanceStatus;
  marked_by_name?: string;
  notes?: string;
}

// Service transforms entity → DTO
async getAttendance(id: string): Promise<AttendanceResponseDTO> {
  const record = await this.repo.findById(id, this.tenantId);
  return this.toResponseDTO(record);
}
```

---

## 4.3 API Design Standards

### URL Convention

```
/api/v1/{tenant_id}/resource              # List/Create
/api/v1/{tenant_id}/resource/{id}         # Get/Update/Delete
/api/v1/{tenant_id}/resource/{id}/action  # Custom action
```

### HTTP Methods

| Method | Purpose | Idempotent |
|--------|---------|------------|
| GET | Retrieve | Yes |
| POST | Create | No |
| PUT | Full update | Yes |
| PATCH | Partial update | No |
| DELETE | Soft delete | Yes |

### Response Standards

#### Success Response

```json
// Single item
{
  "data": { "id": "uuid", "name": "..." }
}

// List (paginated)
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}

// Created
// Status: 201
// Location: /api/v1/{tenant}/resource/{id}
{
  "data": { "id": "uuid", ... }
}
```

#### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Error Codes

| HTTP Status | Code | When |
|-------------|------|------|
| 400 | `VALIDATION_ERROR` | Request body/query fails Zod validation |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Valid JWT but insufficient permissions |
| 403 | `TENANT_ACCESS_DENIED` | Cross-tenant access attempt |
| 404 | `NOT_FOUND` | Resource doesn't exist or not in tenant scope |
| 409 | `CONFLICT` | Duplicate resource, concurrent edit conflict |
| 422 | `BUSINESS_RULE_VIOLATION` | Valid input but violates business rule |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### Pagination

```
GET /api/v1/{tenant}/attendance?page=1&limit=20&sort=-date&filter[class_id]=xxx
```

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | — | Page number |
| `limit` | integer | 20 | 100 | Items per page |
| `sort` | string | `-created_at` | — | Field name, `-` prefix for descending |
| `filter[field]` | string | — | — | Exact match filter |

### Versioning

```
/api/v1/attendance     # Current
/api/v2/attendance     # Breaking change (future)
```

- Breaking changes (removing/renaming fields) → new version
- Non-breaking (adding optional fields, new endpoints) → same version
- Old versions maintained for 12 months after deprecation
- Deprecation communicated via `Deprecation: true` response header

---

## 4.4 Database Design

### Multi-Tenant Schema Pattern

**Every table MUST include `tenant_id`:**

```prisma
model Attendance {
  id         String    @id @default(uuid())
  tenant_id  String
  student_id String
  class_id   String
  // ... other fields

  // Tenant isolation indexes
  @@index([tenant_id])
  @@index([tenant_id, class_id, date])

  // PostgreSQL RLS policy
  // ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
  // CREATE POLICY tenant_isolation ON attendance
  //   USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
}
```

### Core Models (Phase 1)

| Model | Description | Key Relations |
|-------|-------------|---------------|
| `Tenant` | School/client record | Has many Users, Configs |
| `User` | All user accounts | Belongs to Tenant, has one Student/Staff profile |
| `Student` | Student profile | Belongs to User, Parent |
| `Staff` | Staff profile | Belongs to User |
| `Class` | Subject class group | Belongs to Teacher, Section |
| `Section` | Grade+Section homeroom | Has Class Teacher, Supervisor |
| `Attendance` | Daily attendance record | Belongs to Student, Class |
| `AttendanceCorrection` | Correction request | Belongs to Attendance |
| `Homework` | Homework assignment | Belongs to Class |
| `HomeworkTemplate` | Reusable template | Belongs to Creator, Class |
| `HomeworkSubmission` | Student submission | Belongs to Homework, Student |
| `SubmissionFile` | Uploaded file | Belongs to Submission |
| `Exam` | Exam/test record | Belongs to Class |
| `ExamScore` | Per-student score | Belongs to Exam, Student |
| `LeaveRequest` | Leave application | Belongs to Student/Staff |
| `Notification` | User notification | Belongs to User |
| `RiskFlag` | At-risk student flag | Belongs to Student |
| `AuditLog` | Action log | Belongs to User |
| `TenantConfig` | Per-tenant setting | Belongs to Tenant |
| `TenantFeature` | Feature flag | Belongs to Tenant |
| `Permission` | Action permission | — |
| `RolePermission` | Role→Permission mapping | Belongs to Permission |
| `UserPermission` | User override | Belongs to User, Permission |
| `UserResourceScope` | Resource access scope | Belongs to User |

### Soft Delete

All major models include `deleted_at: DateTime?`. Queries default to `WHERE deleted_at IS NULL`.

---

## 4.5 Authorization Engine

### Three-Layer Guard

```
Layer 1 — Route:    AuthGuard → Verify JWT, extract tenant & user
Layer 2 — Action:   @RequirePermission('resource:action') → Check permissions
Layer 3 — Resource: @RequireClassAccess / @RequireStudentAccess → Scope data
```

### Permission Format

```
resource:action

Examples:
  attendance:view
  attendance:mark
  homework:create
  homework:grade
  exam:enter-scores
  leave:approve
  admin:users
```

### Implementation (NestJS Decorators)

```typescript
// Controller
@Controller('api/v1/:tenantId/attendance')
export class AttendanceController {
  
  @Post()
  @UseGuards(AuthGuard, TenantGuard)
  @RequirePermission('attendance:mark')
  @RequireClassAccess()  // Decorator extracts class_id from body
  async markAttendance(
    @TenantContext() tenant: TenantContext,
    @Body() dto: CreateAttendanceDTO
  ) {
    return this.attendanceService.markAttendance(tenant, dto);
  }
}
```

### Resource Scoping

```typescript
// Service layer
class AttendanceService {
  async markAttendance(ctx: TenantContext, dto: CreateAttendanceDTO) {
    // Verify class belongs to tenant
    const classRecord = await this.classRepo.findById(dto.class_id, ctx.tenantId);
    
    // Verify teacher is assigned to this class
    await requireClassAccess(classRecord, ctx.userId);
    
    // Verify student belongs to tenant
    const student = await this.studentRepo.findById(dto.student_id, ctx.tenantId);
    
    // Proceed with business logic
    return this.attendanceRepo.upsert({ ...dto, tenant_id: ctx.tenantId });
  }
}
```

---

## 4.6 Configuration Service

### Interface

```typescript
interface ConfigurationService {
  get<T>(tenantId: string, key: string, defaultValue?: T): Promise<T>;
  set(tenantId: string, key: string, value: any): Promise<void>;
  getAll(tenantId: string): Promise<Record<string, any>>;
  getFeatureFlag(tenantId: string, feature: string): Promise<boolean>;
}
```

### Configuration Keys

```yaml
branding:
  branding.school_name: "Green Valley School"
  branding.logo_url: "https://cdn.edutech.com/tenants/gvs/logo.png"
  branding.primary_color: "#3B82F6"
  branding.secondary_color: "#10B981"

features:
  feature.subject_wise_attendance: true   # Per-grade
  feature.ai_homework_generator: true
  feature.biometric_attendance: false
  feature.parent_telegram_chatbot: true

business_rules:
  attendance.minimum_rate: 0.75           # 75% threshold
  attendance.max_leave_days: 15           # Per academic year
  homework.late_submission_days: 3        # Days allowed late
  homework.late_penalty_percent: 10       # Score penalty for late
  exam.pass_percentage: 35                # Minimum to pass

limits:
  limits.max_students_per_class: 60
  limits.max_file_upload_mb: 25
  limits.max_notifications_per_day: 5
```

---

## 4.7 Audit Logging

Every mutation MUST be logged:

```typescript
await logAction({
  userId: ctx.userId,
  tenantId: ctx.tenantId,
  action: 'attendance:mark',
  resource: 'Attendance',
  resourceId: attendanceRecord.id,
  details: { status: 'ABSENT', classId: dto.classId },
  ipAddress: ctx.ipAddress
});
```

### What Gets Logged

- All CUD operations (Create, Update, Delete)
- Authentication events (login, logout, token refresh)
- Permission changes
- Configuration changes
- Cross-tenant access attempts (security alerts)

---

## 4.8 Error Handling

```typescript
// Domain-specific error classes
class NotFoundError extends Error { code = 'NOT_FOUND'; status = 404; }
class ForbiddenError extends Error { code = 'FORBIDDEN'; status = 403; }
class ValidationError extends Error { code = 'VALIDATION_ERROR'; status = 400; }
class BusinessRuleViolation extends Error { code = 'BUSINESS_RULE_VIOLATION'; status = 422; }

// Global exception filter
@Catch()
class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    // Format error consistently
    // Log unexpected errors to Sentry
    // Return appropriate status code + error response
  }
}
```

---

## 4.9 Testing Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| **Unit** | Vitest | Service logic, validation, permission checks, DTO mapping |
| **Integration** | Vitest + Supertest | API endpoints, database interactions, tenant isolation |
| **E2E** | Playwright (via frontend repo) | Full user flows |

### Tenant Isolation Tests (Mandatory)

```typescript
describe('Tenant Isolation', () => {
  it('prevents cross-tenant data access', async () => {
    // Login as Tenant A user
    const tokenA = await getToken(tenantAUser);
    
    // Try to access Tenant B's data
    const response = await request(app)
      .get(`/api/v1/${tenantB.id}/attendance`)
      .auth(tokenA, { type: 'bearer' });
    
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('TENANT_ACCESS_DENIED');
  });
});
```

---

> **Next:** See [`05-frontend-spec.md`](./05-frontend-spec.md) for detailed frontend specification.
