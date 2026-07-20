# Release & Rollback Playbook - EthixAI

**Version:** 1.0  
**Date:** 2025-11-16  
**Owner:** Platform Engineering + Release Management  
**Applies to:** Backend, AI Core, Frontend

---

## 1. Overview

This playbook covers:
1. **Normal Release Process** (canary deployment via GitHub Actions)
2. **Emergency Rollback** (revert to previous stable version)
3. **Hotfix Release** (bypass canary for critical security fixes)
4. **Post-Deployment Validation** (smoke tests, metrics verification)

**Release Frequency:**
- **Production:** Weekly (Thursdays 14:00 UTC, low-traffic window)
- **Staging:** Daily (automatic on main branch merge)
- **Hotfixes:** As needed (< 1 hour deployment time)

---

## 2. Pre-Release Checklist

**Before triggering production deployment:**

- [ ] All CI tests passing on `main` branch
- [ ] Staging deployment successful with smoke tests passed
- [ ] Database migrations tested in staging (if applicable)
- [ ] Secrets verified in Secret Manager (no expired credentials)
- [ ] Load testing completed (Day 14 results reviewed)
- [ ] Release notes drafted (version number, changelog, breaking changes)
- [ ] On-call engineer available for next 2 hours post-deployment
- [ ] Rollback plan reviewed (identify previous stable revision)

**Communication:**

- Post in `#releases` Slack channel:
  ```
  🚀 Production release starting at 14:00 UTC
  Version: v20251116-abc123
  Changes: Bug fixes for analyze endpoint, SHAP caching improvements
  ETA: 30 minutes (canary) → 15 minutes (promote to 100%)
  ```

---

## 3. Normal Release Process (Canary Deployment)

### Step 1: Trigger GitHub Actions Workflow

**Automatic:** Push to `main` branch triggers `.github/workflows/deploy-production.yml`

**Manual:**
```bash
# Navigate to GitHub Actions tab
# Select "Deploy Production (Canary)" workflow
# Click "Run workflow"
# Select:
#   - Branch: main
#   - Environment: production
#   - Skip canary: false (use canary)
```

**What happens:**
1. Build & test (backend, ai_core, frontend images)
2. Push images to GHCR (`ghcr.io/geoaziz/ethixai-backend:sha-abc123`)
3. Scan images with Trivy (fail if HIGH/CRITICAL vulnerabilities)
4. Deploy to staging → run smoke tests
5. Deploy canary (10% traffic split)
6. Monitor for 15 minutes (error rate, latency)
7. **Promote to 100% if healthy** OR **rollback if errors detected**

---

### Step 2: Monitor Canary Phase (15 Minutes)

**Metrics to Watch (Grafana Dashboard: "Production Release Monitor"):**

| Metric | Threshold | Action if Exceeded |
|--------|-----------|-------------------|
| **Error Rate (5xx)** | < 0.5% | Rollback immediately |
| **P95 Latency** | < 2 seconds | Investigate, consider rollback |
| **CPU Usage** | < 80% | Monitor, may need autoscaling |
| **Memory Usage** | < 85% | Monitor for memory leaks |

**Prometheus Queries:**

```promql
# Error rate (canary revision)
rate(http_requests_total{job="backend",status=~"5..",revision="canary-abc123"}[5m]) 
/ rate(http_requests_total{job="backend",revision="canary-abc123"}[5m])

# P95 latency (canary vs stable)
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket{job="backend",revision="canary-abc123"}[5m]))
```

**Cloud Run Logs:**

```bash
# Stream logs for canary revision
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=ethixai-backend AND resource.labels.revision_name=ethixai-backend-00042-abc" \
  --format=json
```

---

### Step 3: Promote or Rollback

**If Canary Healthy (Automatic Promotion):**

GitHub Actions workflow automatically promotes canary to 100% after 15 minutes of healthy metrics.

**Manual Verification:**

```bash
# Check traffic split
gcloud run services describe ethixai-backend --region us-east1 \
  --format="table(status.traffic.revisionName,status.traffic.percent)"

# Expected output:
# REVISION_NAME                    PERCENT
# ethixai-backend-00042-abc        100
```

**Post-Promotion:**

