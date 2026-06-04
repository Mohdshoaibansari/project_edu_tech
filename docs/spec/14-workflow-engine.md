# 14. Workflow Engine Design

> **Status:** Draft — Pre-Implementation  
> **Purpose:** Configurable state machine for approval chains, multi-step processes, and school-specific workflows.

---

## 14.1 Problem

Current workflows are hardcoded:

| Workflow | Hardcoded As | Fails For |
|----------|-------------|-----------|
| Leave Approval | `Teacher → Principal` in code | School B: `Teacher → Coordinator → Principal` |
| Attendance Correction | `Request → Approve/Reject` in code | School C: `Teacher self-correct (< 24h) OR → Principal` |
| Homework Approval | Not modeled | School D: `Teacher → HOD → Principal` |
| Admissions | Not modeled | Multi-step: `Application → Document Verification → Interview → Approval` |
| Student Transfer | Not modeled | `Teacher → Both Principals → Admin` |

---

## 14.2 Solution: Lightweight Workflow Engine

A **configurable state machine per workflow type, per tenant.**

Each workflow definition specifies:
- **States** — what stages exist
- **Transitions** — what moves between states
- **Actors** — who can trigger each transition
- **Conditions** — when transitions are allowed
- **Actions** — side effects on transitions (notify, log, update)

---

## 14.3 Database Design

### Workflow Definition

```sql
CREATE TABLE workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code VARCHAR(100) NOT NULL,                     -- 'leave_approval', 'attendance_correction', 'admission'
  name VARCHAR(200) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, code, version)
);
```

### Workflow States

```sql
CREATE TABLE workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id),
  code VARCHAR(50) NOT NULL,                      -- 'PENDING', 'WITH_TEACHER', 'APPROVED', 'REJECTED'
  name VARCHAR(100) NOT NULL,
  is_initial BOOLEAN DEFAULT false,               -- Starting state
  is_final BOOLEAN DEFAULT false,                 -- Terminal state (APPROVED, REJECTED, CANCELLED)
  color VARCHAR(20),                              -- #F59E0B for pending, #10B981 for approved
  metadata JSONB,                                 -- UI hints, timeout rules
  
  UNIQUE(workflow_id, code)
);
```

### Workflow Transitions

```sql
CREATE TABLE workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id),
  from_state_id UUID NOT NULL REFERENCES workflow_states(id),
  to_state_id UUID NOT NULL REFERENCES workflow_states(id),
  name VARCHAR(100) NOT NULL,                     -- 'Approve', 'Reject', 'Send to Coordinator'
  actor_roles JSONB NOT NULL,                     -- ['TEACHER', 'PRINCIPAL', 'COORDINATOR']
  actor_type VARCHAR(50) DEFAULT 'role',          -- 'role', 'specific_user', 'relationship', 'dynamic'
  conditions JSONB,                               -- Conditions for this transition
  actions JSONB,                                  -- Side effects (notify, log, update fields)
  sort_order INTEGER DEFAULT 0,
  
  UNIQUE(workflow_id, from_state_id, to_state_id)
);
```

### Workflow Instance (Runtime)

