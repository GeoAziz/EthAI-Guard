#!/usr/bin/env bash#!/usr/bin/env bash

set -euo pipefailset -euo pipefail



ROOT=$(cd "$(dirname "$0")/../../" && pwd)ROOT=$(cd "$(dirname "$0")/../../" && pwd)

cd "$ROOT"cd "$ROOT"



echo "Starting ephemeral compose environment (build & up)"echo "Starting ephemeral compose environment (build & up)"

docker compose up --build -ddocker compose up --build -d



echo "Waiting for backend health..."echo "Waiting for backend health..."

for i in {1..30}; dofor i in {1..30}; do

  if curl -sS http://localhost:5000/health 2>/dev/null | grep -q backend; then  if curl -sS http://localhost:5000/health | grep -q backend; then

    echo "backend healthy"; break    echo "backend healthy"; break

  fi  fi

  sleep 2  sleep 2

donedone



echo "Registering test user"echo "Registering test user"

REG=$(curl -sS -X POST http://localhost:5000/auth/register -H 'Content-Type: application/json' -d '{"name":"ci","email":"ci@example.com","password":"verylongpassword18"}')REG=$(curl -sS -X POST http://localhost:5000/auth/register -H 'Content-Type: application/json' -d '{"name":"ci","email":"ci@example.com","password":"verylongpassword12"}')

echo "Register response: $REG"echo "Register response: $REG"



LOGIN=$(curl -sS -X POST http://localhost:5000/auth/login -H 'Content-Type: application/json' -d '{"email":"ci@example.com","password":"verylongpassword18"}')LOGIN=$(curl -sS -X POST http://localhost:5000/auth/login -H 'Content-Type: application/json' -d '{"email":"ci@example.com","password":"verylongpassword12"}')

TOKEN=$(echo "$LOGIN" | jq -r .accessToken)TOKEN=$(echo "$LOGIN" | jq -r .accessToken)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; thenif [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then

  echo "Login failed: $LOGIN"; exit 2  echo "Login failed: $LOGIN"; exit 2

fifi

echo "Got token"echo "Got token"



echo "Calling analyze"echo "Calling analyze"

AN=$(curl -sS -w "\n%{http_code}" -X POST http://localhost:5000/analyze -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"data": {"x": [1,2,3,4], "y": [0,1,0,1]}}')AN=$(curl -sS -w "\n%{http_code}" -X POST http://localhost:5000/analyze -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"data": {"x": [1,2,3,4], "y": [0,1,0,1]}}')

HTTP=$(echo "$AN" | tail -n1)HTTP=$(echo "$AN" | tail -n1)

BODY=$(echo "$AN" | sed '$d')BODY=$(echo "$AN" | sed '$d')

echo "Analyze HTTP: $HTTP"echo "Analyze HTTP: $HTTP"

echo "Analyze body: $BODY"echo "Analyze body: $BODY"

if [ "$HTTP" != "200" ]; thenif [ "$HTTP" != "200" ]; then

  echo "Analyze failed"; docker compose logs > /tmp/chaos_logs.txt; exit 3  echo "Analyze failed"; docker compose logs > /tmp/chaos_logs.txt; exit 3

fifi



REPORT_ID=$(echo "$BODY" | jq -r .reportId)REPORT_ID=$(echo "$BODY" | jq -r .reportId)

if [ -z "$REPORT_ID" ] || [ "$REPORT_ID" = "null" ]; thenif [ -z "$REPORT_ID" ] || [ "$REPORT_ID" = "null" ]; then

  echo "No report id"; docker compose logs > /tmp/chaos_logs.txt; exit 4  echo "No report id"; docker compose logs > /tmp/chaos_logs.txt; exit 4

fifi

echo "Report created: $REPORT_ID"echo "Report created: $REPORT_ID"



echo "Scraping metrics"echo "Scraping metrics"

curl -sS http://localhost:5000/metrics -o /tmp/backend_metrics.promcurl -sS http://localhost:5000/metrics -o /tmp/backend_metrics.prom

curl -sS http://localhost:8100/metrics -o /tmp/ai_core_metrics.prom || truecurl -sS http://localhost:8100/metrics -o /tmp/ai_core_metrics.prom || true

docker compose logs > /tmp/chaos_logs.txt || truedocker compose logs > /tmp/chaos_logs.txt || true



echo "Asserting no 5xx responses in backend metrics"echo "Asserting no 5xx responses in backend metrics"

if grep -E 'http_requests_total\{.*status="5' /tmp/backend_metrics.prom >/dev/null; thenif grep -E 'http_requests_total\{.*status="5' /tmp/backend_metrics.prom >/dev/null; then

  echo "Found 5xx in metrics"; exit 5  echo "Found 5xx in metrics"; exit 5

fifi



echo "Compute mean ai_core duration if present"echo "Compute mean ai_core duration if present"

if grep -q '^ai_core_analysis_seconds_sum' /tmp/backend_metrics.prom; thenif grep -q '^ai_core_analysis_seconds_sum' /tmp/backend_metrics.prom; then

  SUM=$(grep '^ai_core_analysis_seconds_sum' /tmp/backend_metrics.prom | awk '{print $2}')  SUM=$(grep '^ai_core_analysis_seconds_sum' /tmp/backend_metrics.prom | awk '{print $2}')

  CNT=$(grep '^ai_core_analysis_seconds_count' /tmp/backend_metrics.prom | awk '{print $2}')  CNT=$(grep '^ai_core_analysis_seconds_count' /tmp/backend_metrics.prom | awk '{print $2}')

  if [ -n "$SUM" ] && [ -n "$CNT" ] && awk "BEGIN {exit !($CNT > 0)}"; then  if [ -n "$SUM" ] && [ -n "$CNT" ] && awk "BEGIN {exit !($CNT > 0)}"; then

    MEAN=$(awk "BEGIN {print ${SUM}/${CNT}}")    MEAN=$(awk "BEGIN {print ${SUM}/${CNT}}")

    echo "ai_core mean duration: $MEAN s"    echo "ai_core mean duration: $MEAN s"

  fi  fi

fifi



echo "All assertions passed. Collecting artifacts"echo "All assertions passed. Collecting artifacts"

tar czf /tmp/chaos_artifacts.tgz /tmp/backend_metrics.prom /tmp/ai_core_metrics.prom /tmp/chaos_logs.txt || truetar czf /tmp/chaos_artifacts.tgz /tmp/backend_metrics.prom /tmp/ai_core_metrics.prom /tmp/chaos_logs.txt || true

echo "Artifacts at /tmp/chaos_artifacts.tgz"echo "Artifacts at /tmp/chaos_artifacts.tgz"

echo "✅ Chaos smoke test passed"
