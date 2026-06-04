# 8. API Contracts

> **Status:** Draft — Pre-Implementation  
> **Last Updated:** 2026-06-05  
> **Note:** This is a summary reference. Full OpenAPI 3.x YAML files will be generated per module in `contracts/` directory.

---

## 8.1 API Naming Convention

### URL Structure

```
/api/v1/{tenantId}/{resource}
/api/v1/{tenantId}/{resource}/{id}
/api/v1/{tenantId}/{resource}/{id}/{sub-resource}
/api/v1/{tenantId}/{resource}/{id}/{action}
```

### Standard Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization: Bearer <jwt>` | Yes (except auth) | Access token |
| `Content-Type: application/json` | Yes (POST/PUT/PATCH) | Request body format |
| `Accept: application/json` | Optional | Response format |
| `X-Request-ID` | Optional | For tracing |

### Standard Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `sort` | string | `-created_at` | Sort field (`-` = descending) |
| `filter[field]` | string | — | Exact match filter |
| `search` | string | — | Full-text search term |
| `from` | date | — | Date range start |
| `to` | date | — | Date range end |

---

## 8.2 Module API Contracts

### 8.2.1 Authentication

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/auth/login` | No | Login (exchange SuperTokens identity for JWT) |
| `POST` | `/api/v1/auth/logout` | Yes | Logout (revoke refresh token) |
| `POST` | `/api/v1/auth/refresh` | Cookie | Refresh access token |
| `GET` | `/api/v1/auth/me` | Yes | Get current user profile + permissions |
| `POST` | `/api/v1/auth/register` | No (admin key) | Register new user (admin only) |

#### POST /api/v1/auth/login

```json
// Request
{
  "email": "teacher@school.edu",
  "supertokens_user_id": "uuid-from-supertokens"
}

// Response 200
{
  "data": {
    "access_token": "eyJhbGciOi...",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "first_name": "Riya",
      "last_name": "Sharma",
      "email": "teacher@school.edu",
      "role": "TEACHER",
      "tenant": {
        "id": "uuid",
        "name": "Green Valley School",
        "slug": "green-valley-school"
      },
      "permissions": [
        "attendance:view",
        "attendance:mark",
        "homework:create"
      ]
    }
  }
}
```

### 8.2.2 Attendance

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/{tenant}/attendance` | `attendance:view` | List attendance records |
| `GET` | `/api/v1/{tenant}/attendance/{id}` | `attendance:view` | Get single record |
| `POST` | `/api/v1/{tenant}/attendance` | `attendance:mark` | Mark attendance |
| `PATCH` | `/api/v1/{tenant}/attendance/{id}` | `attendance:mark` | Update status |
| `GET` | `/api/v1/{tenant}/attendance/stats` | `attendance:view` | Get statistics |
| `POST` | `/api/v1/{tenant}/attendance/correction` | `attendance:correct` | Request correction |
| `PATCH` | `/api/v1/{tenant}/attendance/correction/{id}` | `attendance:correct` | Approve/reject correction |
| `GET` | `/api/v1/{tenant}/attendance/export` | `attendance:export` | Export report |

#### POST /api/v1/{tenant}/attendance

```json
// Request
{
  "class_id": "uuid",
  "date": "2026-06-05",
  "records": [
    { "student_id": "uuid", "status": "PRESENT" },
    { "student_id": "uuid", "status": "ABSENT_UNEXCUSED", "notes": "No information" }
  ]
}

// Response 201
{
  "data": {
    "class_id": "uuid",
    "date": "2026-06-05",
    "total": 45,
    "present": 42,
    "absent": 2,
    "tardy": 1,
    "records": [ ... ]
  }
}
```

### 8.2.3 Homework

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/{tenant}/homework` | `homework:view` | List homework (filterable) |
| `GET` | `/api/v1/{tenant}/homework/{id}` | `homework:view` | Get homework detail |
| `POST` | `/api/v1/{tenant}/homework` | `homework:create` | Create homework |
| `PUT` | `/api/v1/{tenant}/homework/{id}` | `homework:edit` | Update homework |
| `DELETE` | `/api/v1/{tenant}/homework/{id}` | `homework:delete` | Delete (admin only) |
| `POST` | `/api/v1/{tenant}/homework/{id}/publish` | `homework:edit` | Publish draft/scheduled |
| `GET` | `/api/v1/{tenant}/homework/templates` | `homework:create` | List templates |
| `POST` | `/api/v1/{tenant}/homework/ai-generate` | `homework:ai-generate` | AI generate homework |
| `POST` | `/api/v1/{tenant}/homework/{id}/submit` | `homework:submit` | Submit homework |
| `GET` | `/api/v1/{tenant}/homework/{id}/submissions` | `homework:view` | List submissions |
| `PATCH` | `/api/v1/{tenant}/homework/submissions/{id}` | `homework:grade` | Grade submission |
| `POST` | `/api/v1/{tenant}/homework/submissions/{id}/return` | `homework:return` | Return for correction |
| `POST` | `/api/v1/{tenant}/homework/submissions/bulk-grade` | `homework:grade` | Bulk grade |
| `POST` | `/api/v1/{tenant}/homework/{id}/attachments` | `homework:create` | Upload attachment |

### 8.2.4 Exams

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/{tenant}/exams` | `exam:view` | List exams |
| `GET` | `/api/v1/{tenant}/exams/{id}` | `exam:view` | Get exam detail |
| `POST` | `/api/v1/{tenant}/exams` | `exam:create` | Create exam |
| `PUT` | `/api/v1/{tenant}/exams/{id}` | `exam:edit` | Update exam |
| `DELETE` | `/api/v1/{tenant}/exams/{id}` | `exam:delete` | Delete (admin) |
| `POST` | `/api/v1/{tenant}/exams/{id}/scores` | `exam:enter-scores` | Enter scores |
| `GET` | `/api/v1/{tenant}/exams/{id}/stats` | `exam:view` | Class statistics |
| `GET` | `/api/v1/{tenant}/exams/{id}/export` | `exam:view` | Export scores |

