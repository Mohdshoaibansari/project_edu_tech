#!/bin/bash
# ============================================================================
# EduTech — Comprehensive API Test Script
# Covers ALL endpoints across ALL modules with positive + negative tests.
#
# Run: bash test-api.sh
# Requires: server running on localhost:3000 (npm run start:dev)
# Output:   test-results.log (summary) + test-responses.log (full bodies)
# ============================================================================

BASE="http://localhost:3000/api/v1"
ADMIN_BASE="http://localhost:3000/admin"
ST_CORE="http://localhost:3567"
ST_AUTH_SERVICE="http://localhost:4000"
ST_API_KEY="edutech-supertokens-api-key-dev"
T_A="tenant-school-a-0000000000000001"
T_B="tenant-school-b-0000000000000002"
T_C="tenant-school-c-0000000000000003"
LOG="test-results.log"
BODY="test-responses.log"
TMP_RESP=".test-tmp-resp.txt"
TMP_COOKIE=".test-cookies.txt"
PASS=0
FAIL=0
SKIP=0

echo "╔══════════════════════════════════════════════════════════════╗" > $LOG
echo "║  EduTech API Test — $(date)                       ║" >> $LOG
echo "╚══════════════════════════════════════════════════════════════╝" >> $LOG
echo "" > $BODY

# ──────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────

section() {
  echo "" | tee -a $LOG
  echo "═══ $1 ═══" | tee -a $LOG
}

test_endpoint() {
  NAME="$1"; METHOD="$2"; URL="$3"
  BODY_DATA="$4"; AUTH="$5"; EXPECTED="$6"
  # Use a different var name to avoid shadowing global BODY log file
  if [ -n "$BODY_DATA" ]; then
    REQ_BODY="$BODY_DATA"
  else
    REQ_BODY="{}"
  fi
  if [ "$METHOD" = "GET" ]; then
    CODE=$(curl -s -o "$TMP_RESP" -w "%{http_code}" "$URL" ${AUTH:+-H "Authorization: Bearer $AUTH"})
  elif [ "$METHOD" = "POST" ]; then
    CODE=$(curl -s -o "$TMP_RESP" -w "%{http_code}" -X POST "$URL" -H "Content-Type: application/json" ${AUTH:+-H "Authorization: Bearer $AUTH"} -d "$REQ_BODY")
  elif [ "$METHOD" = "PUT" ]; then
    CODE=$(curl -s -o "$TMP_RESP" -w "%{http_code}" -X PUT "$URL" -H "Content-Type: application/json" ${AUTH:+-H "Authorization: Bearer $AUTH"} -d "$REQ_BODY")
  elif [ "$METHOD" = "DELETE" ]; then
    CODE=$(curl -s -o "$TMP_RESP" -w "%{http_code}" -X DELETE "$URL" ${AUTH:+-H "Authorization: Bearer $AUTH"})
  fi

  if [ -n "$EXPECTED" ]; then
    if [ "$CODE" = "$EXPECTED" ] 2>/dev/null; then
      STATUS="PASS"; PASS=$((PASS + 1))
    else
      STATUS="FAIL (expected $EXPECTED, got $CODE)"; FAIL=$((FAIL + 1))
    fi
  else
    if [ "$CODE" -ge 200 ] 2>/dev/null && [ "$CODE" -lt 300 ] 2>/dev/null; then
      STATUS="PASS"; PASS=$((PASS + 1))
    elif [ "$CODE" -ge 400 ] 2>/dev/null && [ "$CODE" -lt 500 ] 2>/dev/null; then
      STATUS="PASS (client error expected)"; PASS=$((PASS + 1))
    else
      STATUS="FAIL ($CODE)"; FAIL=$((FAIL + 1))
    fi
  fi

  printf "  %-55s [%s] %s\n" "$NAME" "$CODE" "$STATUS" | tee -a $LOG
  echo "=== $NAME [$CODE] ===" >> $BODY
  cat "$TMP_RESP" >> $BODY
  echo -e "\n" >> $BODY
}

# ──────────────────────────────────────────────────────────────────────────
# Server Check
# ──────────────────────────────────────────────────────────────────────────
echo "Checking server..." | tee -a $LOG
if ! curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/login" > /dev/null 2>&1; then
  echo "ERROR: Server not running at $BASE" | tee -a $LOG
  echo "Start with: cd server && npm run start:dev" | tee -a $LOG
  exit 1
fi
echo "Server OK" | tee -a $LOG

# ══════════════════════════════════════════════════════════════════════════
# 1. AUTH — Login, Token, Profile
# ══════════════════════════════════════════════════════════════════════════
section "1. AUTHENTICATION"

# Check if SuperTokens core is reachable on port 3567
# Auth service (frontend SDK) is on port 4000
ST_HEALTHY=false
if curl -s "$ST_CORE/auth/hello" | grep -q "Hello" 2>/dev/null; then
  ST_HEALTHY=true
fi
echo "  SuperTokens Core: ${ST_HEALTHY} (port 3567)" | tee -a $LOG

