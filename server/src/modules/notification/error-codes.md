# Notification Module — Error Codes

| Code | HTTP | When | Frontend Handling |
|------|:----:|------|------------------|
| `NOTIFICATION_NOT_FOUND` | 404 | Notification ID doesn't exist or wrong user | Silently skip (inbox refresh) |
| `NOTIFICATION_SEND_FAILED` | *logged* | Provider (email/SMS/push) delivery failed | Logged only, doesn't fail the triggering action |
