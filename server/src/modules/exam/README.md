# Exam Module

## Purpose
Config-driven exam management with RulesEngine-based grade conversion, GPA calculation, and promotion eligibility checks. Assessment types are tenant-defined via reference data tables.

## Business Rules
- **Types** are tenant-defined via `assessment_types` (Unit Test, Mid-Term, Final, Quiz, Practical)
- **Grading** — Delegates to RulesEngine (`grading.convert_score`). Per-school: grade bands / percentage / GPA
- **GPA** — Weighted by credit_hours via RulesEngine (`grading.calculate_gpa`). Fallback: simple weighted average
- **Promotion** — RulesEngine (`promotion.eligibility`): min attendance 75% + min GPA 2.0. Default: eligible
- **Statistics** — Average, median, pass rate computed per exam
- **Events emitted** — `exam.score_entered`

## Dependencies
| Service | Purpose |
|---------|---------|
| `PrismaService` | CRUD |
| `ConfigurationEngine` | Valid assessment types |
| `RulesEngine` | Grade conversion, GPA, promotion |
| `EventBus` | Domain events |

## Endpoints
```
POST   /exams                           # Create exam
GET    /exams?page=&class_id=&type_code= # List (paginated)
PUT    /exams/:id/scores                 # Enter batch scores
GET    /exams/:id/scores                 # Get all scores
GET    /exams/:id/statistics             # Class statistics
GET    /exams/promotion/:studentId       # Check promotion eligibility
POST   /exams/convert-score             # Score → grade via RulesEngine
POST   /exams/calculate-gpa             # GPA calculation
```
