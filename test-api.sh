#!/bin/bash
# ============================================================================
# EduTech — Comprehensive API Test Script
# Run: bash test-api.sh
# Output: test-results.log (summary + status codes) + test-responses.log (full bodies)
# ============================================================================

BASE="http://localhost:3000/api/v1"
T_A="tenant-school-a-0000000000000001"
T_B="tenant-school-b-0000000000000002"
T_C="tenant-school-c-0000000000000003"
LOG="test-results.log"
BODY="test-responses.log"
TMP_RESP=".test-tmp-resp.txt"
PASS=0
FAIL=0

echo "EduTech API Test — $(date)" > $LOG
echo "========================================" >> $LOG
echo "" > $BODY

test_endpoint() {
  NAME="$1" METHOD="$2" URL="$3" BODY_DATA="$4" AUTH="$5"
  if [ "$METHOD" = "GET" ]; then
    CODE=$(curl -s -o "$TMP_RESP" -w "%{http_code}" "$URL" ${AUTH:+-H "Authorization: Bearer $AUTH"})
  elif [ "$METHOD" = "POST" ]; then
    CODE=$(curl -s -o "$TMP_RESP" -w "%{http_code}" -X POST "$URL" -H "Content-Type: application/json" ${AUTH:+-H "Authorization: Bearer $AUTH"} -d "${BODY_DATA:-{}}")
  elif [ "$METHOD" = "PUT" ]; then
    CODE=$(curl -s -o "$TMP_RESP" -w "%{http_code}" -X PUT "$URL" -H "Content-Type: application/json" ${AUTH:+-H "Authorization: Bearer $AUTH"} -d "${BODY_DATA:-{}}")
  elif [ "$METHOD" = "DELETE" ]; then
    CODE=$(curl -s -o "$TMP_RESP" -w "%{http_code}" -X DELETE "$URL" ${AUTH:+-H "Authorization: Bearer $AUTH"})
  fi

  if [ "$CODE" -ge 200 ] 2>/dev/null && [ "$CODE" -lt 300 ] 2>/dev/null; then
    STATUS="PASS"; PASS=$((PASS + 1))
  else
    STATUS="FAIL"; FAIL=$((FAIL + 1))
  fi

  printf "  %-50s [%s] %s\n" "$NAME" "$CODE" "$STATUS" | tee -a $LOG
  echo "=== $NAME [$CODE] ===" >> $BODY
  cat "$TMP_RESP" >> $BODY
  echo "" >> $BODY
}

# ============================
# LOGIN
# ============================
echo "--- LOGIN ---" | tee -a $LOG
ADMIN_A=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@school-a.edu","password":"any"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "  Token A: ${ADMIN_A:0:30}..." | tee -a $LOG

# ============================
# AUTH (4)
# ============================
echo "" | tee -a $LOG; echo "--- AUTH ---" | tee -a $LOG
test_endpoint "POST /auth/login" "POST" "$BASE/auth/login" '{"email":"admin@school-a.edu","password":"any"}' ""
test_endpoint "GET /auth/me" "GET" "$BASE/auth/me" "" "$ADMIN_A"
test_endpoint "POST /auth/refresh" "POST" "$BASE/auth/refresh" "" ""
test_endpoint "POST /auth/logout" "POST" "$BASE/auth/logout" "" ""

