# Auth Module — Error Codes

| Code | HTTP | When | Frontend Handling |
|------|:----:|------|------------------|
| `UNAUTHORIZED` | 401 | Missing/invalid JWT token | Redirect to login, clear stored token |
| `FORBIDDEN` | 403 | User lacks required permission `resource:action` | Show "Access Denied" page, hide restricted UI |
| `TENANT_ACCESS_DENIED` | 403 | JWT tenant claim ≠ URL tenant param | Logout, redirect to correct tenant URL |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token expired/revoked/not found | Redirect to login |

## Internal Errors (logged, not exposed)

| Error | Cause |
|-------|-------|
| `User not found` | Email doesn't match any user in Prisma |
| `Invalid or expired token` | JWT verification failed (expired, bad signature, tampered) |
| `SuperTokens verification failed` | Core unreachable or token invalid |
