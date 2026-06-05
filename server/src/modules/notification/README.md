# Notification Module

## Purpose
Event-driven notification system. Listens to domain events from all modules and delivers in-app notifications. Multi-channel support (email, SMS, push) is stubbed for Phase 3.

## Business Rules
- **Event-driven** — Subscribes to `attendance.marked`, `homework.assigned`, `homework.graded`, `leave.applied`, `student.risk_flagged`
- **In-app delivery** — Notifications stored in DB, retrievable via inbox API
- **Mark read** — Individual or bulk mark-as-read
- **Multi-channel** — Channel field supports `in_app`, `email`, `sms`, `push` (email/SMS/push providers stubbed)

## Dependencies
| Service | Purpose |
|---------|---------|
| `PrismaService` | Notification CRUD |
| `EventBus` (@OnEvent) | Domain event subscription |

## Endpoints
```
GET    /notifications/inbox?page=&is_read=  # Paginated inbox
POST   /notifications/inbox/:id/read         # Mark one as read
POST   /notifications/inbox/read-all         # Mark all as read
```