# ============================
# CONFIG (14)
# ============================
echo "" | tee -a $LOG; echo "--- CONFIG ---" | tee -a $LOG
test_endpoint "GET /config/schemas" "GET" "$BASE/$T_A/config/schemas" "" ""
test_endpoint "GET /config/:key" "GET" "$BASE/$T_A/config/grading.scale" "" ""
test_endpoint "GET /config (all)" "GET" "$BASE/$T_A/config" "" ""
test_endpoint "GET /config/:key/history" "GET" "$BASE/$T_A/config/grading.scale/history" "" ""
test_endpoint "PUT /config/:key" "PUT" "$BASE/$T_A/config/attendance.statuses" '{"value":{"mode":"daily","statuses":[]}}' "$ADMIN_A"
test_endpoint "POST /config/:key/rollback" "POST" "$BASE/$T_A/config/attendance.statuses/rollback" '{"version":1}' "$ADMIN_A"
test_endpoint "GET /config/templates" "GET" "$BASE/$T_A/config/templates/list" "" ""
test_endpoint "GET /config/conv/att-status" "GET" "$BASE/$T_A/config/convenience/attendance-statuses" "" ""
test_endpoint "GET /config/conv/grading" "GET" "$BASE/$T_A/config/convenience/grading-scale" "" ""
test_endpoint "GET /config/conv/calendar" "GET" "$BASE/$T_A/config/convenience/academic-calendar" "" ""
test_endpoint "GET /config/conv/leave" "GET" "$BASE/$T_A/config/convenience/leave-types" "" ""
test_endpoint "GET /config/conv/assess" "GET" "$BASE/$T_A/config/convenience/assessment-types" "" ""
test_endpoint "GET /config/conv/notif" "GET" "$BASE/$T_A/config/convenience/notification-types" "" ""
test_endpoint "GET /config/conv/hw-cat" "GET" "$BASE/$T_A/config/convenience/homework-categories" "" ""

# ============================
# RULES (5)
# ============================
echo "" | tee -a $LOG; echo "--- RULES ---" | tee -a $LOG
test_endpoint "GET /rules (list)" "GET" "$BASE/$T_A/rules" "" ""
test_endpoint "GET /rules/:code" "GET" "$BASE/$T_A/rules/grading.convert_score" "" ""
test_endpoint "POST /rules (create)" "POST" "$BASE/$T_A/rules" '{"code":"test.rules","name":"Test Rules"}' "$ADMIN_A"
test_endpoint "POST /rules/:code/evaluate" "POST" "$BASE/$T_A/rules/grading.convert_score/evaluate" '{"context":{"score":85,"max_score":100}}' "$ADMIN_A"
test_endpoint "POST /rules/:code/test" "POST" "$BASE/$T_A/rules/grading.convert_score/test" '{"condition":{"operator":"gte","field":"score","value":80},"action":{},"context":{"score":85}}' "$ADMIN_A"

# ============================
# WORKFLOWS (6)
# ============================
echo "" | tee -a $LOG; echo "--- WORKFLOWS ---" | tee -a $LOG
test_endpoint "GET /workflows (list)" "GET" "$BASE/$T_A/workflows" "" ""
test_endpoint "GET /workflows/:code" "GET" "$BASE/$T_A/workflows/leave_approval" "" ""
test_endpoint "POST /workflows/start" "POST" "$BASE/$T_A/workflows/leave_approval/instances" '{"entity_type":"LeaveRequest","entity_id":"wf-test-1","context":{"leave_days":2}}' "$ADMIN_A"
test_endpoint "POST /workflows/inst/:id/trans" "POST" "$BASE/$T_A/workflows/instances/56e64e4d-093e-4ff5-873c-43730133b9bc/transition" '{"transition":"Submit","actor_role":"PARENT"}' "$ADMIN_A"

# ============================
# ACADEMIC (8)
# ============================
echo "" | tee -a $LOG; echo "--- ACADEMIC ---" | tee -a $LOG
test_endpoint "GET /academic/grades" "GET" "$BASE/$T_A/academic/grades" "" ""
test_endpoint "POST /academic/grades" "POST" "$BASE/$T_A/academic/grades" '{"code":"GRADE-TEST","name":"Test Grade"}' "$ADMIN_A"
test_endpoint "GET /academic/sections" "GET" "$BASE/$T_A/academic/sections" "" ""
test_endpoint "GET /academic/subjects" "GET" "$BASE/$T_A/academic/subjects" "" ""
test_endpoint "GET /academic/classes" "GET" "$BASE/$T_A/academic/classes" "" ""
test_endpoint "GET /academic/students" "GET" "$BASE/$T_A/academic/students?page=1" "" ""
test_endpoint "POST /academic/students" "POST" "$BASE/$T_A/academic/students" '{"first_name":"Test","last_name":"Student","date_of_birth":"2015-03-15","grade_level":"GRADE-5"}' "$ADMIN_A"
test_endpoint "GET /academic/staff" "GET" "$BASE/$T_A/academic/staff" "" ""

