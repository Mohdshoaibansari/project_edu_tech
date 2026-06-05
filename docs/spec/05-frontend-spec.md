# 5. Frontend Specification

> **Status:** Draft — Pre-Implementation  
> **Last Updated:** 2026-06-05

---

## 5.1 Technology Stack

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

## 5.2 Per-Client Customization Strategy

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
    // Fetch tenant config from API
    const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantSlug}/config`);
    this.config = await response.json();
    
    // Apply branding
    this.applyBranding(this.config.branding);
    
    // Apply feature flags
    this.applyFeatureFlags(this.config.features);
    
    return this.config;
  }
  
  private applyBranding(branding: BrandingConfig) {
    const root = document.documentElement;
    root.style.setProperty('--primary', branding.primary_color);
    root.style.setProperty('--secondary', branding.secondary_color);
    document.title = branding.school_name;
    
    // Set favicon
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
    /* These get overridden by tenant config */
    --primary: 221.2 83.2% 53.3%;          /* Default blue */
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    
    /* School name for CSS content */
    --school-name: "EduTech";
  }
}
```

---

## 5.3 Dynamic Config-Driven UI ⭐ NEW

### Principle: UI Adapts to Tenant Configuration

**No hardcoded statuses, grades, or workflow steps in the UI.** Everything is rendered from the tenant configuration fetched at runtime.

### Dynamic Attendance Status Toggles

```typescript
// modules/attendance/components/RollCallGrid.tsx
export function RollCallGrid({ classId, date }: Props) {
  // Fetch attendance statuses from Configuration Engine (NOT hardcoded!)
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
            {/* Render toggles dynamically from config */}
            {statuses.map(status => (
              <StatusToggle
                key={status.code}
                active={record.status_code === status.code}
                color={status.color}
                icon={status.icon}           // 'check-circle', 'x-circle', 'clock'
                label={status.label.en}       // i18n-aware
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
    case 'grade_bands':   // School A: Show A+, A, B+ badge
      const grade = findGradeBand(score, gradingScale.bands);
      return (
        <Badge style={{ backgroundColor: grade.color }}>
          {grade.label}
        </Badge>
      );
    
    case 'percentage':    // School B: Show 85% progress bar
      const pct = (score / maxScore) * 100;
      return (
        <div className="flex items-center gap-2">
          <Progress value={pct} />
          <span>{pct.toFixed(1)}%</span>
        </div>
      );
    
    case 'gpa':           // School C: Show 3.7 GPA
      const gpa = calculateGPA(score, gradingScale);
      return <span className="text-2xl font-bold">{gpa.toFixed(1)}</span>;
    
    case 'rubric':         // School D: Show rubric scores
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
  // Fetch workflow status — transitions are tenant-defined, not hardcoded!
  const { data: status } = useWorkflowStatus(instanceId);
  const { data: transitions } = useAvailableTransitions(instanceId);
  
  return (
    <div>
      {/* Render workflow history trail */}
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
      
      {/* Render available actions from Workflow Engine — configurable per school! */}
      <div className="flex gap-2 mt-4">
        {transitions?.map(t => (
          <Button
            key={t.id}
            variant={t.name === 'Reject' ? 'destructive' : 'default'}
            onClick={() => executeTransition(t.name)}
          >
            {t.name}
          </Button>
        ))}
        {/* School A shows: [Approve] [Reject] */}
        {/* School B shows: [Forward to Coordinator] [Reject] */}
        {/* School C shows: [Forward to Principal] [Reject]  (if ≤3 days, coordinator skipped) */}
      </div>
    </div>
  );
}
```

### Config-Driven Form Generation

