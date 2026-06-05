# Reporting Module — Error Codes

| Code | HTTP | When | Frontend Handling |
|------|:----:|------|------------------|
| `INVALID_DATE_RANGE` | 400 | from > to or date range exceeds 1 year | Show inline validation error |
| `NO_DATA_AVAILABLE` | 200 | No records match filters | Show empty state with "No data for selected filters" |
| `REPORT_GENERATION_FAILED` | 500 | Unexpected aggregation error | Show "Unable to generate report. Try again." |