- [ ] Run full smoke test suite (see Section 5)
- [ ] Verify Sentry release created (`v20251116-abc123`)
- [ ] Update `#releases` Slack channel:
  ```
  ✅ Production release complete
  Version: v20251116-abc123
  Status: 100% traffic on new revision
  Monitoring for 1 hour...
  ```

---

## 4. Emergency Rollback Procedures

### Scenario 1: Canary Failure (Automatic Rollback)

**Trigger:** GitHub Actions detects error rate > 0.5% during canary monitoring.

**Action:** Workflow automatically reverts traffic split to 100% stable revision.

**Manual Verification:**

```bash
# Confirm rollback completed
gcloud run services describe ethixai-backend --region us-east1 \
  --format="table(status.traffic.revisionName,status.traffic.percent)"

# Expected output:
# REVISION_NAME                    PERCENT
# ethixai-backend-00041-xyz        100  (previous stable)
```

**Incident Response:**

1. **Create incident ticket:**
   - Title: "Production canary rollback triggered"
   - Severity: P2 (high)
   - Assign to release engineer

2. **Investigate failure:**
   ```bash
   # Check logs for errors
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.revision_name=ethixai-backend-00042-abc AND severity>=ERROR" \
     --limit=100 \
     --format=json | jq '.[] | {timestamp, message: .textPayload}'
   ```

3. **Root cause analysis:**
   - Review Sentry error traces
   - Check for database connection issues
   - Verify secrets not expired
   - Review code changes in failed deployment

4. **Fix and redeploy:**
   - Create hotfix branch
   - Fix issue
   - Test in staging
   - Redeploy to production

---

### Scenario 2: Post-Promotion Issue (Manual Rollback)

**Trigger:** Critical bug discovered after promotion to 100%.

**Steps:**

1. **Identify Previous Stable Revision:**
   ```bash
   gcloud run revisions list --service=ethixai-backend --region=us-east1 \
     --format="table(metadata.name,status.conditions.lastTransitionTime,status.conditions.status)"
   
   # Output example:
   # NAME                        LAST_TRANSITION_TIME         STATUS
   # ethixai-backend-00042-abc   2025-11-16T14:30:00Z        Ready  (current, broken)
   # ethixai-backend-00041-xyz   2025-11-16T12:00:00Z        Ready  (previous stable)
   ```

2. **Rollback Traffic to Previous Revision:**
   ```bash
   gcloud run services update-traffic ethixai-backend \
     --region us-east1 \
     --to-revisions=ethixai-backend-00041-xyz=100
   
   # Repeat for ai_core
   gcloud run services update-traffic ethixai-ai-core \
     --region us-east1 \
     --to-revisions=ethixai-ai-core-00023-xyz=100
   ```

3. **Verify Rollback:**
   ```bash
   # Health check
   curl -f https://backend.ethixai.com/health/readiness
   
   # Smoke test (login flow)
   curl -X POST https://backend.ethixai.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass"}'
   ```

4. **Notify Stakeholders:**
   ```
   ❌ PRODUCTION ROLLBACK EXECUTED
   Reason: Critical bug in v20251116-abc123
   Action: Rolled back to v20251115-xyz (previous stable)
   Impact: ~5 minutes of elevated error rate
   Next Steps: Hotfix in progress
   ```

**Rollback Time:** < 5 minutes (manual traffic update)

---

### Scenario 3: Database Migration Rollback

**If database migration breaks production:**

1. **Stop Write Traffic:**
   ```bash
   # Scale backend to 0 to prevent further writes
   gcloud run services update ethixai-backend \
     --region us-east1 \
     --min-instances=0 \
     --max-instances=0
   ```

2. **Rollback Migration (MongoDB):**
   ```bash
   # Connect to production database
   mongo "mongodb+srv://..." --eval "show dbs"
   
   # Run rollback script (example: undo column rename)
   db.users.updateMany({}, { $rename: { "newField": "oldField" } })
   ```

3. **Restore from Backup (if migration catastrophic):**
   ```bash
   # Follow disaster recovery procedure in backup-disaster-recovery.md
   atlas backups restore start \
     --clusterName ethixai-production-restore \
     --snapshotId SNAPSHOT_ID_BEFORE_MIGRATION \
     --projectId PROJECT_ID
   ```

