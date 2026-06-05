# Leave Module

## Purpose
Workflow-driven leave management. Leave types are tenant-defined. Approvals route through WorkflowEngine, enabling per-school configurable approval chains.

## Business Rules
- **Leave types** are tenant-defined (Sick, Casual, Emergency, Maternity) with max_days and document requirements
- **Approval workflow** — School A: 2-step (Teacher→Principal), School B: 3-step (Teacher→Coordinator→Principal), School C: conditional (≤3 days skips Coordinator)
- **Application** — Creates leave record + starts workflow instance. Links via `workflow_instance_id`
- **Actions** — Approve/Reject transitions executed by WorkflowEngine. Updates leave status on approval
- **Events emitted** — `leave.applied`, `leave.approved`, `workflow.transitioned`

## Dependencies
| Service | Purpose |
|---------|---------|
| `PrismaService` | Leave request CRUD |
| `ConfigurationEngine` | Valid leave types per tenant |
| `WorkflowEngine` | Approval chain execution |
| `EventBus` | Domain events |

## Endpoints
```
POST   /leaves                    # Apply leave (starts workflow)
GET    /leaves?page=&student_id=&status=  # List (paginated)
GET    /leaves/:id                # Get with workflow transitions
POST   /leaves/:id/action         # Approve/Reject (workflow transition)
```
