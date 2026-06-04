# 7. Multi-Tenant Architecture Specification

> **Status:** Draft — Pre-Implementation  
> **Last Updated:** 2026-06-05

---

## 7.1 Multi-Tenant Strategy

### Chosen Model: Shared Database, Shared Schema

| Strategy | Pros | Cons |
|----------|------|------|
| **Shared DB, Shared Schema** ✅ | Simple, cost-effective, easy cross-tenant queries | Requires strict `tenant_id` discipline |
| Shared DB, Separate Schema | Better isolation | Complex migrations, harder cross-tenant |
| Separate Database | Full isolation | Costly, harder to manage |
| Separate Instance | Maximum isolation | Very expensive, complex orchestration |

**Default choice:** Shared database with `tenant_id` column on every table + PostgreSQL Row-Level Security as defense-in-depth.

---

## 7.2 Tenant Data Model

### Tenant Table

```prisma
model Tenant {
  id         String   @id @default(uuid())
  name       String                    // "Green Valley School"
  slug       String   @unique          // "green-valley-school" (URL-safe)
  domain     String?  @unique          // "gvs.edutech.com"
  plan       String   @default("free") // free, basic, premium, enterprise
  status     String   @default("active") // active, suspended, trial, archived
  settings   Json?                     // Fallback for structured settings
  
  // Relations
  users              User[]
  configurations     TenantConfig[]
  features           TenantFeature[]
  
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  deleted_at DateTime?
}
```

### Tenant Isolation Pattern (Every Table)

```prisma
model [AnyModel] {
  id         String    @id @default(uuid())
  tenant_id  String    // ← MANDATORY on every table
  
  // ... business fields
  
  // Always include tenant-scoped indexes
  @@index([tenant_id])
  
  // Add composite indexes for common queries
  @@index([tenant_id, created_at])
  @@index([tenant_id, status])
}
```

---

## 7.3 Tenant Context Resolution

### Context Flow

```
Request
    │
    ▼
┌─────────────────────┐
│ 1. Extract tenant   │
│    - URL: /api/v1/{tenantId}/resource
│    - OR JWT: { "tenant": "uuid" }
│    - OR Header: X-Tenant-ID
│    - OR Subdomain: school-a.api.edutech.com
│                      │
│    Priority: URL param > JWT claim > Header > Subdomain
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 2. Validate tenant  │
│    - Tenant exists  │
│    - Tenant is active (not suspended/archived)
│    - (For SUPER_ADMIN: skip tenant check)
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 3. Set tenant context│
│    - AsyncLocalStorage.set({ tenantId, userId, requestId })
│    - SET app.current_tenant_id = 'uuid' (PostgreSQL)
│                      │
│    Available everywhere in request lifecycle:
│    getCurrentTenant() → tenantId
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 4. Tenant-scoped     │
│    repository queries │
│    - WHERE tenant_id = $1  (Prisma)
│    - RLS policy enforces  (PostgreSQL)
└─────────────────────┘
```

### Implementation (AsyncLocalStorage)

```typescript
// shared/tenant/tenant.context.ts
import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  tenantId: string;
  userId: string;
  requestId: string;
  role: string;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function setTenantContext(ctx: TenantContext) {
  tenantStorage.enterWith(ctx);
}

export function getCurrentTenant(): string {
  const ctx = tenantStorage.getStore();
  if (!ctx?.tenantId) {
    throw new Error('Tenant context not available');
  }
  return ctx.tenantId;
}

export function getCurrentUser(): { userId: string; role: string } {
  const ctx = tenantStorage.getStore();
  if (!ctx) throw new Error('Tenant context not available');
  return { userId: ctx.userId, role: ctx.role };
}
```

### Middleware

```typescript
// shared/tenant/tenant.middleware.ts
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant
    const tenantId = req.params.tenantId || req.user?.tenant;
    
    if (!tenantId) {
      throw new UnauthorizedError('Tenant context required');
    }
    
    // Validate (skip for super admin on cross-tenant ops)
    if (req.user?.role !== 'SUPER_ADMIN') {
      if (req.params.tenantId !== req.user?.tenant) {
        throw new ForbiddenError('TENANT_ACCESS_DENIED');
      }
    }
    
    // Set context
    setTenantContext({
      tenantId,
      userId: req.user?.sub,
      requestId: req.id,
      role: req.user?.role,
    });
    
    next();
  }
}
```