4. **Rollback Application Code:**
   ```bash
   gcloud run services update-traffic ethixai-backend \
     --to-revisions=REVISION_BEFORE_MIGRATION=100
   ```

5. **Scale Backend Back Up:**
   ```bash
   gcloud run services update ethixai-backend \
     --min-instances=3 \
     --max-instances=13
   ```

---

## 5. Post-Deployment Validation (Smoke Tests)

**Run after every production deployment (automated in CI/CD + manual verification):**

### 5.1 Health Checks

```bash
# Backend
curl -f https://backend.ethixai.com/health/readiness || echo "FAILED"

# AI Core
curl -f https://ai-core.ethixai.com/health/readiness || echo "FAILED"
```

---

### 5.2 Auth Flow

```bash
# Register new user
EMAIL="smoke-test-$(date +%s)@example.com"
REGISTER_RESP=$(curl -s -X POST https://backend.ethixai.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123\"}")

TOKEN=$(echo $REGISTER_RESP | jq -r '.token')
USER_ID=$(echo $REGISTER_RESP | jq -r '.userId')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Registration failed"
  exit 1
fi

echo "✅ Registration successful"

# Login
LOGIN_RESP=$(curl -s -X POST https://backend.ethixai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123\"}")

LOGIN_TOKEN=$(echo $LOGIN_RESP | jq -r '.token')

if [ -z "$LOGIN_TOKEN" ] || [ "$LOGIN_TOKEN" == "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
```

---

### 5.3 Upload & Analyze Flow

```bash
# Upload CSV (10-row sample)
UPLOAD_RESP=$(curl -s -X POST https://backend.ethixai.com/api/datasets/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@docs/example_data/sample_10rows.csv" \
  -F "datasetName=smoke-test-dataset")

DATASET_ID=$(echo $UPLOAD_RESP | jq -r '.datasetId')

if [ -z "$DATASET_ID" ] || [ "$DATASET_ID" == "null" ]; then
  echo "❌ Upload failed"
  exit 1
fi

echo "✅ Upload successful: $DATASET_ID"

# Trigger analysis
ANALYZE_RESP=$(curl -s -X POST https://backend.ethixai.com/api/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"datasetId\":\"$DATASET_ID\",\"targetColumn\":\"outcome\",\"sensitiveAttributes\":[\"gender\"]}")

REPORT_ID=$(echo $ANALYZE_RESP | jq -r '.reportId')

if [ -z "$REPORT_ID" ] || [ "$REPORT_ID" == "null" ]; then
  echo "❌ Analyze failed"
  exit 1
fi

echo "✅ Analyze successful: $REPORT_ID"

# Wait for report to complete (poll status)
for i in {1..30}; do
  STATUS=$(curl -s https://backend.ethixai.com/api/reports/$REPORT_ID/status \
    -H "Authorization: Bearer $TOKEN" | jq -r '.status')
  
  if [ "$STATUS" == "completed" ]; then
    echo "✅ Report completed"
    break
  elif [ "$STATUS" == "failed" ]; then
    echo "❌ Report failed"
    exit 1
  fi
  
  echo "Waiting for report... ($i/30)"
  sleep 2
done
```

---

### 5.4 Metrics Verification

```bash
# Check Prometheus metrics endpoint
curl -s https://backend.ethixai.com/metrics | grep "http_requests_total" || echo "❌ Metrics not available"

# Query error rate (last 5 minutes)
ERROR_RATE=$(curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])/rate(http_requests_total[5m])' | jq -r '.data.result[0].value[1]')

if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "❌ Error rate elevated: $ERROR_RATE"
  exit 1
fi

echo "✅ Error rate healthy: $ERROR_RATE"
```

---

## 6. Hotfix Release Process

**For critical security vulnerabilities or data corruption bugs requiring immediate fix.**

### Steps:

1. **Create Hotfix Branch:**
   ```bash
   git checkout main
   git pull
   git checkout -b hotfix/critical-security-fix
   ```

2. **Implement Fix:**
   - Minimal code changes (only fix the critical issue)
   - Add regression test
   - Update version: `v20251116-hotfix1-abc123`

