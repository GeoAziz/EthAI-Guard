#!/bin/bash

# Example usage of the Automated Model Retraining API
# Requires backend running on localhost:5000

API_BASE="http://localhost:5000/api"
JOB_ID=""

echo "=== Automated Model Retraining System - Example Usage ==="
echo ""

# 1. List all model versions
echo "1. Getting all model versions..."
curl -s "$API_BASE/models" | jq .

echo ""
echo "2. Getting latest deployed model..."
curl -s "$API_BASE/models/current/deployed" | jq .

echo ""
echo "3. Triggering manual retraining..."
RESPONSE=$(curl -s -X POST "$API_BASE/retraining/trigger" \
  -H "Content-Type: application/json" \
  -d '{"triggerType": "manual"}')
echo "$RESPONSE" | jq .
JOB_ID=$(echo "$RESPONSE" | jq -r '.data.jobId')

echo ""
echo "Job ID: $JOB_ID"
echo "4. Getting job status (will check every 5 seconds)..."

for i in {1..60}; do
  echo "Attempt $i..."
  STATUS=$(curl -s "$API_BASE/retraining/jobs/$JOB_ID" | jq -r '.data.status')
  echo "Status: $STATUS"

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi

  sleep 5
done

echo ""
echo "5. Getting completed job details..."
curl -s "$API_BASE/retraining/jobs/$JOB_ID" | jq .

echo ""
echo "6. Getting list of retraining jobs..."
curl -s "$API_BASE/retraining/jobs?status=completed&limit=10" | jq .

echo ""
echo "7. Getting retraining schedules..."
curl -s "$API_BASE/retraining/schedules" | jq .

echo ""
echo "8. Getting schedule status..."
curl -s "$API_BASE/retraining/schedules/daily-retraining/status" | jq .

echo ""
echo "=== Example with a specific model version ==="

# Get the latest model version
MODEL_VERSION=$(curl -s "$API_BASE/models?status=approved&limit=1" | jq -r '.data[0].version')

if [ -n "$MODEL_VERSION" ] && [ "$MODEL_VERSION" != "null" ]; then
  echo "Model version: $MODEL_VERSION"

  echo ""
  echo "9. Getting model details..."
  curl -s "$API_BASE/models/$MODEL_VERSION" | jq .

  echo ""
  echo "10. Comparing model with baseline..."
  curl -s -X POST "$API_BASE/models/$MODEL_VERSION/compare" | jq .

  echo ""
  echo "11. Approving model for production..."
  curl -s -X POST "$API_BASE/models/$MODEL_VERSION/approve" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "performance",
      "comments": "Model shows 2% improvement in accuracy"
    }' | jq .

  echo ""
  echo "12. Deploying model to production (10% canary)..."
  curl -s -X POST "$API_BASE/models/$MODEL_VERSION/deploy" \
    -H "Content-Type: application/json" \
    -d '{"canaryPercentage": 10}' | jq .
fi

echo ""
echo "=== Rollback example ==="
echo "To rollback a model, use:"
echo "curl -X POST $API_BASE/models/v1.2.3/rollback \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"reason\": \"Performance degradation detected\"}'"

echo ""
echo "=== Cancel retraining job ==="
echo "To cancel a job, use:"
echo "curl -X POST $API_BASE/retraining/jobs/job-123/cancel"

echo ""
echo "=== Stop a retraining schedule ==="
echo "To stop a schedule, use:"
echo "curl -X POST $API_BASE/retraining/schedules/daily-retraining/stop"
