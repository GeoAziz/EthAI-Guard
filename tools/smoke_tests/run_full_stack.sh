#!/usr/bin/env bash
# Orchestrates Day 29 end-to-end: build, up, wait for health, run smoke & metrics, print summary
set -euo pipefail

RED="\033[31m"; GRN="\033[32m"; YEL="\033[33m"; BLU="\033[34m"; NC="\033[0m"
ROOT_DIR=$(cd "$(dirname "$0")/../../" && pwd)
cd "$ROOT_DIR"

BACKEND_URL=${BACKEND_URL:-http://localhost:5000}
AI_CORE_URL=${AI_CORE_URL:-http://localhost:8100}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
PROM_URL=${PROM_URL:-http://localhost:9090}

log() { printf "${BLU}[full-stack]${NC} %s\n" "$*"; }
ok() { printf "${GRN}✓${NC} %s\n" "$*"; }
warn() { printf "${YEL}⚠${NC} %s\n" "$*"; }
fail() { printf "${RED}✗${NC} %s\n" "$*"; exit 1; }

log "Building images..."
docker-compose build

log "Starting services..."
docker-compose up -d

# Wait helpers
wait_http_ok() {
  local url="$1"; local name="$2"; local tries=60; local sleep_s=2
  for i in $(seq 1 $tries); do
    if curl -sf "$url" >/dev/null 2>&1; then ok "$name is up: $url"; return 0; fi
    sleep "$sleep_s"
  done
  return 1
}

log "Waiting for health endpoints..."
wait_http_ok "$BACKEND_URL/health" "backend" || fail "backend not healthy at $BACKEND_URL/health"
wait_http_ok "$AI_CORE_URL/health" "ai_core" || warn "ai_core health not reachable at $AI_CORE_URL/health"
wait_http_ok "$FRONTEND_URL" "frontend" || warn "frontend not reachable at $FRONTEND_URL"
wait_http_ok "$PROM_URL" "prometheus" || warn "prometheus not reachable at $PROM_URL"

log "Running full integration smoke tests..."
./tools/smoke_tests/full_integration.sh || fail "smoke tests failed"

log "Validating metrics endpoints..."
./tools/smoke_tests/validate_metrics.sh || warn "metrics validation reported issues"

log "All steps completed. Review logs with: docker-compose logs --tail=200"
ok "Day 29 full-stack smoke and metrics validation complete"
