# Attendance Module — Permissions

| Permission | Purpose | Required Roles |
|-----------|---------|---------------|
| `attendance:view` | View attendance records and statuses | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER, PARENT, STUDENT, STAFF, COUNSELOR |
| `attendance:mark` | Mark attendance for a class | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER* |
| `attendance:correct` | Request corrections, approve/reject | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER* |
| `attendance:export` | Export attendance reports | SUPER_ADMIN, ADMIN, PRINCIPAL, TEACHER |

> `*` Scoped to teacher's assigned classes only