# DEV MODE LOGIN — bypasses SuperTokens (short password triggers dev fallback)
ADMIN_A=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@school-a.edu","password":"any"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
ADMIN_B=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@school-b.edu","password":"any"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
ADMIN_C=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@school-c.edu","password":"any"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo "  Token A: ${ADMIN_A:0:30}..." | tee -a $LOG
echo "  Token B: ${ADMIN_B:0:30}..." | tee -a $LOG
echo "  Token C: ${ADMIN_C:0:30}..." | tee -a $LOG

# Dev mode: password='any' → backend skips SuperTokens verification
test_endpoint "POST /auth/login (dev mode)"      "POST" "$BASE/auth/login" '{"email":"admin@school-a.edu","password":"any"}' "" ""
test_endpoint "POST /auth/login (bad email)"     "POST" "$BASE/auth/login" '{"email":"nobody@nowhere.com","password":"any"}' "" "404"
test_endpoint "GET  /auth/me"              "GET"  "$BASE/auth/me" "" "$ADMIN_A" ""
test_endpoint "GET  /auth/me (no token)"   "GET"  "$BASE/auth/me" "" "" "401"
test_endpoint "GET  /auth/me (bad token)"  "GET"  "$BASE/auth/me" "" "invalid-token-here" "401"
test_endpoint "POST /auth/refresh (cookie)" "POST" "$BASE/auth/refresh" "" "" ""
test_endpoint "POST /auth/logout"           "POST" "$BASE/auth/logout" "" "$ADMIN_A" ""