# Get student ID for attendance/exam tests
STUDENT_ID=$(curl -s "$BASE/$T_A/academic/students?page=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Student: $STUDENT_ID" | tee -a $LOG

# ============================
# ATTENDANCE (5)
# ============================
echo "" | tee -a $LOG; echo "--- ATTENDANCE ---" | tee -a $LOG
test_endpoint "GET /attendance/statuses" "GET" "$BASE/$T_A/attendance/statuses" "" ""
if [ -n "$STUDENT_ID" ]; then
  test_endpoint "POST /attendance/mark" "POST" "$BASE/$T_A/attendance/mark" "{\"class_id\":\"class-1\",\"date\":\"2026-06-05\",\"records\":[{\"student_id\":\"$STUDENT_ID\",\"status_code\":\"PRESENT\"}]}" "$ADMIN_A"
  test_endpoint "GET /attendance/student" "GET" "$BASE/$T_A/attendance/students/$STUDENT_ID?from=2026-06-01&to=2026-06-30" "" "$ADMIN_A"
  test_endpoint "GET /attendance/rate" "GET" "$BASE/$T_A/attendance/calculate-rate?student_id=$STUDENT_ID&from=2026-06-01&to=2026-06-30" "" "$ADMIN_A"
  test_endpoint "GET /attendance/class/date" "GET" "$BASE/$T_A/attendance/class/class-1/date/2026-06-05" "" "$ADMIN_A"
fi

# ============================
# HOMEWORK (5)
# ============================
echo "" | tee -a $LOG; echo "--- HOMEWORK ---" | tee -a $LOG
test_endpoint "POST /homework (create)" "POST" "$BASE/$T_A/homework" '{"title":"Algebra","category_code":"HOMEWORK","class_id":"class-1","subject_id":"subj-1","due_date":"2026-06-10","max_score":50}' "$ADMIN_A"
test_endpoint "GET /homework (list)" "GET" "$BASE/$T_A/homework?page=1" "" ""
test_endpoint "POST /homework/ai-gen" "POST" "$BASE/$T_A/homework/ai-generate" '{"subject_id":"MATH","grade_level":"GRADE-5","topic":"Fractions"}' "$ADMIN_A"
HW_ID=$(curl -s "$BASE/$T_A/homework?page=1&pageSize=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$HW_ID" ]; then
  test_endpoint "GET /homework/:id" "GET" "$BASE/$T_A/homework/$HW_ID" "" ""
  test_endpoint "PUT /homework/:id/publish" "PUT" "$BASE/$T_A/homework/$HW_ID/status" '{"status":"PUBLISHED"}' "$ADMIN_A"
fi

# ============================
# EXAMS (6)
# ============================
echo "" | tee -a $LOG; echo "--- EXAMS ---" | tee -a $LOG
test_endpoint "POST /exams (create)" "POST" "$BASE/$T_A/exams" '{"title":"Unit Test","type_code":"UNIT_TEST","class_id":"class-1","date":"2026-06-20","max_score":100}' "$ADMIN_A"
test_endpoint "GET /exams (list)" "GET" "$BASE/$T_A/exams?page=1" "" ""
test_endpoint "POST /exams/convert-score" "POST" "$BASE/$T_A/exams/convert-score" '{"score":72,"max_score":100}' "$ADMIN_A"
test_endpoint "POST /exams/calculate-gpa" "POST" "$BASE/$T_A/exams/calculate-gpa" '{"subjects":[{"subject":"Math","grade_point":4.0,"credit_hours":4},{"subject":"Science","grade_point":3.0,"credit_hours":3}]}' "$ADMIN_A"
EXAM_ID=$(curl -s "$BASE/$T_A/exams?page=1&pageSize=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$STUDENT_ID" ] && [ -n "$EXAM_ID" ]; then
  test_endpoint "PUT /exams/:id/scores" "PUT" "$BASE/$T_A/exams/$EXAM_ID/scores" "{\"scores\":[{\"student_id\":\"$STUDENT_ID\",\"score\":85}]}" "$ADMIN_A"
  test_endpoint "GET /exams/:id/statistics" "GET" "$BASE/$T_A/exams/$EXAM_ID/statistics" "" ""
fi

# ============================
# LEAVE (3)
# ============================
echo "" | tee -a $LOG; echo "--- LEAVE ---" | tee -a $LOG
test_endpoint "POST /leaves (apply)" "POST" "$BASE/$T_A/leaves" '{"type_code":"SICK","start_date":"2026-06-15","end_date":"2026-06-15","reason":"Checkup"}' "$ADMIN_A"
test_endpoint "GET /leaves (list)" "GET" "$BASE/$T_A/leaves?page=1" "" ""
LEAVE_ID=$(curl -s "$BASE/$T_A/leaves?page=1&pageSize=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$LEAVE_ID" ]; then
  test_endpoint "GET /leaves/:id" "GET" "$BASE/$T_A/leaves/$LEAVE_ID" "" "$ADMIN_A"
fi

# ============================
# NOTIFICATIONS (2)
# ============================
echo "" | tee -a $LOG; echo "--- NOTIFICATIONS ---" | tee -a $LOG
test_endpoint "GET /notifications/inbox" "GET" "$BASE/$T_A/notifications/inbox" "" ""
test_endpoint "POST /notifications/read-all" "POST" "$BASE/$T_A/notifications/inbox/read-all" "" "$ADMIN_A"

# ============================
# REPORTS (4)
# ============================
echo "" | tee -a $LOG; echo "--- REPORTS ---" | tee -a $LOG
test_endpoint "GET /reports/dashboard" "GET" "$BASE/$T_A/reports/dashboard" "" "$ADMIN_A"
test_endpoint "GET /reports/attendance" "GET" "$BASE/$T_A/reports/attendance?from=2026-06-01&to=2026-06-30" "" "$ADMIN_A"
test_endpoint "GET /reports/exams" "GET" "$BASE/$T_A/reports/exams" "" "$ADMIN_A"
test_endpoint "GET /reports/leaves" "GET" "$BASE/$T_A/reports/leaves" "" "$ADMIN_A"

# ============================
# CROSS-TENANT (8)
# ============================
echo "" | tee -a $LOG; echo "--- CROSS-TENANT ---" | tee -a $LOG
test_endpoint "B: /exams/convert-score" "POST" "$BASE/$T_B/exams/convert-score" '{"score":85,"max_score":100}' "$ADMIN_A"
test_endpoint "B: /workflows" "GET" "$BASE/$T_B/workflows/leave_approval" "" ""
test_endpoint "B: config grading" "GET" "$BASE/$T_B/config/convenience/grading-scale" "" ""
test_endpoint "B: attendance statuses" "GET" "$BASE/$T_B/config/convenience/attendance-statuses" "" ""
test_endpoint "C: /exams/convert-score" "POST" "$BASE/$T_C/exams/convert-score" '{"score":85,"max_score":100}' "$ADMIN_A"
test_endpoint "C: /workflows" "GET" "$BASE/$T_C/workflows/leave_approval" "" ""
test_endpoint "C: config grading" "GET" "$BASE/$T_C/config/convenience/grading-scale" "" ""
test_endpoint "C: academic calendar" "GET" "$BASE/$T_C/config/convenience/academic-calendar" "" ""

# ============================
# SUMMARY
# ============================
echo "" | tee -a $LOG
echo "========================================" | tee -a $LOG
echo " TOTAL: $((PASS + FAIL))   PASS: $PASS   FAIL: $FAIL" | tee -a $LOG
echo "========================================" | tee -a $LOG
echo "" | tee -a $LOG
echo "Response bodies: $BODY" | tee -a $LOG

# Cleanup
rm -f "$TMP_RESP"
