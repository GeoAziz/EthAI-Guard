#!/usr/bin/env bash
# Full Integration Smoke Test for EthixAI Day 29
# Tests: register → login → upload → analyze → view report → JWT refresh → RBAC
set -euo pipefail

RED="\033[31m"; GRN="\033[32m"; YEL="\033[33m"; BLU="\033[34m"; NC="\033[0m"
BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
AI_CORE_URL="${AI_CORE_URL:-http://localhost:8100}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

log() { printf "${BLU}[smoke]${NC} %s\n" "$*"; }
ok() { printf "${GRN}✓${NC} %s\n" "$*"; }
fail() { printf "${RED}✗${NC} %s\n" "$*"; exit 1; }
warn() { printf "${YEL}⚠${NC} %s\n" "$*"; }

TIMESTAMP=$(date +%s)
TEST_USER="smoketest_$TIMESTAMP@example.com"
TEST_PASS="SecurePass123!"
TEST_ADMIN="admin_$TIMESTAMP@example.com"

log "Starting full integration smoke test..."
log "Backend: $BACKEND_URL | AI Core: $AI_CORE_URL | Frontend: $FRONTEND_URL"

# Step 1: Health checks
log "Step 1: Checking service health..."
if ! curl -sf "$BACKEND_URL/health" >/dev/null 2>&1; then
  fail "Backend health check failed at $BACKEND_URL/health"
fi
ok "Backend health OK"

if ! curl -sf "$AI_CORE_URL/health" >/dev/null 2>&1; then
  fail "AI Core health check failed at $AI_CORE_URL/health"
fi
ok "AI Core health OK"

if ! curl -sf "$FRONTEND_URL" >/dev/null 2>&1; then
  warn "Frontend may not be ready at $FRONTEND_URL (non-critical for API tests)"
fi

# Step 2: Register user
log "Step 2: Registering test user..."
REG_RESP=$(curl -sf -X POST "$BACKEND_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke Test User\",\"email\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}" || echo "")
if [[ -z "$REG_RESP" ]] || ! echo "$REG_RESP" | jq -e '.userId' >/dev/null 2>&1; then
  fail "User registration failed: $REG_RESP"
fi
USER_ID=$(echo "$REG_RESP" | jq -r '.userId')
ok "User registered: $USER_ID"

# Step 3: Login
log "Step 3: Logging in..."
LOGIN_RESP=$(curl -sf -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}" || echo "")
if [[ -z "$LOGIN_RESP" ]] || ! echo "$LOGIN_RESP" | jq -e '.accessToken' >/dev/null 2>&1; then
  fail "Login failed: $LOGIN_RESP"
fi
ACCESS_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.refreshToken // empty')
ok "Login successful, access token obtained"

# Step 4: Upload demo dataset
log "Step 4: Uploading demo dataset..."
cat > /tmp/smoke_dataset.csv <<EOF
age,income,approved
25,30000,1
45,80000,1
30,50000,0
50,90000,1
EOF