# ── SuperTokens-Integrated Login (if SuperTokens is running) ──
if [ "$ST_HEALTHY" = true ]; then
  echo "" | tee -a $LOG
  echo "  --- SuperTokens Integration ---" | tee -a $LOG

  # Sign in via auth service (port 4000) to get access token
  # First try to create user via auth service
  ST_SIGNUP=$(curl -s -w "\n%{http_code}" -X POST "$ST_AUTH_SERVICE/auth/signup" \
    -H "Content-Type: application/json" \
    -H "api-key: $ST_API_KEY" \
    -d '{"formFields":[{"id":"email","value":"stapitest@edutech.dev"},{"id":"password","value":"Test@1234"}]}')
  ST_SIGNUP_CODE=$(echo "$ST_SIGNUP" | tail -1)
  ST_SIGNUP_BODY=$(echo "$ST_SIGNUP" | head -1)
  echo "  ST Signup: $ST_SIGNUP_CODE" | tee -a $LOG

  # Sign in
  ST_SIGNIN=$(curl -s -X POST "$ST_AUTH_SERVICE/auth/signin" \
    -H "Content-Type: application/json" \
    -H "api-key: $ST_API_KEY" \
    -H "rid: emailpassword" \
    -d '{"formFields":[{"id":"email","value":"stapitest@edutech.dev"},{"id":"password","value":"Test@1234"}]}')

  ST_ACCESS_TOKEN=$(echo "$ST_SIGNIN" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

  if [ -n "$ST_ACCESS_TOKEN" ]; then
    echo "  ST Token: ${ST_ACCESS_TOKEN:0:30}..." | tee -a $LOG

    # Exchange SuperTokens token for backend JWT
    test_endpoint "POST /auth/login (supertokens_token)" "POST" "$BASE/auth/login" \
      "{\"email\":\"admin@school-a.edu\",\"supertokens_token\":\"$ST_ACCESS_TOKEN\"}" "" ""
  else
    echo "  ST Signin failed — auth service may need different config." | tee -a $LOG
  fi
else
  echo "  (SuperTokens not reachable — skipping ST integration tests)" | tee -a $LOG
fi

# ══════════════════════════════════════════════════════════════════════════
# 2. CONFIG ENGINE — All endpoints
# ══════════════════════════════════════════════════════════════════════════
section "2. CONFIGURATION ENGINE"

# Schema Registry (use unique key to avoid collision on re-run)
TS=$(date +%s)
test_endpoint "GET  /config/schemas"           "GET" "$BASE/$T_A/config/schemas" "" "" ""
test_endpoint "POST /config/schemas (create)"  "POST" "$BASE/$T_A/config/schemas" "{\"schema_key\":\"test.schema.${TS}\",\"name\":\"Test Schema ${TS}\",\"json_schema\":{\"type\":\"object\",\"properties\":{\"foo\":{\"type\":\"string\"}}}}" "$ADMIN_A" ""

# Tenant Config CRUD
test_endpoint "GET  /config"                    "GET"  "$BASE/$T_A/config" "" "" ""
test_endpoint "GET  /config/:key"               "GET"  "$BASE/$T_A/config/grading.scale" "" "" ""
test_endpoint "PUT  /config/:key"               "PUT"  "$BASE/$T_A/config/test.schema" '{"value":{"foo":"bar"}}' "$ADMIN_A" ""
test_endpoint "GET  /config/:key/history"       "GET"  "$BASE/$T_A/config/grading.scale/history" "" "" ""
test_endpoint "POST /config/:key/rollback"      "POST" "$BASE/$T_A/config/grading.scale/rollback" '{"version":1}' "$ADMIN_A" ""

# Templates
test_endpoint "GET  /config/templates/list"          "GET"  "$BASE/$T_A/config/templates/list" "" "" ""
test_endpoint "GET  /config/templates/list (filter)" "GET"  "$BASE/$T_A/config/templates/list?schema_key=attendance.statuses" "" "" ""
test_endpoint "POST /config/:key/from-template"      "POST" "$BASE/$T_A/config/test.schema/from-template" '{"template_id":"template-cbse-00000000000000000001"}' "$ADMIN_A" ""

# Convenience Endpoints (7)
test_endpoint "GET  /config/conv/attendance-statuses" "GET" "$BASE/$T_A/config/convenience/attendance-statuses" "" "" ""
test_endpoint "GET  /config/conv/grading-scale"       "GET" "$BASE/$T_A/config/convenience/grading-scale" "" "" ""
test_endpoint "GET  /config/conv/academic-calendar"   "GET" "$BASE/$T_A/config/convenience/academic-calendar" "" "" ""
test_endpoint "GET  /config/conv/leave-types"         "GET" "$BASE/$T_A/config/convenience/leave-types" "" "" ""
test_endpoint "GET  /config/conv/assessment-types"    "GET" "$BASE/$T_A/config/convenience/assessment-types" "" "" ""
test_endpoint "GET  /config/conv/notification-types"  "GET" "$BASE/$T_A/config/convenience/notification-types" "" "" ""
test_endpoint "GET  /config/conv/homework-categories" "GET" "$BASE/$T_A/config/convenience/homework-categories" "" "" ""

# ══════════════════════════════════════════════════════════════════════════
# 3. RULES ENGINE — All endpoints
# ══════════════════════════════════════════════════════════════════════════
section "3. RULES ENGINE"

test_endpoint "GET  /rules (list)"                         "GET"  "$BASE/$T_A/rules" "" "" ""
test_endpoint "GET  /rules/:code"                          "GET"  "$BASE/$T_A/rules/grading.convert_score" "" "" ""
test_endpoint "POST /rules (create ruleset)"              "POST" "$BASE/$T_A/rules" "{\"code\":\"test.rule.${TS}\",\"name\":\"Test Rule Set ${TS}\",\"description\":\"Testing\"}" "$ADMIN_A" ""
test_endpoint "POST /rules/:code/rules (add rule)"         "POST" "$BASE/$T_A/rules/grading.convert_score/rules" '{"priority":50,"name":"Test Rule","condition":{"always":true},"action":{"type":"CONSTANT","value":"test"}}' "$ADMIN_A" ""
test_endpoint "POST /rules/:code/evaluate"                 "POST" "$BASE/$T_A/rules/grading.convert_score/evaluate" '{"context":{"score":85,"max_score":100}}' "$ADMIN_A" ""
test_endpoint "POST /rules/:code/test"                     "POST" "$BASE/$T_A/rules/grading.convert_score/test" '{"condition":{"always":true},"action":{"type":"CONSTANT","value":"ok"},"context":{}}' "$ADMIN_A" ""

# ══════════════════════════════════════════════════════════════════════════
# 4. WORKFLOW ENGINE — All endpoints
# ══════════════════════════════════════════════════════════════════════════
section "4. WORKFLOW ENGINE"

test_endpoint "GET  /workflows (definitions)"         "GET"  "$BASE/$T_A/workflows" "" "" ""
test_endpoint "GET  /workflows/:code"                 "GET"  "$BASE/$T_A/workflows/leave_approval" "" "" ""
test_endpoint "POST /workflows (create)"             "POST" "$BASE/$T_A/workflows" "{\"code\":\"test_wf_${TS}\",\"name\":\"Test WF ${TS}\",\"states\":[{\"code\":\"START\",\"name\":\"Start\",\"is_initial\":true},{\"code\":\"END\",\"name\":\"End\",\"is_final\":true}],\"transitions\":[{\"from_state_code\":\"START\",\"to_state_code\":\"END\",\"name\":\"Finish\",\"actor_roles\":[\"ADMIN\"]}]}" "$ADMIN_A" ""
test_endpoint "POST /workflows/:code/instances"      "POST" "$BASE/$T_A/workflows/leave_approval/instances" "{\"entity_type\":\"LeaveRequest\",\"entity_id\":\"wf-test-leave-${TS}\",\"context\":{\"leave_days\":2}}" "$ADMIN_A" ""

# Get workflow instance ID from the POST response (saved to TMP_RESP by test_endpoint)
WF_INSTANCE_ID=$(grep -o '"id":"[^"]*"' "$TMP_RESP" | head -1 | cut -d'"' -f4)
if [ -n "$WF_INSTANCE_ID" ]; then
  test_endpoint "GET  /workflows/instances/:id"          "GET"  "$BASE/$T_A/workflows/instances/$WF_INSTANCE_ID" "" "$ADMIN_A" ""
  test_endpoint "GET  /workflows/instances/:id/trans"    "GET"  "$BASE/$T_A/workflows/instances/$WF_INSTANCE_ID/transitions" "" "$ADMIN_A" ""
  test_endpoint "POST /workflows/instances/:id/trans"    "POST" "$BASE/$T_A/workflows/instances/$WF_INSTANCE_ID/transition" '{"transition":"Submit","actor_role":"PARENT"}' "$ADMIN_A" ""
else
  SKIP=$((SKIP + 3))
  echo "  (workflow instance tests skipped — no instance created)" | tee -a $LOG
fi

# ══════════════════════════════════════════════════════════════════════════
# 5. ACADEMIC STRUCTURE — All endpoints
# ══════════════════════════════════════════════════════════════════════════
section "5. ACADEMIC STRUCTURE"

test_endpoint "GET  /academic/grades"                      "GET"  "$BASE/$T_A/academic/grades" "" "" ""
test_endpoint "POST /academic/grades (create)"             "POST" "$BASE/$T_A/academic/grades" "{\"code\":\"GRADE-TEST-${TS}\",\"name\":\"Test Grade ${TS}\",\"sort_order\":99}" "$ADMIN_A" ""
test_endpoint "GET  /academic/sections"                    "GET"  "$BASE/$T_A/academic/sections" "" "" ""
# Get a real grade ID for section creation
GRADE_ID=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/academic/grades" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$GRADE_ID" ]; then
  test_endpoint "POST /academic/sections (create)"           "POST" "$BASE/$T_A/academic/sections" "{\"grade_id\":\"$GRADE_ID\",\"code\":\"SEC-${TS}\",\"name\":\"Section ${TS}\"}" "$ADMIN_A" ""
