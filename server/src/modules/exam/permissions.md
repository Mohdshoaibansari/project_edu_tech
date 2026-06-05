# Exam Module — Permissions

| Permission | Purpose | Required Roles |
|-----------|---------|---------------|
| `exam:create` | Create new exam | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER* |
| `exam:edit` | Edit exam details | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER* |
| `exam:delete` | Delete exam | SUPER_ADMIN, ADMIN |
| `exam:enter-scores` | Enter student scores | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER* |
| `exam:view` | View exams, scores, statistics | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER, PARENT, STUDENT, COUNSELOR |
