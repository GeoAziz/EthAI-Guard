#!/usr/bin/env bash
set -euo pipefail

# Day 10 Chaos/Stress Suite
# Scenarios:
#   1) Kill ai_core container during analyze → expect 5xx at peak then recovery
#   2) Restart MongoDB during idle → system recovers without data loss
#   3) Pause/unpause ai_core (simulate network freeze) → requests time out or recover

BACKEND_URL=${BACKEND_URL:-http://localhost:5000}
AI_CORE_URL=${AI_CORE_URL:-http://localhost:8100}

echo "Using BACKEND_URL=$BACKEND_URL AI_CORE_URL=$AI_CORE_URL"

function curl_json() {
  url="$1"
  data="$2"
  curl -sS -H 'Content-Type: application/json' -d "$data" "$url"
}

function health_checks() {
  echo "[health] backend: $(curl -sS "$BACKEND_URL/health" || echo fail)"
  echo "[health] ai_core: $(curl -sS "$AI_CORE_URL/health" || echo fail)"
}

function register_and_login() {
  local email="chaos_$(date +%s%N)@example.com"
  local password="P@ssword1234!"
  curl_json "$BACKEND_URL/auth/register" "{\"name\":\"Chaos\",\"email\":\"$email\",\"password\":\"$password\"}" >/dev/null || true
  token=$(curl_json "$BACKEND_URL/auth/login" "{\"email\":\"$email\",\"password\":\"$password\"}" | jq -r '.accessToken // empty')
  if [ -z "$token" ]; then
    echo "login failed" >&2; exit 1
  fi
  echo "$token"
}

function analyze_once() {
  local token="$1"
  payload='{"dataset_name":"chaos","data":{"features":[1,2,3,4],"sensitive_attr":[0,1,0,1],"labels":[0,1,0,1]}}'
  curl -sS -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "$payload" "$BACKEND_URL/analyze" || true
}

echo "== Scenario 0: Sanity health checks =="
health_checks

echo "== Preparing auth token =="
ACCESS_TOKEN=$(register_and_login)
echo "token acquired"

echo "== Scenario 1: Kill ai_core during analyze =="
analyze_once "$ACCESS_TOKEN" &
pid=$!
sleep 0.5
docker compose kill ai_core || true
wait $pid || true
docker compose up -d ai_core
sleep 2
health_checks

echo "== Scenario 2: Restart Mongo =="
docker compose restart mongo
sleep 2
health_checks

echo "== Scenario 3: Pause/unpause ai_core =="
docker pause ethai-guard-ai_core-1 2>/dev/null || docker pause $(docker ps --format '{{.Names}}' | grep ai_core | head -1) || true
sleep 2
docker unpause ethai-guard-ai_core-1 2>/dev/null || docker unpause $(docker ps --format '{{.Names}}' | grep ai_core | head -1) || true
health_checks

echo "== Done. Check Prometheus metrics for error spikes and recovery =="