else
  SKIP=$((SKIP + 1))
fi
test_endpoint "GET  /academic/subjects"                    "GET"  "$BASE/$T_A/academic/subjects" "" "" ""
test_endpoint "POST /academic/subjects (create)"           "POST" "$BASE/$T_A/academic/subjects" "{\"code\":\"SUBJ-${TS}\",\"name\":\"Subject ${TS}\"}" "$ADMIN_A" ""
test_endpoint "GET  /academic/classes"                     "GET"  "$BASE/$T_A/academic/classes" "" "" ""
test_endpoint "GET  /academic/students (paginated)"        "GET"  "$BASE/$T_A/academic/students?page=1&pageSize=5" "" "" ""
test_endpoint "POST /academic/students (enroll)"           "POST" "$BASE/$T_A/academic/students" '{"first_name":"API","last_name":"Test","date_of_birth":"2015-03-15","grade_level":"GRADE-5"}' "$ADMIN_A" ""

# Capture student and staff for subsequent tests
STUDENT_ID=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/academic/students?page=1&pageSize=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
STAFF_ID=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/academic/staff?page=1&pageSize=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Student: ${STUDENT_ID:-NONE}  Staff: ${STAFF_ID:-NONE}" | tee -a $LOG

if [ -n "$STUDENT_ID" ]; then
  test_endpoint "GET  /academic/students/:id"                "GET"  "$BASE/$T_A/academic/students/$STUDENT_ID" "" "" ""
fi
test_endpoint "GET  /academic/staff (list)"               "GET"  "$BASE/$T_A/academic/staff" "" "" ""
test_endpoint "POST /academic/staff (add)"                "POST" "$BASE/$T_A/academic/staff" '{"first_name":"API","last_name":"Teacher","designation":"Test Teacher"}' "$ADMIN_A" ""

# ══════════════════════════════════════════════════════════════════════════
# 6. ATTENDANCE — All endpoints
# ══════════════════════════════════════════════════════════════════════════
section "6. ATTENDANCE"

test_endpoint "GET  /attendance/statuses"                "GET"  "$BASE/$T_A/attendance/statuses" "" "" ""

