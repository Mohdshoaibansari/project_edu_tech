# Homework Module

## Purpose
Config-driven homework management with lifecycle states, RulesEngine-based grading, and AI-powered generation.

## Business Rules
- **Categories** are tenant-defined (Classwork, Homework, Project, Practical)
- **Lifecycle** — DRAFT → SCHEDULED → PUBLISHED → ARCHIVED
- **Submission states** — PENDING → SUBMITTED → GRADED → RETURNED
- **Grading** — Delegates to RulesEngine (`grading.convert_score`). Falls back to score-as-is
- **AI generation** — Stub endpoint returns template questions (Phase 3: real AI)
- **Events emitted** — `homework.assigned`, `homework.submitted`, `homework.graded`

## Dependencies
| Service | Purpose |
|---------|---------|
| `PrismaService` | CRUD |
| `ConfigurationEngine` | Valid homework categories |
| `RulesEngine` | Score → grade conversion |
| `EventBus` | Domain events |

## Endpoints
```
POST   /homework                    # Create homework
GET    /homework?page=&status=      # List (paginated, filterable)
GET    /homework/:id                # Get by ID with submissions
PUT    /homework/:id/status         # Change lifecycle state
POST   /homework/:id/submit         # Student submission
GET    /homework/:id/submissions    # List submissions
PUT    /homework/submissions/:id/grade   # Grade submission
PUT    /homework/submissions/:id/return  # Return to student
POST   /homework/ai-generate        # AI question generation (stub)
```
