# Homework Module — Permissions

| Permission | Purpose | Required Roles |
|-----------|---------|---------------|
| `homework:create` | Create new homework | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER* |
| `homework:edit` | Edit homework details/status | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER* |
| `homework:delete` | Delete homework | SUPER_ADMIN, ADMIN |
| `homework:view` | View homework and submissions | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER, PARENT, STUDENT, COUNSELOR |
| `homework:submit` | Submit homework as student | STUDENT |
| `homework:grade` | Grade submissions | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER* |
| `homework:return` | Return graded work to student | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER* |
| `homework:ai-generate` | Use AI to generate questions | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER |
