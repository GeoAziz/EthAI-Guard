# Smoke Tests - Post-Deployment Validation

**Version:** 1.0  
**Date:** 2025-11-16  
**Owner:** Platform Engineering + QA  
**Applies to:** Staging, Canary, Production deployments

---

## 1. Overview

**Smoke tests** are a minimal set of tests that verify critical functionality after deployment. They run:

1. **Automatically** in GitHub Actions after staging/canary deployment
2. **Manually** by release engineer after production promotion
3. **Continuously** via synthetic monitoring (Grafana Cloud, Datadog)

**Pass Criteria:**
- All smoke tests pass within 5 minutes of deployment
- No 5xx errors during test execution
- P95 latency < 2 seconds for all endpoints

**Failure Response:**
- If smoke tests fail in canary → automatic rollback
- If smoke tests fail in staging → block production deployment
- If smoke tests fail in production → initiate emergency rollback

---

## 2. Smoke Test Checklist

### 2.1 Infrastructure Health

| Test | Endpoint | Expected Result | Failure Impact |
|------|----------|-----------------|----------------|
| **Backend Liveness** | `GET /health/liveness` | 200 OK, `{"status":"ok"}` | P0 - Rollback |
| **Backend Readiness** | `GET /health/readiness` | 200 OK, DB connected | P0 - Rollback |
| **AI Core Liveness** | `GET /health/liveness` | 200 OK | P0 - Rollback |
| **AI Core Readiness** | `GET /health/readiness` | 200 OK, models loaded | P0 - Rollback |
| **Prometheus Metrics** | `GET /metrics` | 200 OK, metrics exposed | P2 - Fix in next release |

---

### 2.2 Authentication Flow

| Test | Steps | Expected Result | Failure Impact |
|------|-------|-----------------|----------------|
| **User Registration** | POST `/api/auth/register` with email/password | 201 Created, returns `token` and `userId` | P0 - Rollback |
| **User Login** | POST `/api/auth/login` with valid credentials | 200 OK, returns `token` and `refreshToken` | P0 - Rollback |
| **Token Refresh** | POST `/api/auth/refresh` with valid refresh token | 200 OK, returns new `token` | P1 - Investigate |
| **Protected Endpoint** | GET `/api/datasets` with valid Bearer token | 200 OK, returns user datasets | P1 - Investigate |

---

### 2.3 Core Analysis Flow

| Test | Steps | Expected Result | Failure Impact |
|------|-------|-----------------|----------------|
| **Dataset Upload** | POST `/api/datasets/upload` with 10-row CSV | 200 OK, returns `datasetId` | P0 - Rollback |
| **Trigger Analysis** | POST `/api/analyze` with `datasetId` | 202 Accepted, returns `reportId` | P0 - Rollback |
| **Poll Report Status** | GET `/api/reports/{reportId}/status` (poll every 2s) | Eventually returns `status: "completed"` within 30s | P0 - Rollback |
| **Retrieve Report** | GET `/api/reports/{reportId}` | 200 OK, returns fairness metrics, SHAP values | P0 - Rollback |

---

### 2.4 Error Handling

| Test | Scenario | Expected Result | Failure Impact |
|------|----------|-----------------|----------------|
| **Invalid Login** | POST `/api/auth/login` with wrong password | 401 Unauthorized | P2 - Fix forward |
| **Missing Auth Token** | GET `/api/datasets` without Bearer token | 401 Unauthorized | P2 - Fix forward |
| **Invalid Dataset Format** | POST `/api/datasets/upload` with malformed CSV | 400 Bad Request | P2 - Fix forward |
| **Non-Existent Report** | GET `/api/reports/invalid-id` | 404 Not Found | P2 - Fix forward |

---

## 3. Automated Smoke Test Script

**Located at:** `tools/smoke_tests/run_smoke_tests.sh`

```bash
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
```

**Make executable:**

```bash
chmod +x tools/smoke_tests/run_smoke_tests.sh
```

---

## 4. GitHub Actions Integration

**Automated smoke tests in CI/CD workflow:**

```yaml
# .github/workflows/deploy-production.yml (excerpt)
- name: Run smoke tests (staging)
  run: |
    BACKEND_URL=${{ steps.staging-urls.outputs.backend_url }}
    ./tools/smoke_tests/run_smoke_tests.sh $BACKEND_URL
  
  if: success()
  continue-on-error: false  # Block deployment if smoke tests fail
```

---

## 5. Manual Smoke Test (Post-Production)

**After canary promotion to 100%, manually verify:**