```sql
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  workflow_code VARCHAR(100) NOT NULL,            -- 'leave_approval'
  entity_type VARCHAR(50) NOT NULL,               -- 'LeaveRequest', 'AttendanceCorrection'
  entity_id UUID NOT NULL,                         -- The specific leave request / correction
  current_state_id UUID NOT NULL REFERENCES workflow_states(id),
  context JSONB,                                   -- { leave_days: 5, student_id: ..., ... }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(tenant_id, entity_type, entity_id)
);

CREATE TABLE workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES workflow_instances(id),
  transition_id UUID NOT NULL REFERENCES workflow_transitions(id),
  actor_id UUID REFERENCES users(id),
  from_state_code VARCHAR(50),
  to_state_code VARCHAR(50),
  comment TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 14.4 Workflow Definition Examples

### 14.4.1 Leave Approval — School A (Teacher → Principal)

```json
{
  "code": "leave_approval",
  "states": [
    { "code": "PENDING", "name": "Pending", "is_initial": true },
    { "code": "WITH_TEACHER", "name": "With Class Teacher" },
    { "code": "WITH_PRINCIPAL", "name": "With Principal" },
    { "code": "APPROVED", "name": "Approved", "is_final": true },
    { "code": "REJECTED", "name": "Rejected", "is_final": true },
    { "code": "CANCELLED", "name": "Cancelled", "is_final": true }
  ],
  "transitions": [
    { "from": "PENDING", "to": "WITH_TEACHER", "name": "Submit", "actor": "PARENT" },
    { "from": "WITH_TEACHER", "to": "WITH_PRINCIPAL", "name": "Forward to Principal", "actor": "TEACHER" },
    { "from": "WITH_PRINCIPAL", "to": "APPROVED", "name": "Approve", "actor": "PRINCIPAL", "actions": ["notify_parent", "update_leave_status"] },
    { "from": "WITH_TEACHER", "to": "REJECTED", "name": "Reject", "actor": "TEACHER", "actions": ["notify_parent"] },
    { "from": "WITH_PRINCIPAL", "to": "REJECTED", "name": "Reject", "actor": "PRINCIPAL", "actions": ["notify_parent"] },
    { "from": "*", "to": "CANCELLED", "name": "Cancel", "actor": "PARENT", "condition": "state != 'APPROVED' AND state != 'REJECTED'" }
  ]
}
```

### 14.4.2 Leave Approval — School B (Teacher → Coordinator → Principal)

```json
{
  "states": [
    { "code": "PENDING" },
    { "code": "WITH_TEACHER" },
    { "code": "WITH_COORDINATOR" },
    { "code": "WITH_PRINCIPAL" },
    { "code": "APPROVED", "is_final": true },
    { "code": "REJECTED", "is_final": true },
    { "code": "CANCELLED", "is_final": true }
  ],
  "transitions": [
    { "from": "PENDING", "to": "WITH_TEACHER", "name": "Submit", "actor": "PARENT" },
    { "from": "WITH_TEACHER", "to": "WITH_COORDINATOR", "name": "Forward", "actor": "TEACHER" },
    { "from": "WITH_COORDINATOR", "to": "WITH_PRINCIPAL", "name": "Forward", "actor": "COORDINATOR" },
    { "from": "WITH_PRINCIPAL", "to": "APPROVED", "name": "Approve", "actor": "PRINCIPAL" },
    { "from": "WITH_COORDINATOR", "to": "REJECTED", "name": "Reject", "actor": "COORDINATOR" },
    { "from": "WITH_PRINCIPAL", "to": "REJECTED", "name": "Reject", "actor": "PRINCIPAL" }
    // Notice: Teacher CANNOT reject directly — must forward to Coordinator
  ]
}
```

### 14.4.3 Leave Approval — Conditional (Skip Coordinator for ≤ 3 days)

```json
{
  "transitions": [
    { "from": "PENDING", "to": "WITH_TEACHER", "name": "Submit", "actor": "PARENT" },
    {
      "from": "WITH_TEACHER",
      "to": "WITH_PRINCIPAL",
      "name": "Forward to Principal",
      "actor": "TEACHER",
      "condition": "context.leave_days <= 3"    // Short leave: skip coordinator
    },
    {
      "from": "WITH_TEACHER",
      "to": "WITH_COORDINATOR",
      "name": "Forward to Coordinator",
      "actor": "TEACHER",
      "condition": "context.leave_days > 3"     // Long leave: include coordinator
    }
  ]
}
```

---

## 14.5 Workflow Engine Implementation

```typescript
@Injectable()
export class WorkflowEngine {
  constructor(
    private prisma: PrismaService,
    private eventBus: EventBus,
    private cache: CacheService
  ) {}
  
