# 5. Frontend Specification

> **Spec ID:** SPEC-FRONTEND-001  
> **Status:** Approved  
> **Author:** Architecture & Engineering Team  
> **Created:** 2026-06-05  
> **Last Updated:** 2026-06-05  
> **Related PRD Requirements:** All frontend-facing modules (AT-*, HW-*, EX-*, LV-*, DR-*, AD-*)

---

## Summary

Frontend implementation specification for EduTech. Per-tenant Next.js deployments consume shared backend APIs, dynamically adapt UI to each school's configuration (statuses, grading, workflows), and follow strict conventions for AI-agent friendly development, state management, and performance.

> **Development standards** (module structure, state management, API layer isolation, DTO mapping, generated types, UX states, offline, component libraries, performance, auth patterns): See [`01-prd.md` §1.8 — Frontend Development Standards](./01-prd.md).

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x (strict) |
| Styling | Tailwind CSS | 3.4 |
| UI Library | shadcn/ui (Radix primitives) | Latest |
| Icons | Lucide React | Latest |
| Charts | Recharts | 2.x |
| Server State | TanStack Query | 5.x |
| UI State | Zustand | 4.x |
| Forms | React Hook Form + Zod | Latest |
| API Client | OpenAPI Generator → TypeScript | Latest |
| Tables | TanStack Table | 8.x |
| Animation | tailwindcss-animate | Latest |

---

## Per-Client Customization Strategy

### Architecture

Each client (school) gets a **separate Next.js deployment** configured with tenant-specific settings at build time and runtime.

```
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND CUSTOMIZATION LAYERS                    │
│                                                               │
│  Layer 1: Build-time config (next.config.js)                 │
│    - Tenant slug                                              │
│    - API base URL                                             │
│    - Default locale                                           │
│                                                               │
│  Layer 2: Runtime config (fetch from API on boot)            │
│    - Branding (logo, colors, school name)                    │
│    - Features (which modules/features are enabled)            │
│    - Business rules (thresholds, limits — for UI messaging)   │
│    - i18n strings (per-tenant labels)                         │
│                                                               │
│  Layer 3: Static assets (public/tenants/{slug}/)              │
│    - Logo, favicon, splash screen                             │
│                                                               │
│  Layer 4: Feature flags (TenantFeature table)                 │
│    - Show/hide modules, features, UI elements                 │
└─────────────────────────────────────────────────────────────┘
```

### Build-Time Configuration

```typescript
// next.config.js
const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

module.exports = {
  publicRuntimeConfig: {
    tenantSlug: TENANT_SLUG,
    apiBaseUrl: API_BASE_URL,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.edutech.com' }
    ]
  }
};
```

### Runtime Configuration Bootstrap

