# Attendance Module

## Purpose
Config-driven attendance management. Statuses, marking, calculation, and corrections are all driven by ConfigurationEngine, RulesEngine, and WorkflowEngine — nothing is hardcoded.

## Business Rules
- **Statuses are tenant-defined** — ConfigEngine loads valid status codes per school (e.g., Present/Absent/Late vs Present/Absent/Half-Day/Medical)
- **Marking** — Batch upsert per class/date. Validates status against tenant's configured codes
- **Calculation** — Delegates to RulesEngine (`attendance.calculate_rate`). Fallback: weighted average
- **Corrections** — Workflow-driven (Teacher requests → Principal approves/rejects). Approved corrections update the attendance record
- **Events emitted** — `attendance.marked`, `attendance.corrected`

## Dependencies
| Service | Purpose |
|---------|---------|
| `PrismaService` | Attendance record CRUD |
| `ConfigurationEngine` | Load tenant's valid status codes |
| `RulesEngine` | Attendance rate calculation |
| `WorkflowEngine` | Correction request approval workflow |
| `EventBus` | Emit domain events for notifications |

## Endpoints
```
GET    /attendance/statuses                  # Tenant's valid status codes
POST   /attendance/mark                      # Batch mark attendance
GET    /attendance/students/:studentId       # Student history (paginated)
GET    /attendance/class/:classId/date/:date # Roll-call view
GET    /attendance/calculate-rate            # RulesEngine-driven rate
POST   /attendance/corrections               # Request correction (starts workflow)
GET    /attendance/corrections               # List pending corrections
POST   /attendance/corrections/:id/action    # Approve/Reject correction
```