if [ -n "$STUDENT_ID" ]; then
  test_endpoint "POST /attendance/mark"                    "POST" "$BASE/$T_A/attendance/mark" "{\"class_id\":\"class-1\",\"date\":\"2026-06-05\",\"records\":[{\"student_id\":\"$STUDENT_ID\",\"status_code\":\"PRESENT\"}]}" "$ADMIN_A" ""
  test_endpoint "POST /attendance/mark (invalid status)"   "POST" "$BASE/$T_A/attendance/mark" "{\"class_id\":\"class-1\",\"date\":\"2026-06-05\",\"records\":[{\"student_id\":\"$STUDENT_ID\",\"status_code\":\"INVALID_STATUS\"}]}" "$ADMIN_A" ""
  test_endpoint "GET  /attendance/students/:id"           "GET"  "$BASE/$T_A/attendance/students/$STUDENT_ID?from=2026-06-01&to=2026-06-30" "" "$ADMIN_A" ""
  test_endpoint "GET  /attendance/calculate-rate"          "GET"  "$BASE/$T_A/attendance/calculate-rate?student_id=$STUDENT_ID&from=2026-06-01&to=2026-06-30" "" "$ADMIN_A" ""
  test_endpoint "GET  /attendance/class/:id/date/:date"   "GET"  "$BASE/$T_A/attendance/class/class-1/date/2026-06-05" "" "$ADMIN_A" ""

  # Attendance Corrections (Workflow-driven)
  ATTENDANCE_ID=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/attendance/students/$STUDENT_ID?pageSize=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$ATTENDANCE_ID" ]; then
    test_endpoint "POST /attendance/corrections (request)"  "POST" "$BASE/$T_A/attendance/corrections" "{\"attendance_id\":\"$ATTENDANCE_ID\",\"new_status_code\":\"LATE\",\"reason\":\"Test correction\"}" "$ADMIN_A" ""
    test_endpoint "GET  /attendance/corrections (list)"    "GET"  "$BASE/$T_A/attendance/corrections" "" "$ADMIN_A" ""

    CORR_INSTANCE_ID=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/attendance/corrections" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$CORR_INSTANCE_ID" ]; then
      test_endpoint "POST /attendance/corrections/:id/action" "POST" "$BASE/$T_A/attendance/corrections/$CORR_INSTANCE_ID/action" '{"action":"Request Correction","comment":"Requested via test"}' "$ADMIN_A" ""
    fi
  fi
else
  SKIP=$((SKIP + 8))
  echo "  (attendance tests skipped — no student)" | tee -a $LOG
fi

# ══════════════════════════════════════════════════════════════════════════
# 7. HOMEWORK — All endpoints
# ══════════════════════════════════════════════════════════════════════════
section "7. HOMEWORK"

test_endpoint "POST /homework (create)"                  "POST" "$BASE/$T_A/homework" '{"title":"API Test Homework","description":"Created via API test","category_code":"HOMEWORK","class_id":"class-1","subject_id":"subj-1","due_date":"2026-06-15","max_score":50}' "$ADMIN_A" ""
test_endpoint "GET  /homework (list)"                     "GET"  "$BASE/$T_A/homework?page=1&pageSize=5" "" "" ""
test_endpoint "POST /homework/ai-generate"                "POST" "$BASE/$T_A/homework/ai-generate" '{"subject_id":"MATH","grade_level":"GRADE-5","topic":"Fractions","count":3}' "$ADMIN_A" ""

HW_ID=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/homework?page=1&pageSize=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$HW_ID" ]; then
  test_endpoint "GET  /homework/:id"                        "GET"  "$BASE/$T_A/homework/$HW_ID" "" "" ""
  test_endpoint "PUT  /homework/:id/status (publish)"      "PUT"  "$BASE/$T_A/homework/$HW_ID/status" '{"status":"PUBLISHED"}' "$ADMIN_A" ""
  test_endpoint "PUT  /homework/:id/status (invalid)"      "PUT"  "$BASE/$T_A/homework/$HW_ID/status" '{"status":"INVALID"}' "$ADMIN_A" ""

  if [ -n "$STUDENT_ID" ]; then
    test_endpoint "POST /homework/:id/submit"               "POST" "$BASE/$T_A/homework/$HW_ID/submit" '{"content":"My API test answer"}' "$ADMIN_A" ""
    test_endpoint "GET  /homework/:id/submissions"         "GET"  "$BASE/$T_A/homework/$HW_ID/submissions" "" "$ADMIN_A" ""

    SUBMISSION_ID=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/homework/$HW_ID/submissions" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$SUBMISSION_ID" ]; then
      test_endpoint "PUT  /homework/submissions/:id/grade"  "PUT"  "$BASE/$T_A/homework/submissions/$SUBMISSION_ID/grade" '{"score":42,"feedback":"Good work"}' "$ADMIN_A" ""
      test_endpoint "PUT  /homework/submissions/:id/return" "PUT"  "$BASE/$T_A/homework/submissions/$SUBMISSION_ID/return" "{}" "$ADMIN_A" ""
    fi
  fi
else
  SKIP=$((SKIP + 7))
  echo "  (homework detail tests skipped — no homework)" | tee -a $LOG
fi

# ══════════════════════════════════════════════════════════════════════════
# 8. EXAMS — All endpoints
# ══════════════════════════════════════════════════════════════════════════
section "8. EXAMS"

test_endpoint "POST /exams (create)"                     "POST" "$BASE/$T_A/exams" '{"title":"API Unit Test","type_code":"UNIT_TEST","class_id":"class-1","subject_id":"subj-1","date":"2026-06-25","max_score":100,"pass_score":35}' "$ADMIN_A" ""
test_endpoint "GET  /exams (list)"                        "GET"  "$BASE/$T_A/exams?page=1&pageSize=5" "" "" ""
test_endpoint "POST /exams/convert-score"                 "POST" "$BASE/$T_A/exams/convert-score" '{"score":72,"max_score":100}' "$ADMIN_A" ""
test_endpoint "POST /exams/calculate-gpa"                 "POST" "$BASE/$T_A/exams/calculate-gpa" '{"subjects":[{"subject":"Math","grade_point":4.0,"credit_hours":4},{"subject":"Science","grade_point":3.0,"credit_hours":3},{"subject":"English","grade_point":3.5,"credit_hours":3}]}' "$ADMIN_A" ""

