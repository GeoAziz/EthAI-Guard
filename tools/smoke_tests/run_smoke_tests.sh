#!/bin/bash
# Smoke tests for post-deployment validation
# Usage: ./run_smoke_tests.sh https://backend.ethixai.com

set -e

BACKEND_URL="${1:-https://backend.ethixai.com}"
FAILED_TESTS=0

echo "🧪 Running smoke tests against $BACKEND_URL"

# Test 1: Health Checks
echo ""
echo "Test 1: Health Checks"
curl -f -s $BACKEND_URL/health/liveness | jq -e '.status == "ok"' || { echo "❌ Liveness check failed"; FAILED_TESTS=$((FAILED_TESTS+1)); }
curl -f -s $BACKEND_URL/health/readiness | jq -e '.status == "ready"' || { echo "❌ Readiness check failed"; FAILED_TESTS=$((FAILED_TESTS+1)); }
echo "✅ Health checks passed"

# Test 2: Registration
echo ""
echo "Test 2: User Registration"
EMAIL="smoke-test-$(date +%s)@example.com"
REGISTER_RESP=$(curl -s -X POST $BACKEND_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123\"}")

TOKEN=$(echo $REGISTER_RESP | jq -r '.token')
USER_ID=$(echo $REGISTER_RESP | jq -r '.userId')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Registration failed: $REGISTER_RESP"
  FAILED_TESTS=$((FAILED_TESTS+1))
else
  echo "✅ Registration passed (userId: $USER_ID)"
fi

# Test 3: Login
echo ""
echo "Test 3: User Login"
LOGIN_RESP=$(curl -s -X POST $BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123\"}")

LOGIN_TOKEN=$(echo $LOGIN_RESP | jq -r '.token')

if [ -z "$LOGIN_TOKEN" ] || [ "$LOGIN_TOKEN" == "null" ]; then
  echo "❌ Login failed: $LOGIN_RESP"
  FAILED_TESTS=$((FAILED_TESTS+1))
else
  echo "✅ Login passed"
fi

# Test 4: Upload Dataset (10-row sample)
echo ""
echo "Test 4: Dataset Upload"

# Create temporary 10-row CSV
cat > /tmp/smoke_test_dataset.csv <<EOF
age,gender,income,outcome
25,M,50000,0
30,F,60000,1
35,M,55000,0
40,F,70000,1
28,M,52000,0
32,F,58000,1
27,M,51000,0
38,F,68000,1
29,M,53000,0
31,F,59000,1
EOF

UPLOAD_RESP=$(curl -s -X POST $BACKEND_URL/api/datasets/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/smoke_test_dataset.csv" \
  -F "datasetName=smoke-test-dataset")

DATASET_ID=$(echo $UPLOAD_RESP | jq -r '.datasetId')

if [ -z "$DATASET_ID" ] || [ "$DATASET_ID" == "null" ]; then
  echo "❌ Upload failed: $UPLOAD_RESP"
  FAILED_TESTS=$((FAILED_TESTS+1))
else
  echo "✅ Upload passed (datasetId: $DATASET_ID)"
fi

# Test 5: Trigger Analysis
echo ""
echo "Test 5: Trigger Analysis"
ANALYZE_RESP=$(curl -s -X POST $BACKEND_URL/api/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"datasetId\":\"$DATASET_ID\",\"targetColumn\":\"outcome\",\"sensitiveAttributes\":[\"gender\"]}")

REPORT_ID=$(echo $ANALYZE_RESP | jq -r '.reportId')

if [ -z "$REPORT_ID" ] || [ "$REPORT_ID" == "null" ]; then
  echo "❌ Analysis trigger failed: $ANALYZE_RESP"
  FAILED_TESTS=$((FAILED_TESTS+1))
else
  echo "✅ Analysis triggered (reportId: $REPORT_ID)"
fi

# Test 6: Poll Report Status
echo ""
echo "Test 6: Poll Report Status"
MAX_RETRIES=30
RETRY_COUNT=0
REPORT_COMPLETED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  STATUS_RESP=$(curl -s $BACKEND_URL/api/reports/$REPORT_ID/status \
    -H "Authorization: Bearer $TOKEN")
  
  STATUS=$(echo $STATUS_RESP | jq -r '.status')
  
  if [ "$STATUS" == "completed" ]; then
    echo "✅ Report completed"
    REPORT_COMPLETED=true
    break
  elif [ "$STATUS" == "failed" ]; then
    echo "❌ Report failed: $(echo $STATUS_RESP | jq -r '.error')"
    FAILED_TESTS=$((FAILED_TESTS+1))
    break
  fi
  
  echo "  Waiting for report... ($RETRY_COUNT/$MAX_RETRIES)"
  RETRY_COUNT=$((RETRY_COUNT+1))
  sleep 2
done

if [ "$REPORT_COMPLETED" != true ]; then
  echo "❌ Report did not complete within 60 seconds"
  FAILED_TESTS=$((FAILED_TESTS+1))
fi

# Test 7: Retrieve Report
echo ""
echo "Test 7: Retrieve Report"
REPORT_RESP=$(curl -s $BACKEND_URL/api/reports/$REPORT_ID \
  -H "Authorization: Bearer $TOKEN")

FAIRNESS_METRICS=$(echo $REPORT_RESP | jq -r '.fairnessMetrics')

if [ -z "$FAIRNESS_METRICS" ] || [ "$FAIRNESS_METRICS" == "null" ]; then
  echo "❌ Report retrieval failed: $REPORT_RESP"
  FAILED_TESTS=$((FAILED_TESTS+1))
else
  echo "✅ Report retrieved successfully"
fi

# Test 8: Metrics Endpoint
echo ""
echo "Test 8: Prometheus Metrics"
curl -f -s $BACKEND_URL/metrics | grep -q "http_requests_total" || { echo "❌ Metrics endpoint failed"; FAILED_TESTS=$((FAILED_TESTS+1)); }
echo "✅ Metrics endpoint passed"

# Summary
echo ""
echo "=========================================="
if [ $FAILED_TESTS -eq 0 ]; then
  echo "✅ ALL SMOKE TESTS PASSED"
  exit 0
else
  echo "❌ SMOKE TESTS FAILED: $FAILED_TESTS test(s)"
  exit 1
fi
