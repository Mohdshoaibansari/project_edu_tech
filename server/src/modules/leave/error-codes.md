# Leave Module — Error Codes

| Code | HTTP | When | Frontend Handling |
|------|:----:|------|------------------|
| `LEAVE_NOT_FOUND` | 404 | Leave ID doesn't exist or wrong tenant | Show "Not found" |
| `INVALID_LEAVE_TYPE` | 400 | type_code not in tenant's leave_types | Show valid leave type options |
| `INSUFFICIENT_BALANCE` | 400 | Exceeds max_days for leave type | Show remaining balance, suggest shorter duration |
| `WORKFLOW_NOT_AVAILABLE` | 400 | No workflow defined for this tenant | Show "Contact admin" message |
| `TRANSITION_NOT_ALLOWED` | 400 | Actor/role cannot perform this transition | Show available actions or "Pending review" |
| `NO_ACTIVE_WORKFLOW` | 400 | Leave has no workflow instance linked | Show "Error — contact admin" |