```typescript
// shared/forms/DynamicForm.tsx
export function DynamicForm({ formCode, entityId, onSubmit }: Props) {
  // Fetch form config from Metadata Engine — layout + fields are tenant-defined!
  const { data: formConfig } = useFormConfig(formCode);
  
  if (!formConfig) return <Skeleton />;
  
  return (
    <Form {...form}>
      {formConfig.sections.map(section => {
        // Check visibility condition
        if (section.visibility_condition && !evaluateCondition(section.visibility_condition, values)) {
          return null;
        }
        
        return (
          <fieldset key={section.title}>
            <legend>{section.title}</legend>
            {section.fields.map(field => (
              <FormField
                key={field.field_code}
                name={field.field_code}
                render={({ field: formField }) => {
                  // Render correct input based on field definition from Metadata Engine
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

## 5.4 Feature Module Structure

Each feature module follows a consistent, AI-agent-friendly structure:

```
modules/attendance/
├── pages/
│   ├── AttendancePage.tsx           # Route-level page component
│   ├── AttendanceHistoryPage.tsx
│   └── AttendanceCorrectionPage.tsx
├── components/
│   ├── RollCallGrid.tsx             # Main attendance grid
│   ├── RollCallRow.tsx              # Individual student row
│   ├── StatusToggle.tsx             # Present/Absent/Tardy toggle
│   ├── CorrectionRequestForm.tsx    # Correction request modal
│   ├── AttendanceSummary.tsx        # Daily summary card
│   └── AttendanceChart.tsx          # Trend chart
├── hooks/
│   ├── useAttendance.ts             # TanStack Query: fetch attendance
│   ├── useMarkAttendance.ts         # TanStack Query: mark mutation
│   └── useAttendanceStats.ts        # TanStack Query: statistics
├── services/
│   └── attendance.api.ts            # Generated API client calls
├── types/
│   └── attendance.types.ts          # Module-specific TypeScript types
└── tests/
    ├── RollCallGrid.test.tsx
    └── useAttendance.test.ts
```

### Module Export Convention

```typescript
// modules/attendance/index.ts — Public API of the module
export { AttendancePage } from './pages/AttendancePage';
export { useAttendance } from './hooks/useAttendance';
export type { AttendanceRecord } from './types/attendance.types';
```

---

## 5.5 Shared Design System

### Component Library (shadcn/ui)

```
shared/components/
├── ui/                    # shadcn/ui primitives (auto-generated)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── toast.tsx
│   └── ...
├── layouts/               # Application layouts
│   ├── DashboardLayout.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── Breadcrumbs.tsx
│   └── Shell.tsx
├── feedback/              # Feedback components
│   ├── LoadingSkeleton.tsx
│   ├── EmptyState.tsx
│   ├── ErrorState.tsx
│   └── ConfirmDialog.tsx
├── data/                  # Data display components
│   ├── DataTable.tsx       # Reusable TanStack Table wrapper
│   ├── DataCard.tsx
│   ├── MetricCard.tsx
│   ├── StatusBadge.tsx
│   └── ChartContainer.tsx
└── forms/                 # Form framework
    ├── FormField.tsx
    ├── FormSelect.tsx
    ├── FormDatePicker.tsx
    └── FormFileUpload.tsx
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
  // ... extensible
}

// Usage in any module
<DataTable
  data={students}
  columns={studentColumns}
  isLoading={isLoading}
  isEmpty={students.length === 0}
  emptyMessage="No students found in this class"
  pagination={pagination}
/>
```

---

## 5.6 State Management

### Server State (TanStack Query)

All data from the backend API is managed by TanStack Query:

```typescript
// hooks/useAttendance.ts
export function useAttendance(classId: string, date: string) {
  return useQuery({
    queryKey: ['attendance', classId, date],
    queryFn: () => attendanceApi.getAttendance(classId, date),
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
}

// Mutation with optimistic update
export function useMarkAttendance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: attendanceApi.markAttendance,
    onMutate: async (newAttendance) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['attendance', newAttendance.classId] });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(['attendance', newAttendance.classId]);
      
      // Optimistically update
      queryClient.setQueryData(['attendance', newAttendance.classId], (old) => 
        old.map(a => a.studentId === newAttendance.studentId 
          ? { ...a, status: newAttendance.status } 
          : a
        )
      );
      
      return { previous };
    },
    onError: (err, newAttendance, context) => {
      // Rollback
      queryClient.setQueryData(['attendance', newAttendance.classId], context.previous);
      toast.error('Failed to mark attendance. Please try again.');
    },
    onSettled: (data, error, variables) => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['attendance', variables.classId] });
    },
  });
}
```

### UI State (Zustand)

Only UI-only state in Zustand — never server data:

```typescript
// store/ui.store.ts
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  notificationsPanelOpen: boolean;
  
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleNotifications: () => void;
}

