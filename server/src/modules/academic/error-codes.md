# Academic Module — Error Codes

| Code | HTTP | When | Frontend Handling |
|------|:----:|------|------------------|
| `STUDENT_NOT_FOUND` | 404 | Student ID doesn't exist or belongs to another tenant | Show "Student not found" page |
| `STAFF_NOT_FOUND` | 404 | Staff ID doesn't exist or belongs to another tenant | Show "Staff not found" page |
| `DUPLICATE_STUDENT_ID` | 409 | student_id_card already exists | Show inline error on form |
| `DUPLICATE_GRADE_CODE` | 409 | Grade code already exists for this tenant | Show inline error on form |
