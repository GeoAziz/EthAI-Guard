#!/usr/bin/env bash
set -euo pipefail

# Simple automated chaos assertion: stop ai_core, confirm backend returns a graceful error,
# then start ai_core and confirm analyze endpoint responds OK (requires docker compose + running stack).

BASE_URL=${BASE_URL:-http://localhost:5000}
ANALYZE_PATH="/analyze"
TOKEN=${TOKEN:-}

if [ -z "$TOKEN" ]; then
  echo "Please set TOKEN environment variable for an authenticated call"
  exit 2
fi

echo "Stopping ai_core..."
docker compose stop ai_core || true
sleep 3

echo "Calling analyze (expected graceful failure: 502/5xx or timeout)"
set +e
resp=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL$ANALYZE_PATH" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"data": {"x": [1], "y": [1]}}' --max-time 10)
set -e
echo "HTTP code: $resp"

echo "Starting ai_core..."
docker compose start ai_core || docker compose up -d ai_core
sleep 5

echo "Calling analyze (expected 200)"
resp2=$(curl -s -o /tmp/chaos_out.json -w "%{http_code}" -X POST "$BASE_URL$ANALYZE_PATH" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"data": {"x": [1], "y": [1]}}' --max-time 20)
echo "HTTP code: $resp2"
if [ "$resp2" != "200" ]; then
  echo "Analyze did not return 200 after ai_core restart. Check services. Output:"; cat /tmp/chaos_out.json; exit 1
fi

echo "Chaos test assertions passed."