### 8.2.5 Leave Management

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/{tenant}/leaves` | `leave:view` | List leave requests |
| `POST` | `/api/v1/{tenant}/leaves` | `leave:apply` | Apply for leave |
| `PATCH` | `/api/v1/{tenant}/leaves/{id}/approve` | `leave:approve` | Approve/reject |

### 8.2.6 Notifications

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/{tenant}/notifications` | — (authenticated) | List user's notifications |
| `PATCH` | `/api/v1/{tenant}/notifications/{id}/read` | — (authenticated) | Mark as read |
| `PATCH` | `/api/v1/{tenant}/notifications/read-all` | — (authenticated) | Mark all as read |

### 8.2.7 Reports

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/{tenant}/reports/attendance/daily` | `report:view` | Daily attendance report |
| `GET` | `/api/v1/{tenant}/reports/attendance/monthly` | `report:view` | Monthly report |
| `GET` | `/api/v1/{tenant}/reports/attendance/low` | `report:view` | Low attendance report |
| `GET` | `/api/v1/{tenant}/reports/student/{id}` | `report:view` | Individual student report |
| `GET` | `/api/v1/{tenant}/reports/export` | `report:export` | Export (CSV/Excel/PDF) |

### 8.2.8 Administration

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/{tenant}/users` | `admin:users` | List users |
| `POST` | `/api/v1/{tenant}/users` | `admin:users` | Create user |
| `PATCH` | `/api/v1/{tenant}/users/{id}` | `admin:users` | Update user |
| `DELETE` | `/api/v1/{tenant}/users/{id}` | `admin:users` | Deactivate user |
| `GET` | `/api/v1/{tenant}/classes` | `admin:settings` | List classes |
| `POST` | `/api/v1/{tenant}/classes` | `admin:settings` | Create class |
| `GET` | `/api/v1/{tenant}/sections` | `admin:settings` | List sections |
| `POST` | `/api/v1/{tenant}/sections` | `admin:settings` | Create/update section |
| `GET` | `/api/v1/{tenant}/subjects` | `admin:settings` | List subjects |
| `POST` | `/api/v1/{tenant}/subjects` | `admin:settings` | Create subject |
| `GET` | `/api/v1/{tenant}/permissions` | `admin:permissions` | List permissions |
| `POST` | `/api/v1/{tenant}/permissions/role` | `admin:permissions` | Update role permission |
| `POST` | `/api/v1/{tenant}/permissions/user` | `admin:permissions` | Update user override |
| `GET` | `/api/v1/{tenant}/config` | `admin:settings` | Get all config |
| `PUT` | `/api/v1/{tenant}/config` | `admin:settings` | Update config |

### 8.2.9 Tenant Management (Super Admin)

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/tenants` | `tenant:manage` | List all tenants |
| `POST` | `/api/v1/tenants` | `tenant:manage` | Create new tenant |
| `GET` | `/api/v1/{tenant}/dashboard` | `tenant:manage` | Tenant stats |
| `DELETE` | `/api/v1/{tenant}` | `tenant:manage` | Archive/delete tenant |
| `POST` | `/api/v1/{tenant}/export` | `tenant:manage` | Export tenant data |

### 8.2.10 Internal APIs (AI Service → Backend)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/internal/students/{id}/attendance` | `x-api-key` | Get student attendance for AI |
| `GET` | `/api/v1/internal/classes/{id}/attendance` | `x-api-key` | Get class attendance |
| `GET` | `/api/v1/internal/low-attendance` | `x-api-key` | Low attendance students |
| `GET` | `/api/v1/internal/students/{id}/homework` | `x-api-key` | Student homework status |
| `POST` | `/api/v1/internal/leaves` | `x-api-key` | Apply leave via chatbot |
| `POST` | `/api/v1/internal/conversations` | `x-api-key` | Log AI conversation |

---

## 8.3 Standard Response Envelope

### Success

```json
{
  "data": { ... },           // Single item
  "pagination": { ... }      // Only for list endpoints
}
```

### List Success

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### Error (All Errors)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "name", "message": "Name is required" }
    ]
  }
}
```

---

## 8.4 API Versioning Policy

| Version | Status | Sunset Date |
|---------|--------|-------------|
| `v1` | Current (Phase 1) | — |

### Breaking Changes Require New Version

- Removing a field from response
- Renaming a field
- Changing a field's type
- Removing an endpoint
- Changing authentication method

### Non-Breaking (OK in Same Version)

- Adding new optional fields to response
- Adding new endpoints
- Adding new optional query parameters
- Adding new enum values

---

> **Next:** See [`09-implementation-roadmap.md`](./09-implementation-roadmap.md) for phased implementation plan.