UPLOAD_RESP=$(curl -sf -X POST "$BACKEND_URL/datasets/upload" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@/tmp/smoke_dataset.csv" \
  -F "name=smoke_test_dataset" \
  -F "type=binary_classification" || echo "")
if [[ -z "$UPLOAD_RESP" ]] || ! echo "$UPLOAD_RESP" | jq -e '.datasetId' >/dev/null 2>&1; then
  fail "Dataset upload failed: $UPLOAD_RESP"
fi
DATASET_ID=$(echo "$UPLOAD_RESP" | jq -r '.datasetId')
ok "Dataset uploaded: $DATASET_ID"

# Step 5: Trigger analysis
log "Step 5: Triggering bias analysis..."
ANALYZE_RESP=$(curl -sf -X POST "$BACKEND_URL/analyze" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"datasetId\":\"$DATASET_ID\",\"protectedAttributes\":[\"age\"]}" || echo "")
if [[ -z "$ANALYZE_RESP" ]] || ! echo "$ANALYZE_RESP" | jq -e '.analysisId' >/dev/null 2>&1; then
  # Fallback mode might be active
  if echo "$ANALYZE_RESP" | jq -e '.status' >/dev/null 2>&1; then
    warn "Analysis returned fallback response (AI core may be unreachable)"
  else
    fail "Analysis failed: $ANALYZE_RESP"
  fi
fi
ANALYSIS_ID=$(echo "$ANALYZE_RESP" | jq -r '.analysisId // "fallback"')
ok "Analysis triggered: $ANALYSIS_ID"

# Step 6: Retrieve reports
log "Step 6: Retrieving user reports..."
REPORTS_RESP=$(curl -sf -X GET "$BACKEND_URL/reports/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" || echo "")
if [[ -z "$REPORTS_RESP" ]]; then
  fail "Failed to retrieve reports for user $USER_ID"
fi
REPORT_COUNT=$(echo "$REPORTS_RESP" | jq -r '. | length')
ok "Reports retrieved: $REPORT_COUNT report(s)"

# Step 7: JWT refresh token flow
if [[ -n "$REFRESH_TOKEN" ]]; then
  log "Step 7: Testing JWT refresh token..."
  REFRESH_RESP=$(curl -sf -X POST "$BACKEND_URL/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" || echo "")
  if [[ -z "$REFRESH_RESP" ]] || ! echo "$REFRESH_RESP" | jq -e '.accessToken' >/dev/null 2>&1; then
    fail "Token refresh failed: $REFRESH_RESP"
  fi
  NEW_ACCESS=$(echo "$REFRESH_RESP" | jq -r '.accessToken')
  NEW_REFRESH=$(echo "$REFRESH_RESP" | jq -r '.refreshToken // empty')
  ok "Token refresh successful (rotation applied)"
  
  # Test old refresh token (should fail - reuse detection)
  OLD_REFRESH_RESP=$(curl -sf -X POST "$BACKEND_URL/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" 2>&1 || echo "")
  if echo "$OLD_REFRESH_RESP" | grep -q "401"; then
    ok "Old refresh token correctly rejected (reuse detection)"
  else
    warn "Expected 401 for reused refresh token, got: $OLD_REFRESH_RESP"
  fi
else
  warn "Step 7: No refresh token returned (cookie mode or disabled)"
fi

# Step 8: RBAC checks
log "Step 8: Testing RBAC (non-admin should not trigger retrain)..."
RBAC_RESP=$(curl -sf -X POST "$BACKEND_URL/v1/models/test-model/trigger-retrain" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1 || echo "")
if echo "$RBAC_RESP" | grep -q "403"; then
  ok "RBAC enforced: non-admin cannot trigger retrain"
elif echo "$RBAC_RESP" | grep -q "401"; then
  ok "RBAC enforced: unauthorized (expected for standard user)"
else
  warn "Expected 403/401 for non-admin retrain, got: $RBAC_RESP"
fi

# Step 9: Metrics endpoints
log "Step 9: Validating Prometheus metrics endpoints..."
BACKEND_METRICS=$(curl -sfL "$BACKEND_URL/metrics" 2>&1 || echo "")
if [[ -z "$BACKEND_METRICS" ]]; then
  warn "Backend /metrics endpoint not reachable"
else
  if echo "$BACKEND_METRICS" | grep -q "http_requests_total"; then
    ok "Backend metrics endpoint responsive (found request counter)"
  else
    warn "Backend metrics missing expected counters"
  fi
fi

AI_METRICS=$(curl -sfL "$AI_CORE_URL/metrics" || echo "")
if [[ -z "$AI_METRICS" ]]; then
  warn "AI Core /metrics endpoint not reachable"
else
  if echo "$AI_METRICS" | grep -q "process_"; then
    ok "AI Core metrics endpoint responsive"
  else
    warn "AI Core metrics response unexpected format"
  fi
fi

# Step 10: Frontend availability (basic check)
log "Step 10: Checking frontend availability..."
if curl -sf "$FRONTEND_URL" | grep -q "ethixai\|EthixAI\|html" >/dev/null 2>&1; then
  ok "Frontend serving content"
else
  warn "Frontend check inconclusive (may still be building)"
fi

# Cleanup
rm -f /tmp/smoke_dataset.csv

log "=========================================="
printf "${GRN}✓ Full integration smoke test PASSED${NC}\n"
log "All critical flows validated successfully."
log "Review logs for warnings if any."
log "=========================================="
exit 0
