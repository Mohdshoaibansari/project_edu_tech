# Attendance Module — Error Codes

| Code | HTTP | When | Frontend Handling |
|------|:----:|------|------------------|
| `INVALID_STATUS_CODE` | 400 | Status code not in tenant's configured statuses | Show valid status options, disable invalid selections |
| `ATTENDANCE_NOT_FOUND` | 404 | Record doesn't exist or wrong tenant | Show "Record not found" |
| `CORRECTION_ALREADY_PENDING` | 409 | A correction workflow is already in progress | Show existing correction status |
| `DUPLICATE_MARK` | 409 | Same student+class+date already marked | Show inline warning, offer correction |
