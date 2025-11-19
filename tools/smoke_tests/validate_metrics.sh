#!/usr/bin/env bash
# Metrics Validation Script for EthixAI Day 29
# Validates Prometheus metrics endpoints and expected metrics presence
set -euo pipefail

RED="\033[31m"; GRN="\033[32m"; YEL="\033[33m"; BLU="\033[34m"; NC="\033[0m"
BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
AI_CORE_URL="${AI_CORE_URL:-http://localhost:8100}"

log() { printf "${BLU}[metrics]${NC} %s\n" "$*"; }
ok() { printf "${GRN}✓${NC} %s\n" "$*"; }
fail() { printf "${RED}✗${NC} %s\n" "$*"; }
warn() { printf "${YEL}⚠${NC} %s\n" "$*"; }

FAIL_COUNT=0

log "Validating Prometheus metrics endpoints..."

# Backend metrics
log "Checking backend metrics at $BACKEND_URL/metrics"
BACKEND_METRICS=$(curl -sf "$BACKEND_URL/metrics" 2>&1 || echo "")
if [[ -z "$BACKEND_METRICS" ]]; then
  fail "Backend /metrics endpoint unreachable"
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  ok "Backend /metrics reachable"
  
  # Check for expected counters (using actual metric names from server.js)
  EXPECTED_BACKEND=(
    "http_requests_total"
    "http_request_duration_seconds"
    "process_cpu_seconds_total"
    "nodejs_heap_size_total_bytes"
  )
  
  for metric in "${EXPECTED_BACKEND[@]}"; do
    if echo "$BACKEND_METRICS" | grep -q "^$metric"; then
      ok "Found metric: $metric"
    else
      warn "Missing metric: $metric"
    fi
  done
  
  # Check for non-zero request count
  REQ_COUNT=$(echo "$BACKEND_METRICS" | grep "http_requests_total" | head -1 | awk '{print $NF}' || echo "0")
  if [[ "$REQ_COUNT" != "0" ]] && [[ -n "$REQ_COUNT" ]]; then
    ok "Backend has processed requests (count: $REQ_COUNT)"
  else
    warn "Backend request counter is zero or unavailable"
  fi
fi

# AI Core metrics
log "Checking AI Core metrics at $AI_CORE_URL/metrics"
AI_METRICS=$(curl -sfL "$AI_CORE_URL/metrics" 2>&1 || echo "")
if [[ -z "$AI_METRICS" ]]; then
  fail "AI Core /metrics endpoint unreachable"
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  ok "AI Core /metrics reachable"
  
  # Check for expected metrics
  EXPECTED_AI=(
    "process_cpu_seconds_total"
    "python_info"
  )
  
  for metric in "${EXPECTED_AI[@]}"; do
    if echo "$AI_METRICS" | grep -q "^$metric"; then
      ok "Found metric: $metric"
    else
      warn "Missing metric: $metric"
    fi
  done
fi

# Structured logging validation (sample recent backend logs)
log "Validating structured logging format..."
if command -v docker >/dev/null 2>&1; then
  RECENT_LOGS=$(docker logs ethixai-system_api-1 --tail 20 2>&1 || echo "")
  if [[ -n "$RECENT_LOGS" ]]; then
    if echo "$RECENT_LOGS" | grep -q "request_id"; then
      ok "Backend logs include request_id"
    else
      warn "Backend logs missing request_id (may not have processed requests yet)"
    fi
    
    if echo "$RECENT_LOGS" | grep -q "user_id"; then
      ok "Backend logs include user_id"
    fi
    
    if echo "$RECENT_LOGS" | grep -q "duration"; then
      ok "Backend logs include duration"
    fi
  else
    warn "Could not retrieve docker logs for backend (container may not be named ethixai-system_api-1)"
  fi
else
  warn "Docker not available; skipping log validation"
fi

log "=========================================="
if [[ $FAIL_COUNT -eq 0 ]]; then
  printf "${GRN}✓ Metrics validation PASSED${NC}\n"
  log "All critical metrics endpoints are functional."
else
  printf "${RED}✗ Metrics validation FAILED${NC} ($FAIL_COUNT critical issues)\n"
  exit 1
fi
log "=========================================="
exit 0