---

## 7.4 Configuration-Driven Design

### Principle

**NO hardcoded business rules.** Everything configurable per tenant via database.

### TenantConfig Table

```prisma
model TenantConfig {
  id         String   @id @default(uuid())
  tenant_id  String
  key        String                    // 'attendance.minimum_rate'
  value      Json                      // 0.75
  type       String   @default("string") // string, number, boolean, json
  description String?
  
  tenant Tenant @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  
  @@unique([tenant_id, key])
  @@index([tenant_id])
}
```

### TenantFeature Table (Feature Flags)

```prisma
model TenantFeature {
  id          String   @id @default(uuid())
  tenant_id   String
  feature_key String                    // 'ai_homework_generator'
  enabled     Boolean  @default(false)
  config      Json?                     // Feature-specific config
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  
  tenant Tenant @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  
  @@unique([tenant_id, feature_key])
  @@index([tenant_id])
}
```

### Configuration Service

```typescript
// shared/tenant/configuration.service.ts
@Injectable()
export class ConfigurationService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService  // Redis
  ) {}
  
  async get<T>(key: string, defaultValue?: T): Promise<T> {
    const tenantId = getCurrentTenant();
    const cacheKey = `config:${tenantId}:${key}`;
    
    // Check cache
    const cached = await this.cache.get<T>(cacheKey);
    if (cached !== null) return cached;
    
    // Check database
    const config = await this.prisma.tenantConfig.findUnique({
      where: { tenant_id_key: { tenant_id: tenantId, key } }
    });
    
    const value = (config?.value as T) ?? defaultValue ?? this.getDefault(key);
    
    // Cache for 5 minutes
    await this.cache.set(cacheKey, value, 300);
    
    return value as T;
  }
  
  async isFeatureEnabled(feature: string): Promise<boolean> {
    const tenantId = getCurrentTenant();
    const cacheKey = `feature:${tenantId}:${feature}`;
    
    const cached = await this.cache.get<boolean>(cacheKey);
    if (cached !== null) return cached;
    
    const feat = await this.prisma.tenantFeature.findUnique({
      where: { tenant_id_feature_key: { tenant_id: tenantId, feature_key: feature } }
    });
    
    const enabled = feat?.enabled ?? false;
    await this.cache.set(cacheKey, enabled, 300);
    
    return enabled;
  }
  
  private getDefault(key: string): any {
    // Fallback default values
    const defaults: Record<string, any> = {
      'attendance.minimum_rate': 0.75,
      'attendance.max_leave_days': 15,
      'homework.late_submission_days': 3,
      'homework.late_penalty_percent': 10,
      'exam.pass_percentage': 35,
      'limits.max_students_per_class': 60,
      'limits.max_file_upload_mb': 25,
    };
    return defaults[key];
  }
}
```

### Usage in Business Logic

```typescript
// modules/attendance/attendance.service.ts
@Injectable()
export class AttendanceService {
  constructor(private config: ConfigurationService) {}
  
  async checkLowAttendance(studentId: string): Promise<RiskLevel> {
    const threshold = await this.config.get<number>('attendance.minimum_rate');
    const attendanceRate = await this.calculateRate(studentId);
    
    if (attendanceRate < threshold) {
      return RiskLevel.RED;
    }
    if (attendanceRate < threshold + 0.05) {
      return RiskLevel.YELLOW;
    }
    return RiskLevel.GREEN;
  }
}
```

---

## 7.5 Tenant Onboarding

### Flow

```
1. SUPER_ADMIN creates Tenant
   POST /api/v1/tenants
   { name: "Green Valley School", slug: "green-valley", plan: "premium" }
   
2. System creates:
   - Tenant record
   - Default configuration (from template)
   - Default feature flags (based on plan)
   - Admin user account
   
3. Frontend deployment provisioned:
   - Build Next.js with tenant slug
   - Deploy to Vercel / AWS Amplify
   - Configure custom domain
   
4. Admin configures school:
   - Subjects, Classes, Sections
   - Teachers, Students, Parents
   - Attendance mode per grade
   - Grading policies
   
5. Go live
```

### Default Configuration Template