```typescript
// services/tenant-config.service.ts
class TenantConfigService {
  private config: TenantConfig | null = null;
  
  async bootstrap(tenantSlug: string): Promise<TenantConfig> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantSlug}/config`);
    this.config = await response.json();
    this.applyBranding(this.config.branding);
    this.applyFeatureFlags(this.config.features);
    return this.config;
  }
  
  private applyBranding(branding: BrandingConfig) {
    const root = document.documentElement;
    root.style.setProperty('--primary', branding.primary_color);
    root.style.setProperty('--secondary', branding.secondary_color);
    document.title = branding.school_name;
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) favicon.href = branding.favicon_url;
  }
  
  getFeature(feature: string): boolean {
    return this.config?.features?.[feature] ?? false;
  }
}
```

### CSS Custom Properties (Branding)

```css
/* globals.css */
@layer base {
  :root {
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --school-name: "EduTech";
  }
}
```

---

## Dynamic Config-Driven UI ⭐

> **Principle:** No hardcoded statuses, grades, or workflow steps in the UI. Everything is rendered from the tenant configuration fetched at runtime.

### Dynamic Attendance Status Toggles

```typescript
// modules/attendance/components/RollCallGrid.tsx
export function RollCallGrid({ classId, date }: Props) {
  const { data: statusConfig } = useAttendanceStatuses();
  const { data: records } = useAttendance(classId, date);
  
  // School A: [{ code: 'PRESENT', color: '#10B981', ... }, { code: 'ABSENT', ... }, { code: 'LATE', ... }]
  // School B: [{ ... }, { code: 'HALF_DAY', ... }, { code: 'MEDICAL_LEAVE', ... }]
  const statuses = statusConfig?.statuses ?? [];
  
  return (
    <div className="grid gap-1">
      {records?.map(record => (
        <RollCallRow key={record.student_id}>
          <span>{record.student_name}</span>
          <div className="flex gap-1">
            {statuses.map(status => (
              <StatusToggle
                key={status.code}
                active={record.status_code === status.code}
                color={status.color}
                icon={status.icon}
                label={status.label.en}
                onClick={() => markAttendance(record.student_id, status.code)}
              />
            ))}
          </div>
        </RollCallRow>
      ))}
    </div>
  );
}
```

### Dynamic Grade Display

```typescript
// shared/components/data/GradeDisplay.tsx
export function GradeDisplay({ score, maxScore, tenantId }: Props) {
  const { data: gradingScale } = useGradingScale(tenantId);
  
  if (!gradingScale) return <Skeleton />;
  
  switch (gradingScale.type) {
    case 'grade_bands':
      const grade = findGradeBand(score, gradingScale.bands);
      return <Badge style={{ backgroundColor: grade.color }}>{grade.label}</Badge>;
    
    case 'percentage':
      const pct = (score / maxScore) * 100;
      return <div className="flex items-center gap-2"><Progress value={pct} /><span>{pct.toFixed(1)}%</span></div>;
    
    case 'gpa':
      const gpa = calculateGPA(score, gradingScale);
      return <span className="text-2xl font-bold">{gpa.toFixed(1)}</span>;
    
    case 'rubric':
      return <RubricDisplay criteria={gradingScale.criteria} scores={score} />;
    
    default:
      return <span>{score} / {maxScore}</span>;
  }
}
```

### Dynamic Workflow Stepper

```typescript
// shared/components/workflow/WorkflowStepper.tsx
export function WorkflowStepper({ instanceId }: Props) {
  const { data: status } = useWorkflowStatus(instanceId);
  const { data: transitions } = useAvailableTransitions(instanceId);
  
  return (
    <div>
      <ol className="space-y-2">
        {status?.history.map((step, i) => (
          <li key={i} className="flex items-center gap-2">
            <StatusBadge state={step.to_state_code} />
            <span className="text-sm text-muted-foreground">
              by {step.actor_name} — {formatDate(step.timestamp)}
            </span>
            {step.comment && <p className="text-sm italic">{step.comment}</p>}
          </li>
        ))}
      </ol>
      <div className="flex gap-2 mt-4">
        {transitions?.map(t => (
          <Button key={t.id} variant={t.name === 'Reject' ? 'destructive' : 'default'}
            onClick={() => executeTransition(t.name)}>
            {t.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

### Config-Driven Form Generation

```typescript
// shared/forms/DynamicForm.tsx
export function DynamicForm({ formCode, entityId, onSubmit }: Props) {
  const { data: formConfig } = useFormConfig(formCode);
  if (!formConfig) return <Skeleton />;
  
  return (
    <Form {...form}>
      {formConfig.sections.map(section => {
        if (section.visibility_condition && !evaluateCondition(section.visibility_condition, values)) return null;
        return (
          <fieldset key={section.title}>
            <legend>{section.title}</legend>
            {section.fields.map(field => (
              <FormField key={field.field_code} name={field.field_code}
                render={({ field: formField }) => {
                  switch (field.definition?.field_type) {
                    case 'string': return <Input {...formField} />;
                    case 'enum': return (
                      <Select {...formField}>
                        {field.definition.enum_values?.map((ev: any) => (
                          <SelectItem key={ev.value} value={ev.value}>{ev.label.en}</SelectItem>
                        ))}
                      </Select>
                    );
                    case 'date': return <DatePicker {...formField} />;
                    case 'boolean': return <Switch {...formField} />;
                    case 'number': return <Input type="number" {...formField} />;
                    default: return <Input {...formField} />;
                  }
                }}
              />
            ))}
          </fieldset>
        );
      })}
    </Form>
  );
}
```

---

## Shared Design System

### Component Library (shadcn/ui)

```
shared/components/
├── ui/                    # shadcn/ui primitives (auto-generated)
│   ├── button.tsx, card.tsx, dialog.tsx, dropdown-menu.tsx
│   ├── input.tsx, select.tsx, table.tsx, tabs.tsx, toast.tsx
├── layouts/               # Application layouts
│   ├── DashboardLayout.tsx, Sidebar.tsx, Header.tsx
├── feedback/              # Feedback components
│   ├── LoadingSkeleton.tsx, EmptyState.tsx, ErrorState.tsx, ConfirmDialog.tsx
├── data/                  # Data display components
│   ├── DataTable.tsx, MetricCard.tsx, StatusBadge.tsx, ChartContainer.tsx
└── forms/                 # Form framework
    ├── FormField.tsx, FormSelect.tsx, FormDatePicker.tsx, FormFileUpload.tsx
```

### Reusable DataTable Component

```typescript
// shared/components/data/DataTable.tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pagination?: PaginationState;
  sorting?: SortingState;
}
```

---

## Feature Flag Rendering

```typescript
// components/FeatureGate.tsx
export function FeatureGate({ feature, children, fallback = null }: {
  feature: string; children: React.ReactNode; fallback?: React.ReactNode;
}) {
  const isEnabled = useFeatureFlag(feature);
  if (!isEnabled) return fallback;
  return <>{children}</>;
}

export function PermissionGate({ permission, children, fallback = null }: {
  permission: string; children: React.ReactNode; fallback?: React.ReactNode;
}) {
  const hasPermission = usePermission(permission);
  if (!hasPermission) return fallback;
  return <>{children}</>;
}
```

---

## Generated API Client

### Contract-First Approach

1. Backend defines OpenAPI spec
2. CI runs `openapi-generator-cli` → TypeScript client
3. Frontend imports typed functions from `generated/` directory

```typescript
// Generated: shared/api/generated/attendance.ts
export async function getAttendance(tenantId: string, classId: string, date: string): Promise<AttendanceListResponse> { ... }
export async function markAttendance(tenantId: string, body: CreateAttendanceRequest): Promise<AttendanceResponse> { ... }

// Consumption via TanStack Query hook
import { getAttendance } from '@/shared/api/generated/attendance';

export function useAttendance(classId: string, date: string) {
  return useQuery({
    queryKey: ['attendance', classId, date],
    queryFn: () => getAttendance(tenantSlug, classId, date),
  });
}
```

---

## Cross-References

| Topic | Canonical Document |
|-------|-------------------|
| **Frontend Development Standards** (module structure, state management, API layer, DTO mapping, types, UX, offline, performance, auth) | [`01-prd.md` §1.8](./01-prd.md) |
| **Testing Strategy** (unit, integration, E2E) | [`01-prd.md` §1.9a](./01-prd.md) |
| **API Contracts** (per-module endpoints) | [`08-api-contracts.md`](./08-api-contracts.md) |
| **Authentication & Authorization** | [`06-auth-spec.md`](./06-auth-spec.md) |
| **System Architecture** (high-level, deployment) | [`03-architecture.md`](./03-architecture.md) |

---

> **Next:** See [`06-auth-spec.md`](./06-auth-spec.md) for authentication & authorization specification.