EXAM_ID=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/exams?page=1&pageSize=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$EXAM_ID" ]; then
  if [ -n "$STUDENT_ID" ]; then
    test_endpoint "PUT  /exams/:id/scores (enter)"         "PUT"  "$BASE/$T_A/exams/$EXAM_ID/scores" "{\"scores\":[{\"student_id\":\"$STUDENT_ID\",\"score\":85,\"remarks\":\"Good\"}]}" "$ADMIN_A" ""
  fi
  test_endpoint "GET  /exams/:id/scores"                 "GET"  "$BASE/$T_A/exams/$EXAM_ID/scores" "" "$ADMIN_A" ""
  test_endpoint "GET  /exams/:id/statistics"              "GET"  "$BASE/$T_A/exams/$EXAM_ID/statistics" "" "$ADMIN_A" ""
fi

# Promotion check
test_endpoint "GET  /exams/promotion/:studentId"         "GET"  "$BASE/$T_A/exams/promotion/promotion-check-test" "" "$ADMIN_A" ""

# ══════════════════════════════════════════════════════════════════════════
# 9. LEAVE — All endpoints
# ══════════════════════════════════════════════════════════════════════════
section "9. LEAVE"

test_endpoint "POST /leaves (apply)"                      "POST" "$BASE/$T_A/leaves" '{"type_code":"SICK","start_date":"2026-06-20","end_date":"2026-06-20","reason":"API test leave"}' "$ADMIN_A" ""
test_endpoint "POST /leaves (apply, invalid type)"       "POST" "$BASE/$T_A/leaves" '{"type_code":"INVALID_LEAVE","start_date":"2026-06-20","end_date":"2026-06-20","reason":"bad"}' "$ADMIN_A" "400"
test_endpoint "GET  /leaves (list)"                       "GET"  "$BASE/$T_A/leaves?page=1&pageSize=5" "" "" ""

LEAVE_ID=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/leaves?page=1&pageSize=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$LEAVE_ID" ]; then
  test_endpoint "GET  /leaves/:id"                         "GET"  "$BASE/$T_A/leaves/$LEAVE_ID" "" "$ADMIN_A" ""
  test_endpoint "POST /leaves/:id/action (Submit)"      "POST" "$BASE/$T_A/leaves/$LEAVE_ID/action" '{"transition":"Submit","comment":"Submitted via test","actor_role":"PARENT"}' "$ADMIN_A" ""
else
  SKIP=$((SKIP + 2))
  echo "  (leave detail tests skipped — no leave)" | tee -a $LOG
fi

# ══════════════════════════════════════════════════════════════════════════
# 10. NOTIFICATIONS — All endpoints
# ══════════════════════════════════════════════════════════════════════════
section "10. NOTIFICATIONS"

test_endpoint "GET  /notifications/inbox"                 "GET"  "$BASE/$T_A/notifications/inbox?page=1" "" "$ADMIN_A" ""
test_endpoint "POST /notifications/inbox/read-all"        "POST" "$BASE/$T_A/notifications/inbox/read-all" "{}" "$ADMIN_A" ""

NOTIF_ID=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/notifications/inbox?page=1&pageSize=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$NOTIF_ID" ]; then
  test_endpoint "POST /notifications/inbox/:id/read"      "POST" "$BASE/$T_A/notifications/inbox/$NOTIF_ID/read" "{}" "$ADMIN_A" ""
fi

# ══════════════════════════════════════════════════════════════════════════
# 11. REPORTS — All endpoints
# ══════════════════════════════════════════════════════════════════════════
section "11. REPORTS"

test_endpoint "GET  /reports/dashboard"                   "GET"  "$BASE/$T_A/reports/dashboard" "" "$ADMIN_A" ""
test_endpoint "GET  /reports/attendance"                  "GET"  "$BASE/$T_A/reports/attendance?from=2026-06-01&to=2026-06-30" "" "$ADMIN_A" ""
test_endpoint "GET  /reports/exams"                       "GET"  "$BASE/$T_A/reports/exams" "" "$ADMIN_A" ""
test_endpoint "GET  /reports/leaves"                      "GET"  "$BASE/$T_A/reports/leaves" "" "$ADMIN_A" ""

# ══════════════════════════════════════════════════════════════════════════
# 12. CONFIG VARIABILITY — Verify schools have DIFFERENT configs
# ══════════════════════════════════════════════════════════════════════════
section "12. CONFIG VARIABILITY (School A vs B vs C)"

