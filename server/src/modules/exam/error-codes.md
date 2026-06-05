# Exam Module — Error Codes

| Code | HTTP | When | Frontend Handling |
|------|:----:|------|------------------|
| `EXAM_NOT_FOUND` | 404 | Exam ID doesn't exist or wrong tenant | Show "Not found" |
| `INVALID_EXAM_TYPE` | 400 | type_code not in tenant's assessment_types | Show valid type options |
| `INVALID_SCORE` | 400 | Score exceeds max_score or is negative | Show inline validation error |
| `STUDENT_NOT_IN_CLASS` | 400 | Student not enrolled in exam's class | Show warning, skip student |
| `PROMOTION_CHECK_FAILED` | 400 | Could not evaluate promotion rules | Show "Unable to check" message |
