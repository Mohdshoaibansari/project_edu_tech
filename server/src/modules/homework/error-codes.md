# Homework Module — Error Codes

| Code | HTTP | When | Frontend Handling |
|------|:----:|------|------------------|
| `HOMEWORK_NOT_FOUND` | 404 | ID doesn't exist or wrong tenant | Show "Not found" |
| `INVALID_CATEGORY` | 400 | Category code not in tenant's configured categories | Show valid category options |
| `INVALID_STATUS` | 400 | Lifecycle state transition not allowed | Show valid next states |
| `CANNOT_SUBMIT` | 400 | Homework not in PUBLISHED state | Show "Submission not open" |
| `SUBMISSION_NOT_FOUND` | 404 | Submission doesn't exist | Show "Not found" |
| `ALREADY_SUBMITTED` | 409 | Student already submitted | Show existing submission |
