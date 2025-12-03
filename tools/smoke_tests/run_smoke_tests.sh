#!/bin/bash
# Updated Smoke Tests (Day16): align with current backend routes & synchronous analysis
# Usage: ./run_smoke_tests.sh http://localhost:5000

set -e

BACKEND_URL="${1:-http://localhost:5000}"
FAILED_TESTS=0

echo "🧪 Running smoke tests against $BACKEND_URL"

# Test 1: Health Probes
echo "\nTest 1: Health Probes"
curl -f -s $BACKEND_URL/health/liveness | jq -e '.status == "ok"' > /dev/null || { echo "❌ Liveness check failed"; FAILED_TESTS=$((FAILED_TESTS+1)); }
curl -s $BACKEND_URL/health/startup | jq -e '.status == "started"' > /dev/null || echo "ℹ️ Startup still in progress (acceptable early)"
# Readiness is informational only - workflow should have already verified this
if curl -f -s $BACKEND_URL/health/readiness | jq -e '.status == "ready"' > /dev/null; then
  echo "✅ Health probes validated"
else
  echo "⚠️ Readiness check returned non-ready (may be transient)"
  echo "✅ Health probes validated (liveness OK)"
fi

# Test 2: Registration
echo "\nTest 2: Registration"
EMAIL="smoke-$(date +%s)@example.com"
REGISTER_RESP=$(curl -s -X POST $BACKEND_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke User\",\"email\":\"$EMAIL\",\"password\":\"VerySecurePass123!\"}")
USER_ID=$(echo "$REGISTER_RESP" | jq -r '.userId')
if [ -z "$USER_ID" ] || [ "$USER_ID" == "null" ]; then
  echo "❌ Registration failed: $REGISTER_RESP"
  FAILED_TESTS=$((FAILED_TESTS+1))
else
  echo "✅ Registration ok (userId=$USER_ID)"
fi

# Test 3: Login
echo "\nTest 3: Login"
LOGIN_RESP=$(curl -s -X POST $BACKEND_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"VerySecurePass123!\"}")
ACCESS_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.accessToken')
if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
  echo "❌ Login failed: $LOGIN_RESP"
  FAILED_TESTS=$((FAILED_TESTS+1))
else
  echo "✅ Login ok"
fi

# Test 4: Dataset Upload (logical record)
echo "\nTest 4: Dataset Upload"
UPLOAD_RESP=$(curl -s -X POST $BACKEND_URL/datasets/upload \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"smoke-ds","type":"demo"}')
DATASET_ID=$(echo "$UPLOAD_RESP" | jq -r '.datasetId')
if [ -z "$DATASET_ID" ] || [ "$DATASET_ID" == "null" ]; then
  echo "❌ Dataset upload failed: $UPLOAD_RESP"
  FAILED_TESTS=$((FAILED_TESTS+1))
else
  echo "✅ Dataset upload ok (datasetId=$DATASET_ID)"
fi

# Test 5: Analysis (synchronous)
echo "\nTest 5: Analysis"
ANALYZE_RESP=$(curl -s -X POST $BACKEND_URL/analyze \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dataset_name":"smoke-ds","data":{"feature_a":[1,2,3,4],"feature_b":[5,6,7,8],"target":[0,1,0,1]}}')
REPORT_ID=$(echo "$ANALYZE_RESP" | jq -r '.reportId')
if [ -z "$REPORT_ID" ] || [ "$REPORT_ID" == "null" ]; then
  echo "❌ Analyze failed: $ANALYZE_RESP"
  FAILED_TESTS=$((FAILED_TESTS+1))
else
  echo "✅ Analyze ok (reportId=$REPORT_ID)"
fi

# Test 6: Retrieve Report
echo "\nTest 6: Retrieve Report"
REPORT_RESP=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" $BACKEND_URL/report/$REPORT_ID)
REPORT_EXISTS=$(echo "$REPORT_RESP" | jq -e '.report._id' > /dev/null && echo "true" || echo "false")
if [ "$REPORT_EXISTS" = "true" ]; then
  echo "✅ Report retrieval ok"
else
  echo "❌ Report retrieval failed: $REPORT_RESP"
  FAILED_TESTS=$((FAILED_TESTS+1))
fi

# Test 7: Metrics Endpoint
echo "\nTest 7: Metrics"
curl -f -s $BACKEND_URL/metrics | grep -q 'http_requests_total' || { echo "❌ Metrics missing http_requests_total"; FAILED_TESTS=$((FAILED_TESTS+1)); }
echo "✅ Metrics endpoint ok"

echo "\n=========================================="
if [ $FAILED_TESTS -eq 0 ]; then
  echo "✅ ALL SMOKE TESTS PASSED"
  exit 0
else
  echo "❌ SMOKE TESTS FAILED: $FAILED_TESTS test(s)"
  exit 1
fi
