#!/usr/bin/env bash
# Day 13 — Full Integration Testing + Failure Drills + Resilience Validation
# This script orchestrates end-to-end user flows, cross-service failures,
# observability checks, and generates a summary report.

set -euo pipefail

# ---------- Config ----------
BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
AICORE_URL="${AICORE_URL:-http://localhost:8100}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
WORKDIR="$(cd "$(dirname "$0")/.." && pwd)"  # tools/
ROOT_DIR="$(cd "$WORKDIR/.." && pwd)"
REPORT_DIR="$ROOT_DIR/docs/reports"
REPORT_FILE="$REPORT_DIR/day13-integration-report.md"
LOG_DIR="$ROOT_DIR/tmp/day13"
HEADERS_OUT="$LOG_DIR/resp_headers.txt"

mkdir -p "$REPORT_DIR" "$LOG_DIR"

# ---------- Helpers ----------
log() { printf "[%s] %s\n" "$(date -u +%H:%M:%S)" "$*"; }
section() { echo; echo "== $* =="; }
hr() { printf -- '---\n'; }
http() { curl -sS -D "$HEADERS_OUT" -o "$LOG_DIR/resp_body.json" -w "%{http_code}" "$@"; }
json() { jq -C . "$@" 2>/dev/null || cat "$@"; }
sleep_for() { local s=${1:-2}; log "sleeping ${s}s..."; sleep "$s"; }

append_report() { echo "$*" >> "$REPORT_FILE"; }
append_report_hr() { echo "" >> "$REPORT_FILE"; echo "---" >> "$REPORT_FILE"; echo "" >> "$REPORT_FILE"; }

# ---------- Start stack ----------
section "Start docker compose stack"
cd "$ROOT_DIR"
log "Bringing up stack with $COMPOSE_FILE"
docker compose -f "$COMPOSE_FILE" up -d --build

# Wait for backend health
section "Wait for backend health"
ATTEMPTS=60
until curl -fsS "$BACKEND_URL/health" >/dev/null 2>&1 || [ $ATTEMPTS -le 0 ]; do
  sleep 2; ATTEMPTS=$((ATTEMPTS-1))
done
if ! curl -fsS "$BACKEND_URL/health" >/dev/null 2>&1; then
  log "Backend not healthy"; docker compose logs system_api || true; exit 1
fi
log "Backend healthy"

# ---------- E2E happy path ----------
section "E2E: register → login → analyze → fetch report → token refresh → logout/login"
EMAIL="day13_$(date +%s%N)@example.com"
PASSWORD="Str0ngPassw0rd!"
NAME="Day13 User"