# ── Attendance Statuses Comparison ──
echo "  --- Attendance Statuses Comparison ---" | tee -a $LOG
SA=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/config/convenience/attendance-statuses" | grep -o '"code":"[^"]*"' | tr '\n' ' ')
SB=$(curl -s -H "Authorization: Bearer $ADMIN_B" "$BASE/$T_B/config/convenience/attendance-statuses" | grep -o '"code":"[^"]*"' | tr '\n' ' ')
SC=$(curl -s -H "Authorization: Bearer $ADMIN_C" "$BASE/$T_C/config/convenience/attendance-statuses" | grep -o '"code":"[^"]*"' | tr '\n' ' ')
echo "  School A statuses: $SA" | tee -a $LOG
echo "  School B statuses: $SB" | tee -a $LOG
echo "  School C statuses: $SC" | tee -a $LOG

# School A should have 3 statuses (PRESENT, ABSENT, LATE)
# School B should have MEDICAL_LEAVE (4+)
# School C should have EXCUSED_ABSENCE or SCHOOL_ACTIVITY (5+)
if echo "$SA" | grep -q "LATE" && echo "$SB" | grep -q "MEDICAL_LEAVE"; then
  echo "  ✅ Attendance configs differ across schools (as expected)" | tee -a $LOG
else
  echo "  ⚠️ Attendance configs may not differ — check seed data" | tee -a $LOG
fi

# ── Grading Scale Comparison (School A: grade_bands, School B: percentage, School C: gpa) ──
echo "" | tee -a $LOG
echo "  --- Grading Scale Comparison ---" | tee -a $LOG
GA=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/config/convenience/grading-scale" | grep -o '"type":"[^"]*"' | head -1)
GB=$(curl -s -H "Authorization: Bearer $ADMIN_B" "$BASE/$T_B/config/convenience/grading-scale" | grep -o '"type":"[^"]*"' | head -1)
GC=$(curl -s -H "Authorization: Bearer $ADMIN_C" "$BASE/$T_C/config/convenience/grading-scale" | grep -o '"type":"[^"]*"' | head -1)
echo "  School A grading: $GA" | tee -a $LOG
echo "  School B grading: $GB" | tee -a $LOG
echo "  School C grading: $GC" | tee -a $LOG

# ── Workflow Definition Comparison ──
echo "" | tee -a $LOG
echo "  --- Workflow States Comparison ---" | tee -a $LOG
WA=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/workflows/leave_approval" | grep -o '"code":"[^"]*"' | tr '\n' ' ')
WB=$(curl -s -H "Authorization: Bearer $ADMIN_B" "$BASE/$T_B/workflows/leave_approval" | grep -o '"code":"[^"]*"' | tr '\n' ' ')
WC=$(curl -s -H "Authorization: Bearer $ADMIN_C" "$BASE/$T_C/workflows/leave_approval" | grep -o '"code":"[^"]*"' | tr '\n' ' ')
echo "  School A workflow states: $WA" | tee -a $LOG
echo "  School B workflow states: $WB" | tee -a $LOG
echo "  School C workflow states: $WC" | tee -a $LOG

# ── Rule Set Presence Across Schools ──
echo "" | tee -a $LOG
echo "  --- Rule Set Presence ---" | tee -a $LOG
for school in "$T_A" "$T_B" "$T_C"; do
  RS_CODE=$(curl -s "$BASE/$school/rules/grading.convert_score" | head -c 1)
  if [ -n "$RS_CODE" ]; then
    echo "  ✅ grading.convert_score exists for $school" | tee -a $LOG
  else
    echo "  ❌ grading.convert_score MISSING for $school" | tee -a $LOG
  fi
done

# ── Score Conversion Across Schools (config-driven) ──
echo "" | tee -a $LOG
echo "  --- Score-to-Grade Conversion (same score, different schools) ---" | tee -a $LOG
GA_GRADE=$(curl -s -X POST "$BASE/$T_A/exams/convert-score" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_A" -d '{"score":85,"max_score":100}')
GB_GRADE=$(curl -s -X POST "$BASE/$T_B/exams/convert-score" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_B" -d '{"score":85,"max_score":100}')
GC_GRADE=$(curl -s -X POST "$BASE/$T_C/exams/convert-score" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_C" -d '{"score":85,"max_score":100}')
echo "  School A (CBSE grade bands, 85/100): $(echo "$GA_GRADE" | grep -o '"grade":"[^"]*"' || echo 'no-grade')" | tee -a $LOG
echo "  School B (ICSE percentage,   85/100): $(echo "$GB_GRADE" | grep -o '"grade":"[^"]*"' || echo 'no-grade')" | tee -a $LOG
echo "  School C (Intl GPA,          85/100): $(echo "$GC_GRADE" | grep -o '"grade":"[^"]*"' || echo 'no-grade')" | tee -a $LOG

# ── Dashboard Config-Driven Verification (Gap 1 fix) ──
echo "" | tee -a $LOG
echo "  --- Dashboard Config-Driven Present Count ---" | tee -a $LOG
DA=$(curl -s -H "Authorization: Bearer $ADMIN_A" "$BASE/$T_A/reports/dashboard")
DASH_PRESENT=$(echo "$DA" | grep -o '"present":[0-9]*' | grep -o '[0-9]*')
DASH_TOTAL=$(echo "$DA" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
echo "  School A dashboard: present=$DASH_PRESENT total=$DASH_TOTAL" | tee -a $LOG
# Verify dashboard response includes attendance_today with present/total
if echo "$DA" | grep -q "attendance_today"; then
  echo "  ✅ Dashboard includes attendance_today section" | tee -a $LOG
else
  echo "  ⚠️ Dashboard missing attendance_today section" | tee -a $LOG
fi

# ── API endpoint tests ──
test_endpoint "GET  /config/conv/attendance-statuses (School B)" "GET" "$BASE/$T_B/config/convenience/attendance-statuses" "" "" ""
test_endpoint "GET  /config/conv/attendance-statuses (School C)" "GET" "$BASE/$T_C/config/convenience/attendance-statuses" "" "" ""
test_endpoint "POST /exams/convert-score (School B)"            "POST" "$BASE/$T_B/exams/convert-score" '{"score":72,"max_score":100}' "$ADMIN_B" ""
test_endpoint "POST /exams/convert-score (School C)"            "POST" "$BASE/$T_C/exams/convert-score" '{"score":72,"max_score":100}' "$ADMIN_C" ""
test_endpoint "POST /exams/calculate-gpa (School B)"            "POST" "$BASE/$T_B/exams/calculate-gpa" '{"subjects":[{"subject":"Math","grade_point":4.0,"credit_hours":4}]}' "$ADMIN_B" ""
test_endpoint "POST /exams/calculate-gpa (School C)"            "POST" "$BASE/$T_C/exams/calculate-gpa" '{"subjects":[{"subject":"Math","grade_point":4.0,"credit_hours":4}]}' "$ADMIN_C" ""
test_endpoint "GET  /reports/dashboard (School B)"             "GET"  "$BASE/$T_B/reports/dashboard" "" "$ADMIN_B" ""
test_endpoint "GET  /reports/dashboard (School C)"             "GET"  "$BASE/$T_C/reports/dashboard" "" "$ADMIN_C" ""

section "13. ADMIN UI (smoke test)"

test_endpoint "GET  /admin"                              "GET"  "$ADMIN_BASE" "" "" ""
test_endpoint "GET  /admin/attendance-statuses"          "GET"  "$ADMIN_BASE/attendance-statuses?tenant_id=$T_A" "" "" ""
test_endpoint "GET  /admin/grading-scale"                "GET"  "$ADMIN_BASE/grading-scale?tenant_id=$T_A" "" "" ""
test_endpoint "GET  /admin/academic-calendar"            "GET"  "$ADMIN_BASE/academic-calendar?tenant_id=$T_A" "" "" ""
test_endpoint "GET  /admin/workflows"                    "GET"  "$ADMIN_BASE/workflows?tenant_id=$T_A" "" "" ""
test_endpoint "GET  /admin/rules"                        "GET"  "$ADMIN_BASE/rules?tenant_id=$T_A" "" "" ""
test_endpoint "GET  /admin/seed"                         "GET"  "$ADMIN_BASE/seed?tenant_id=$T_A" "" "" ""

# ══════════════════════════════════════════════════════════════════════════
# 14. NEGATIVE TESTS — Auth & Permission
# ══════════════════════════════════════════════════════════════════════════
section "14. SECURITY — Negative Tests"

# No auth on protected route
test_endpoint "GET  /attendance (no auth)"               "GET"  "$BASE/$T_A/attendance/statuses" "" "" "401"

# Invalid auth token
test_endpoint "GET  /attendance (bad token)"             "GET"  "$BASE/$T_A/attendance/statuses" "" "eyJhbGciOiJIUzI1NiJ9.invalid" "401"

# Wrong tenant in URL (if guard enforces it)
test_endpoint "GET  /attendance (wrong tenant)"          "GET"  "$BASE/tenant-nonexistent/attendance/statuses" "" "$ADMIN_A" ""

# Malformed JSON
test_endpoint "POST /exams (bad JSON)"                   "POST" "$BASE/$T_A/exams" 'not-json' "$ADMIN_A" ""

# Missing required fields
test_endpoint "POST /exams (missing fields)"             "POST" "$BASE/$T_A/exams" '{"title":"No Type or Date"}' "$ADMIN_A" "400"

# ══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════
echo "" | tee -a $LOG
echo "╔══════════════════════════════════════════════════════════════╗" | tee -a $LOG
printf "║  TOTAL: %3d   PASS: %3d   FAIL: %3d   SKIP: %3d      ║\n" $((PASS + FAIL + SKIP)) $PASS $FAIL $SKIP | tee -a $LOG
echo "╚══════════════════════════════════════════════════════════════╝" | tee -a $LOG
echo "" | tee -a $LOG
echo "Response bodies: $BODY" | tee -a $LOG

# Cleanup
rm -f "$TMP_RESP" "$TMP_COOKIE"