  /**
   * Start a new workflow instance
   */
  async startWorkflow(
    tenantId: string,
    workflowCode: string,
    entityType: string,
    entityId: string,
    context: Record<string, any>,
    actorId: string
  ): Promise<WorkflowInstance> {
    // 1. Load workflow definition
    const workflow = await this.getDefinition(tenantId, workflowCode);
    
    // 2. Find initial state
    const initialState = workflow.states.find(s => s.is_initial);
    if (!initialState) throw new Error(`No initial state in workflow '${workflowCode}'`);
    
    // 3. Create instance
    const instance = await this.prisma.workflow_instances.create({
      data: {
        tenant_id: tenantId,
        workflow_code: workflowCode,
        entity_type: entityType,
        entity_id: entityId,
        current_state_id: initialState.id,
        context
      }
    });
    
    // 4. Emit event
    await this.eventBus.emit('workflow.started', { tenantId, workflowCode, instance });
    
    return instance;
  }
  
  /**
   * Execute a transition
   */
  async transition(
    instanceId: string,
    transitionCode: string,   // 'to:APPROVED'
    actorId: string,
    comment?: string
  ): Promise<WorkflowHistory> {
    // 1. Load instance + current state
    const instance = await this.prisma.workflow_instances.findUnique({ 
      where: { id: instanceId },
      include: { current_state: true }
    });
    
    // 2. Load valid transitions from current state
    const workflow = await this.getDefinition(instance.tenant_id, instance.workflow_code);
    const transition = workflow.transitions.find(
      t => t.from_state_id === instance.current_state_id && t.name === transitionCode
    );
    
    if (!transition) {
      throw new Error(`Invalid transition '${transitionCode}' from state '${instance.current_state.code}'`);
    }
    
    // 3. Check actor authorization
    const actor = await this.getActor(actorId);
    await this.authorizeTransition(transition, actor, instance);
    
    // 4. Check conditions
    if (transition.conditions) {
      const conditionMet = await this.evaluateConditions(transition.conditions, instance);
      if (!conditionMet) {
        throw new Error(`Transition conditions not met`);
      }
    }
    
    // 5. Execute transition
    const toState = workflow.states.find(s => s.id === transition.to_state_id);
    
    await this.prisma.workflow_instances.update({
      where: { id: instanceId },
      data: { current_state_id: toState.id }
    });
    
    // 6. Record history
    const history = await this.prisma.workflow_history.create({
      data: {
        instance_id: instanceId,
        transition_id: transition.id,
        actor_id: actorId,
        from_state_code: instance.current_state.code,
        to_state_code: toState.code,
        comment
      }
    });
    
    // 7. Execute side-effect actions
    for (const action of (transition.actions || [])) {
      await this.executeAction(action, instance, actor);
    }
    
    // 8. Emit event
    await this.eventBus.emit('workflow.transitioned', {
      tenantId: instance.tenant_id,
      workflowCode: instance.workflow_code,
      from: instance.current_state.code,
      to: toState.code,
      instance
    });
    
    return history;
  }
  
  /**
   * Get available transitions for the current user
   */
  async getAvailableTransitions(instanceId: string, actorId: string): Promise<WorkflowTransition[]> {
    const instance = await this.prisma.workflow_instances.findUnique({ where: { id: instanceId } });
    const workflow = await this.getDefinition(instance.tenant_id, instance.workflow_code);
    const actor = await this.getActor(actorId);
    
    return workflow.transitions
      .filter(t => t.from_state_id === instance.current_state_id)
      .filter(t => this.isActorAuthorized(t, actor, instance))
      .filter(t => this.evaluateConditions(t.conditions, instance));
  }
  
  private async authorizeTransition(transition, actor, instance) {
    const roles = transition.actor_roles;
    if (!roles.includes(actor.role)) {
      throw new ForbiddenError(`Actor role '${actor.role}' not authorized for this transition`);
    }
    // Additional checks: specific_user → actor.id must match, relationship → check DB, etc.
  }
}
```

---

## 14.6 Service Integration

```typescript
@Injectable()
export class LeaveService {
  constructor(private workflowEngine: WorkflowEngine) {}
  
  async applyLeave(tenantId: string, dto: ApplyLeaveDTO): Promise<LeaveRequest> {
    // 1. Create leave request in DB
    const leave = await this.prisma.leave_requests.create({ data: { ... } });
    
    // 2. Start workflow
    await this.workflowEngine.startWorkflow(
      tenantId,
      'leave_approval',
      'LeaveRequest',
      leave.id,
      { leave_days: dto.days, student_id: dto.student_id },
      dto.parent_id
    );
    
    return leave;
  }
  