log "Register user"
REG_CODE=$(http -H 'Content-Type: application/json' -X POST "$BACKEND_URL/auth/register" \
  --data "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
cat "$LOG_DIR/resp_body.json" > "$LOG_DIR/register.json"
log "Register HTTP: $REG_CODE"

log "Login user"
LOGIN_CODE=$(http -H 'Content-Type: application/json' -X POST "$BACKEND_URL/auth/login" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"deviceName\":\"Day13 Device\"}")
cat "$LOG_DIR/resp_body.json" > "$LOG_DIR/login.json"; json "$LOG_DIR/login.json" >/dev/null || true
ACCESS_TOKEN=$(jq -r .accessToken "$LOG_DIR/login.json" 2>/dev/null || echo "")
REFRESH_TOKEN=$(jq -r .refreshToken "$LOG_DIR/login.json" 2>/dev/null || echo "")
[ -z "$ACCESS_TOKEN" ] && { log "No access token"; exit 1; }

log "Run analysis"
read -r -d '' ANALYZE_DATA <<'EOF'
{
  "data": {
    "x": [[0.1,0.9],[0.3,0.7],[0.8,0.2],[0.9,0.1]],
    "y": [0,0,1,1],
    "sensitive_attributes": [0,0,1,1]
  },
  "parameters": {
    "model_type": "logistic_regression",
    "sensitive_attribute_name": "group",
    "group_0_name": "A",
    "group_1_name": "B"
  }
}
EOF
AN_CODE=$(http -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -X POST "$BACKEND_URL/analyze" --data "$ANALYZE_DATA")
cat "$LOG_DIR/resp_body.json" > "$LOG_DIR/analyze.json"; log "Analyze HTTP: $AN_CODE"
REPORT_ID=$(jq -r '.reportId // .report_id // .id // empty' "$LOG_DIR/analyze.json")
[ -z "$REPORT_ID" ] && { log "No report id"; exit 1; }

sleep_for 2
log "Fetch report $REPORT_ID"
RPT_CODE=$(http -H "Authorization: Bearer $ACCESS_TOKEN" "$BACKEND_URL/reports/$REPORT_ID")
cat "$LOG_DIR/resp_body.json" > "$LOG_DIR/report.json"; log "Report HTTP: $RPT_CODE"

log "Token refresh"
REF_CODE=$(http -H 'Content-Type: application/json' -X POST "$BACKEND_URL/auth/refresh" \
  --data "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
cat "$LOG_DIR/resp_body.json" > "$LOG_DIR/refresh.json"; log "Refresh HTTP: $REF_CODE"
NEW_ACCESS=$(jq -r .accessToken "$LOG_DIR/refresh.json" 2>/dev/null || echo "")
[ -z "$NEW_ACCESS" ] && log "Refresh did not return new access token"

# ---------- Observability validation ----------
section "Observability: metrics + request id correlation"
log "Backend /metrics"
BACK_MET=$(curl -fsS "$BACKEND_URL/metrics" || true)
echo "$BACK_MET" > "$LOG_DIR/backend_metrics.txt"
log "ai_core /metrics"
AI_MET=$(curl -fsS "$AICORE_URL/metrics" || true)
echo "$AI_MET" > "$LOG_DIR/ai_core_metrics.txt"

# Simple assertions
echo "$BACK_MET" | grep -q 'http_requests_total' && BACK_REQ_OK=1 || BACK_REQ_OK=0
echo "$AI_MET"   | grep -q 'http_requests_total' && AI_REQ_OK=1   || AI_REQ_OK=0

echo "$AI_MET"   | grep -q 'analyze_seconds' && AI_HIST_OK=1 || AI_HIST_OK=0

REQ_ID=$(grep -i '^x-request-id:' "$HEADERS_OUT" | awk '{print $2}' | tr -d '\r' || true)
[ -n "$REQ_ID" ] && log "Captured X-Request-Id: $REQ_ID"

# ---------- Failure drills ----------
section "Failure drill: ai_core crash mid-analysis"
AN_CODE2=$(http -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -X POST "$BACKEND_URL/analyze" --data "$ANALYZE_DATA" --max-time 25 & echo $!)
# give request a moment to reach ai_core, then kill ai_core
sleep 1
docker compose kill ai_core || true
sleep 3
docker compose up -d ai_core
sleep 3

# we don't strictly parse the concurrent result here; focus on recovery
RECOVER_OK=0
if curl -fsS "$BACKEND_URL/health" >/dev/null 2>&1 && curl -fsS "$AICORE_URL/health" >/dev/null 2>&1; then
  RECOVER_OK=1
fi

section "Failure drill: slow network between backend↔ai_core (pause/unpause)"
docker pause $(docker ps --format '{{.Names}}' | grep ai_core | head -1) 2>/dev/null || true
SLOW_CODE=$(http -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' -X POST \
  "$BACKEND_URL/analyze" --data "$ANALYZE_DATA" --max-time 15 || true)
docker unpause $(docker ps --format '{{.Names}}' | grep ai_core | head -1) 2>/dev/null || true
sleep 2

section "Failure drill: token refresh failure"
BAD_REFRESH=$(http -H 'Content-Type: application/json' -X POST "$BACKEND_URL/auth/refresh" \
  --data '{"refreshToken":"corrupted.refresh.token"}')
log "Bad refresh HTTP: $BAD_REFRESH (expect 401/400)"

section "Failure drill: backend crash during analysis"
# Start an analysis, then restart backend
( http -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' -X POST \
  "$BACKEND_URL/analyze" --data "$ANALYZE_DATA" --max-time 30 || true ) &
sleep 1
docker compose restart system_api || true
sleep 5
BACK_RECOVER=0
curl -fsS "$BACKEND_URL/health" >/dev/null 2>&1 && BACK_RECOVER=1

# ---------- Report generation ----------
section "Generate Day 13 report"
: > "$REPORT_FILE"
append_report "# Day 13 — Integration & Resilience Report"
append_report "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
append_report_hr
append_report "## End-to-End Journey"
append_report "- Register: HTTP $REG_CODE"
append_report "- Login: HTTP $LOGIN_CODE"
append_report "- Analyze: HTTP $AN_CODE → reportId=${REPORT_ID:-N/A}"
append_report "- Report fetch: HTTP $RPT_CODE"
append_report "- Token refresh: HTTP $REF_CODE"
append_report_hr
append_report "## Observability"
append_report "- Backend metrics contains http_requests_total: $BACK_REQ_OK"
append_report "- ai_core metrics contains http_requests_total: $AI_REQ_OK"
append_report "- ai_core histogram (analyze_seconds) present: $AI_HIST_OK"
append_report "- Captured X-Request-Id: ${REQ_ID:-none}"
append_report_hr
append_report "## Failure Drills"
append_report "- ai_core crash → services recovered: $RECOVER_OK"
append_report "- slow path (pause) analyze HTTP result code: $SLOW_CODE (value may be 000 on timeout)"
append_report "- bad refresh token → HTTP $BAD_REFRESH (expect 400/401)"
append_report "- backend restart during analysis → backend recovered: $BACK_RECOVER"
append_report_hr
append_report "## Next Steps (Day 14 prep)"
append_report "- Parameterize latency windows and timeouts; capture 95th/99th percentile in histograms"
append_report "- Add browser-based flows (Playwright) to verify UX loaders and retry UI"
append_report "- Establish load profile and run k6/locust to baseline throughput"

log "Report written to $REPORT_FILE"

# Exit code: fail if core E2E steps failed or observability missing
FAIL=0
[ "$REG_CODE" != "200" ] && FAIL=1
[ -z "$ACCESS_TOKEN" ] && FAIL=1
[ -z "$REPORT_ID" ] && FAIL=1
[ "$BACK_REQ_OK" -eq 0 ] && FAIL=1
[ "$AI_REQ_OK" -eq 0 ] && FAIL=1
if [ $FAIL -eq 1 ]; then
  log "One or more critical validations failed. See $REPORT_FILE"
  exit 1
fi

log "Day 13 integration validation passed core checks."