```bash
# Run smoke tests against production
./tools/smoke_tests/run_smoke_tests.sh https://backend.ethixai.com

# Expected output:
# 🧪 Running smoke tests against https://backend.ethixai.com
# Test 1: Health Checks
# ✅ Health checks passed
# Test 2: User Registration
# ✅ Registration passed (userId: abc123)
# ...
# ✅ ALL SMOKE TESTS PASSED
```

---

## 6. Continuous Synthetic Monitoring

**Grafana Cloud Synthetic Monitoring (runs every 5 minutes):**

```javascript
// grafana/synthetic_monitoring/smoke_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  // Health check
  let res = http.get('https://backend.ethixai.com/health/readiness');
  check(res, { 'health check passed': (r) => r.status === 200 });

  // Login
  res = http.post('https://backend.ethixai.com/api/auth/login', JSON.stringify({
    email: 'synthetic-monitor@example.com',
    password: 'MonitorPass123'
  }), { headers: { 'Content-Type': 'application/json' } });
  
  check(res, { 'login passed': (r) => r.status === 200 && r.json('token') !== null });

  sleep(1);
}
```

**Alert if synthetic monitoring fails for 3 consecutive runs (15 minutes):**

```yaml
# grafana/alerting_rules.yml
- alert: SyntheticMonitoringFailed
  expr: synthetic_monitoring_check_success{job="backend"} == 0
  for: 15m
  labels:
    severity: critical
  annotations:
    summary: "Synthetic monitoring failed for backend"
    description: "Production backend failing smoke tests for 15 minutes"
```

---

## 7. Smoke Test SLA

| Environment | Run Frequency | Max Duration | Failure Threshold |
|-------------|---------------|--------------|-------------------|
| **Staging** | Every deployment | 5 minutes | 0 failures (block deploy) |
| **Canary** | Every deployment + every 5 min during canary phase | 5 minutes | 0 failures (auto rollback) |
| **Production** | Every 5 minutes (synthetic monitoring) | 2 minutes | 3 consecutive failures (alert) |

---

## 8. Test Data Management

**Smoke test user accounts (pre-created in production):**

```bash
# Backend creates synthetic monitor user on startup
# Email: synthetic-monitor@example.com
# Password: Stored in Secret Manager (synthetic-monitor-password)
# Permissions: Read-only, limited dataset upload (max 10 rows)
```

**Cleanup:**
- Smoke test datasets deleted after 24 hours (cron job)
- Smoke test reports archived to `gs://ethixai-smoke-test-reports/`

---

## 9. Smoke Test Failures - Troubleshooting

### Failure: Health Check Returns 503

**Root Cause:**
- Database connection lost
- Service not fully initialized

**Resolution:**
```bash
# Check backend logs
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=50

# Restart service
gcloud run services update ethixai-backend --region us-east1
```

---

### Failure: Registration Returns 500

**Root Cause:**
- MongoDB connection timeout
- bcrypt hashing timeout (CPU exhausted)

**Resolution:**
```bash
# Check MongoDB Atlas status
atlas clusters describe ethixai-production --projectId PROJECT_ID

# Scale up backend replicas (if CPU saturated)
gcloud run services update ethixai-backend --max-instances=20
```

---

### Failure: Analysis Timeout (Report Not Completed)

**Root Cause:**
- AI Core service down
- SHAP computation stalled

**Resolution:**
```bash
# Check AI Core health
curl https://ai-core.ethixai.com/health/readiness

# Check AI Core logs
gcloud logging read "resource.labels.service_name=ethixai-ai-core AND severity>=ERROR" --limit=50

# Restart AI Core
gcloud run services update ethixai-ai-core --region us-east1
```

---

## 10. Smoke Test Metrics Dashboard

**Grafana Dashboard: "Smoke Test Monitoring"**

**Panels:**
1. **Test Pass Rate (Last 24h):** `sum(smoke_test_passed) / sum(smoke_test_total)`
2. **Test Duration (P95):** `histogram_quantile(0.95, smoke_test_duration_seconds)`
3. **Failure Breakdown by Test:** `smoke_test_failed{test_name="registration"}`, etc.
4. **Time to Detection (TTD):** Time from deployment to smoke test failure

**Target SLA:**
- Pass rate: > 99.9%
- P95 duration: < 2 minutes
- TTD: < 5 minutes

---

## 11. References

- [Release & Rollback Playbook](../playbooks/release-rollback.md)
- [Health Probes](health-probes.md)
- [Production Deployment Plan](production-plan.md)
- [CI/CD Workflow](../../.github/workflows/deploy-production.yml)

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-16 | Platform Engineering | Initial smoke test specification |