// store/auth.store.ts (UI state only — actual auth is cookie-based)
interface AuthUIState {
  isAuthenticated: boolean;
  user: User | null;
  permissions: string[];
  tenantConfig: TenantConfig | null;
  
  setUser: (user: User) => void;
  setPermissions: (permissions: string[]) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
  isFeatureEnabled: (feature: string) => boolean;
}
```

---

## 5.7 Feature Flag Rendering

```typescript
// components/FeatureGate.tsx
export function FeatureGate({ 
  feature, 
  children, 
  fallback = null 
}: { 
  feature: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  const isEnabled = useFeatureFlag(feature);
  
  if (!isEnabled) return fallback;
  return <>{children}</>;
}

// Usage
<FeatureGate feature="ai_homework_generator">
  <Button onClick={handleAIGenerate}>
    <SparklesIcon /> AI Generate Homework
  </Button>
</FeatureGate>
```

### Permission-Based UI (UX Only — Backend Enforces)

```typescript
export function PermissionGate({
  permission,
  children,
  fallback = null
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasPermission = usePermission(permission);
  
  if (!hasPermission) return fallback;
  return <>{children}</>;
}
```

---

## 5.8 Generated API Client

### Contract-First Approach

1. Backend team writes OpenAPI spec
2. CI runs `openapi-generator-cli` to generate TypeScript client
3. Frontend imports typed functions

```typescript
// Generated: shared/api/generated/attendance.ts
export async function getAttendance(
  tenantId: string,
  classId: string,
  date: string,
  options?: RequestOptions
): Promise<AttendanceListResponse> { ... }

export async function markAttendance(
  tenantId: string,
  body: CreateAttendanceRequest,
  options?: RequestOptions
): Promise<AttendanceResponse> { ... }
```

### Consumption

```typescript
// modules/attendance/hooks/useAttendance.ts
import { getAttendance } from '@/shared/api/generated/attendance';

export function useAttendance(classId: string, date: string) {
  const { tenantSlug } = useTenant();
  
  return useQuery({
    queryKey: ['attendance', classId, date],
    queryFn: () => getAttendance(tenantSlug, classId, date),
  });
}
```

---

## 5.9 States Every Component Must Handle

| State | Visual | Implementation |
|-------|--------|---------------|
| **Loading** | Skeleton | `if (isLoading) return <LoadingSkeleton />` |
| **Empty** | Illustration + message + CTA | `if (!data?.length) return <EmptyState />` |
| **Error** | Error card + retry button | `if (error) return <ErrorState onRetry={refetch} />` |
| **Success** | Populated UI | Render data |
| **Optimistic** | Immediate UI feedback | TanStack Query `onMutate` |
| **Offline** | Banner + queued indicator | Check `navigator.onLine` |

---

## 5.10 Accessibility Standards

- Semantic HTML: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`
- All form inputs have associated `<label>`
- Icon-only buttons have `aria-label`
- Modals trap focus and close on Escape
- Color contrast ≥ 4.5:1 (tested with axe DevTools)
- Keyboard navigation: Tab order is logical, Enter/Space for actions
- Screen reader: `aria-live` regions for dynamic content

---

## 5.11 Performance Standards

- Route-level code splitting (Next.js automatic)
- Images: `next/image` with lazy loading, WebP format
- Lists > 50 items: use `react-virtuoso` or TanStack Virtual
- `useMemo` / `useCallback` on expensive computations
- `React.memo` on pure presentational components
- Lighthouse target: Performance ≥ 90

---

> **Next:** See [`06-auth-spec.md`](./06-auth-spec.md) for authentication & authorization specification.