  async approveLeave(leaveId: string, actorId: string, comment?: string) {
    await this.workflowEngine.transition(
      await this.getWorkflowInstanceId(leaveId),
      'Forward to Principal',  // or 'Approve' depending on current state
      actorId,
      comment
    );
  }
  
  async getLeaveStatus(leaveId: string): Promise<WorkflowStatus> {
    const instance = await this.prisma.workflow_instances.findFirst({
      where: { entity_type: 'LeaveRequest', entity_id: leaveId }
    });
    
    const history = await this.prisma.workflow_history.findMany({
      where: { instance_id: instance.id },
      orderBy: { created_at: 'asc' }
    });
    
    return {
      currentState: instance.current_state.code,
      history: history.map(h => ({
        from: h.from_state_code,
        to: h.to_state_code,
        actor: h.actor_id,
        comment: h.comment,
        timestamp: h.created_at
      }))
    };
  }
}
```

---

## 14.7 Workflow Administration UI

```
┌──────────────────────────────────────────────────────────────┐
│  🔄 Workflow Designer                                         │
│                                                               │
│  Workflow: Leave Approval    [School A: Standard]             │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │   ┌──────────┐    Submit     ┌──────────┐               │ │
│  │   │ PENDING  │──────────────▶│  WITH    │               │ │
│  │   │ (Start)  │   (Parent)    │ TEACHER  │               │ │
│  │   └──────────┘               └────┬─────┘               │ │
│  │                                   │                      │ │
│  │                  ┌────────────────┼────────────────┐     │ │
│  │                  │ Forward        │ Reject          │     │ │
│  │                  │ (Teacher)      │ (Teacher)       │     │ │
│  │                  ▼                ▼                 │     │ │
│  │          ┌──────────────┐  ┌──────────┐            │     │ │
│  │          │ WITH         │  │ REJECTED │            │     │ │
│  │          │ PRINCIPAL    │  │ (End)    │            │     │ │
│  │          └──────┬───────┘  └──────────┘            │     │ │
│  │                 │                                   │     │ │
│  │          ┌──────┼──────┐                            │     │ │
│  │    Approve│      │Reject│                           │     │ │
│  │ (Principal)│    │(Principal)                        │     │ │
│  │          ▼      ▼                                   │     │ │
│  │   ┌──────────┐ ┌──────────┐                         │     │ │
│  │   │ APPROVED │ │ REJECTED │                         │     │ │
│  │   │ (End)    │ │ (End)    │                         │     │ │
│  │   └──────────┘ └──────────┘                         │     │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [+ Add State]  [+ Add Transition]  [Validate]  [Publish]    │
└──────────────────────────────────────────────────────────────┘
```

---

## 14.8 Actor Resolution

### Actor Types

| Type | Description | Example |
|------|-------------|---------|
| `role` | Any user with this role | `TEACHER` — any teacher can approve |
| `specific_user` | Exact user ID | The specific class teacher (from relationship) |
| `relationship` | User with a relationship to entity | `student.class.teacher_id` or `section.class_teacher_id` |
| `dynamic` | Resolved at runtime by function | `resolveCoordinatorForGrade(grade)` |
| `any_admin` | Any user with ADMIN or PRINCIPAL role | Fallback for escalation |

### Resolution Implementation

```typescript
async resolveActor(transition: WorkflowTransition, context: any): Promise<string[]> {
  switch (transition.actor_type) {
    case 'role':
      // Return all users with that role in this tenant (or specific scope)
      return this.getUsersByRole(context.tenantId, transition.actor_roles);
    
    case 'relationship':
      // Look up relationship from entity
      const entity = await this.loadEntity(context.entityType, context.entityId);
      return this.resolveRelationship(entity, transition.actor_roles[0]);
    
    case 'dynamic':
      // Call registered resolver function
      return this.dynamicResolvers.get(transition.actor_resolver)(context);
    
    default:
      return [];
  }
}
```

---

> **Next:** See [`15-metadata-engine.md`](./15-metadata-engine.md) for the Metadata Engine design.