3. **Test in Staging:**
   ```bash
   # Deploy to staging (automatic on merge to main)
   git push origin hotfix/critical-security-fix
   
   # Create PR, merge to main after approval
   ```

4. **Deploy to Production (Skip Canary):**
   ```bash
   # Navigate to GitHub Actions
   # Run workflow "Deploy Production (Canary)"
   # Select:
   #   - Branch: main
   #   - Environment: production
   #   - Skip canary: TRUE  ⚠️ (direct deploy to 100%)
   ```

5. **Post-Deployment Verification:**
   - Run smoke tests immediately
   - Monitor error rate for 1 hour
   - Verify security fix effective (run exploit test)

6. **Communication:**
   ```
   🚨 HOTFIX DEPLOYED
   Version: v20251116-hotfix1
   Reason: Critical security vulnerability (CVE-2025-XXXX)
   Impact: All users (100% traffic immediately)
   Deployment Mode: Direct (canary skipped)
   Verified: Smoke tests passed, no elevated errors
   ```

**Hotfix Deployment Time:** < 30 minutes (build → test → deploy)

---

## 7. Incident Response Integration

**If production deployment causes incident:**

1. **Declare Incident:**
   - Create PagerDuty incident: "Production deployment failure"
   - Severity: P1 (critical) if user-facing
   - Notify on-call engineer

2. **War Room:**
   - Join Slack channel: `#incident-response`
   - Bridge call (if high severity)
   - Assign roles: Incident Commander, Comms Lead, Engineering Lead

3. **Immediate Actions:**
   - **Rollback** (if safe): Follow Section 4
   - **Mitigate impact**: Scale down affected service, enable read-only mode
   - **Monitor metrics**: Track error rate, user impact

4. **Post-Incident:**
   - Write post-mortem (template: `docs/playbooks/postmortem-template.md`)
   - Identify root cause
   - Create action items (fix bugs, improve monitoring, update playbook)
   - Quarterly review: Are we repeating same mistakes?

---

## 8. Rollback Decision Matrix

| Symptom | Severity | Action | Rollback Trigger |
|---------|----------|--------|-----------------|
| **Error rate > 0.5%** | P1 | Immediate rollback | Automatic (canary phase) |
| **Error rate 0.1-0.5%** | P2 | Investigate, consider rollback | Manual decision (15m window) |
| **P95 latency > 5s** | P2 | Investigate, scale up replicas | Rollback if scaling doesn't help |
| **Memory leak (OOM kills)** | P1 | Rollback immediately | Automatic (liveness probe fails) |
| **Security vulnerability reported** | P0 | Hotfix + redeploy | No rollback (fix forward) |
| **UI bug (no backend impact)** | P3 | Fix in next release | No rollback |

---

## 9. Release Retrospective

**After every production release (within 24 hours):**

- [ ] Review deployment metrics (time to deploy, error rate, rollback count)
- [ ] Identify blockers (slow tests, manual approvals, infra issues)
- [ ] Update playbook with lessons learned
- [ ] Celebrate successes (smooth deployments with zero issues!)

**Quarterly Review:**
- [ ] Analyze release velocity (how many releases per month?)
- [ ] Review rollback rate (target: < 5% of deployments)
- [ ] Identify automation opportunities (reduce manual steps)

---

## 10. Contact Information

| Role | Name | Slack Handle | PagerDuty Escalation |
|------|------|--------------|---------------------|
| **Platform Engineering Lead** | [Name] | @platform-lead | Primary on-call |
| **Backend Lead** | [Name] | @backend-lead | Secondary on-call |
| **Security Lead** | [Name] | @security-lead | Security incidents only |
| **CTO** | [Name] | @cto | Escalation for P0 incidents |

**Slack Channels:**
- `#releases`: Release announcements
- `#incident-response`: Active incidents
- `#platform-engineering`: Deployment questions

---

## 11. References

- [Production Deployment Plan](../deploy/production-plan.md)
- [Backup & Disaster Recovery](../deploy/backup-disaster-recovery.md)
- [Health Probes](../deploy/health-probes.md)
- [Smoke Tests](../deploy/smoke-tests.md)
- [GitHub Actions Workflow](../../.github/workflows/deploy-production.yml)

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-16 | Platform Engineering | Initial release & rollback playbook |