```typescript
const DEFAULT_TENANT_CONFIG: Record<string, any> = {
  'branding.school_name': '',                    // Filled during onboarding
  'branding.primary_color': '#3B82F6',           // Default blue
  'branding.secondary_color': '#10B981',          // Default green
  
  'features.subject_wise_attendance': false,      // Daily (homeroom) by default
  'features.ai_homework_generator': false,        // Premium feature
  'features.parent_telegram_chatbot': false,      // Premium feature
  'features.biometric_attendance': false,          // Enterprise feature
  
  'attendance.minimum_rate': 0.75,
  'attendance.max_leave_days': 15,
  
  'homework.late_submission_days': 3,
  'homework.late_penalty_percent': 10,
  
  'exam.pass_percentage': 35,
  
  'limits.max_students_per_class': 60,
  'limits.max_file_upload_mb': 25,
  'limits.max_notifications_per_day': 5,
};
```

---

## 7.6 Tenant Isolation Enforcement

### Testing Mandate

**Every integration test suite MUST include these tests:**

```typescript
describe('Tenant Isolation', () => {
  let tenantA: Tenant;
  let tenantB: Tenant;
  let userA: User;
  let userB: User;
  
  beforeAll(async () => {
    tenantA = await createTestTenant('school-a');
    tenantB = await createTestTenant('school-b');
    userA = await createTestUser(tenantA.id, Role.TEACHER);
    userB = await createTestUser(tenantB.id, Role.TEACHER);
  });
  
  it('prevents cross-tenant resource access', async () => {
    // Create resource in tenant A
    const resource = await createResource(tenantA.id);
    
    // User from tenant B tries to access it
    const response = await request(app)
      .get(`/api/v1/${tenantB.id}/resource/${resource.id}`)
      .auth(getToken(userB), { type: 'bearer' });
    
    expect(response.status).toBe(404); // Not found (not 403, to avoid leaking existence)
  });
  
  it('prevents cross-tenant resource listing', async () => {
    // Create resources in both tenants
    await createResource(tenantA.id);
    await createResource(tenantB.id);
    
    // User A lists — should only see tenant A's resources
    const response = await request(app)
      .get(`/api/v1/${tenantA.id}/resource`)
      .auth(getToken(userA), { type: 'bearer' });
    
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].tenant_id).toBe(tenantA.id);
  });
  
  it('prevents user from accessing another tenant URL', async () => {
    // User A tries to use tenant B's URL
    const response = await request(app)
      .get(`/api/v1/${tenantB.id}/resource`)
      .auth(getToken(userA), { type: 'bearer' });
    
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('TENANT_ACCESS_DENIED');
  });
});
```

### PostgreSQL Row-Level Security

```sql
-- Enable RLS on every table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
-- ... all tables

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation ON attendance
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Set tenant context at transaction start
-- Prisma middleware:
prisma.$use(async (params, next) => {
  const tenantId = getCurrentTenant();
  await prisma.$executeRawUnsafe(
    `SET LOCAL app.current_tenant_id = '${tenantId}'`
  );
  return next(params);
});
```

---

## 7.7 Tenant Data Export & Deletion

### Export (Tenant Offboarding / Migration)

```typescript
// POST /api/v1/tenants/{tenantId}/export
async exportTenantData(tenantId: string): Promise<ExportResult> {
  // Export all tenant data as JSON/CSV
  const models = ['User', 'Student', 'Staff', 'Attendance', 'Homework', ...];
  const exportData: Record<string, any[]> = {};
  
  for (const model of models) {
    exportData[model] = await this.prisma[model].findMany({
      where: { tenant_id: tenantId, deleted_at: null }
    });
  }
  
  // Upload to S3, return signed download URL
  const exportUrl = await this.storage.uploadExport(tenantId, exportData);
  return { downloadUrl: exportUrl, expiresAt: addDays(new Date(), 7) };
}
```

### Deletion (GDPR Compliance)

```typescript
// DELETE /api/v1/tenants/{tenantId}
async deleteTenant(tenantId: string): Promise<void> {
  // Soft-delete first (30-day grace period)
  await this.prisma.tenant.update({
    where: { id: tenantId },
    data: { status: 'archived', deleted_at: new Date() }
  });
  
  // After 30 days, hard delete all data
  // (Handled by scheduled job)
}
```

---

> **Next:** See [`08-api-contracts.md`](./08-api-contracts.md) for detailed API contracts.
