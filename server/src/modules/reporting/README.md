# Reporting Module

## Purpose
Aggregated reports and dashboards across all business modules. Provides attendance summaries, exam results, leave summaries, and a role-aware dashboard overview.

## Business Rules
- **Attendance report** — Grouped by status code, filterable by class/student/date range
- **Exam report** — Exam list with scores, filterable by exam/class/term/student
- **Leave report** — Leave summary, filterable by student/date range
- **Dashboard** — Aggregated stats: active students, today's attendance, pending leaves, active homework

## Dependencies
| Service | Purpose |
|---------|---------|
| `PrismaService` | Aggregation queries across attendance, exams, homework, leave tables |

## Endpoints
```
GET    /reports/dashboard                              # Role-aware dashboard
GET    /reports/attendance?class_id=&student_id=&from=&to=  # Attendance report
GET    /reports/exams?exam_id=&class_id=&term_id=      # Exam report
GET    /reports/leaves?student_id=&from=&to=           # Leave report
```
