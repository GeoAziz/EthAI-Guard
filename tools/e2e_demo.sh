#!/usr/bin/env bash
set -euo pipefail

# Simple end-to-end demo script for Day 6 — docker-compose based demo
# Requirements: docker, docker compose (v2), curl, jq (optional but recommended)
# Usage: ./tools/e2e_demo.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required. Install Docker and try again." >&2
  exit 2
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose (v2) is required. Ensure 'docker compose' is available." >&2
  exit 2
fi

echo "Bringing up compose stack..."
docker compose -f "$COMPOSE_FILE" up -d --build

BACKEND_URL="http://localhost:5000"
FRONTEND_URL="http://localhost:3000"

wait_for() {
  local url=$1
  local retries=30
  local delay=2
  echo -n "Waiting for $url"
  for i in $(seq 1 $retries); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo " -> up"
      return 0
    fi
    echo -n "."
    sleep $delay
  done
  echo "\nTimed out waiting for $url" >&2
  return 1
}

echo "Waiting for backend health endpoints..."
wait_for "$BACKEND_URL/health" || wait_for "$BACKEND_URL/" || true

echo "Waiting for frontend..."
wait_for "$FRONTEND_URL/" || true

echo "Performing demo actions against backend..."

# 1) Register a quick demo user (ignore failures if already exists)
REG_DATA='{"username":"demo_user","password":"demo_pass"}'
curl -s -H "Content-Type: application/json" -X POST "$BACKEND_URL/auth/register" -d "$REG_DATA" || true

# 2) Login to receive a token
LOGIN_RES=$(curl -s -H "Content-Type: application/json" -X POST "$BACKEND_URL/auth/login" -d "$REG_DATA" || true)
TOKEN=""
if command -v jq >/dev/null 2>&1; then
  TOKEN=$(printf "%s" "$LOGIN_RES" | jq -r '.token // empty')
else
  TOKEN=$(printf "%s" "$LOGIN_RES" | sed -n 's/.*"token"\s*:\s*"\([^"]*\)".*/\1/p') || true
fi

if [ -z "$TOKEN" ]; then
  echo "Warning: couldn't obtain auth token; subsequent calls will run unauthenticated." >&2
else
  echo "Obtained auth token (length: ${#TOKEN})"
fi

# 3) Submit a simple analyze job using a tiny payload
ANALYZE_PAYLOAD='{"columns":[{"name":"age","values":[25,30,45,22,36]},{"name":"income","values":[50000,60000,120000,35000,80000]}],"target":"approved"}'

if [ -z "$TOKEN" ]; then
  ANALYZE_RES=$(curl -s -H "Content-Type: application/json" -X POST "$BACKEND_URL/analyze" -d "$ANALYZE_PAYLOAD" || true)
else
  ANALYZE_RES=$(curl -s -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -X POST "$BACKEND_URL/analyze" -d "$ANALYZE_PAYLOAD" || true)
fi

echo "Analyze response:"
echo "$ANALYZE_RES" | jq -C . || echo "$ANALYZE_RES"

# Try to extract a report id
REPORT_ID=""
if command -v jq >/dev/null 2>&1; then
  REPORT_ID=$(printf "%s" "$ANALYZE_RES" | jq -r '.report_id // .id // empty') || true
else
  REPORT_ID=$(printf "%s" "$ANALYZE_RES" | sed -n 's/.*"report_id"\s*:\s*"\([^"]*\)".*/\1/p') || true
fi

if [ -n "$REPORT_ID" ]; then
  echo "Report created: $REPORT_ID"
  echo "Frontend report URL: $FRONTEND_URL/report/$REPORT_ID"
else
  echo "No report id returned by analyze. Check backend logs or response above." >&2
fi

echo "Demo complete. To tear down the stack run: docker compose -f $COMPOSE_FILE down"
