# Backup & Disaster Recovery Policy - EthixAI

**Version:** 1.0  
**Date:** 2025-11-16  
**Owner:** Platform Engineering + Data Governance  
**Classification:** CONFIDENTIAL

---

## 1. Executive Summary

**Recovery Time Objective (RTO):** 1 hour (time to restore service after disaster)  
**Recovery Point Objective (RPO):** 15 minutes (maximum data loss acceptable)

**Backup Strategy:**
- **Database:** MongoDB Atlas automated daily snapshots + continuous point-in-time recovery (PITR)
- **Object Storage:** GCS/S3 versioning + lifecycle policies for analysis reports/model artifacts
- **Secrets:** Secret Manager version history (90-day retention)
- **Infrastructure as Code:** GitHub repository (disaster recovery via redeployment)

**Disaster Scenarios Covered:**
1. Database corruption/accidental deletion
2. Cloud region failure (multi-region failover)
3. Object storage data loss
4. Container registry unavailable
5. Complete GCP/AWS account compromise

---

## 2. Backup Architecture

### 2.1 MongoDB Atlas Automated Backups

**Configuration:**
- **Snapshot Frequency:** Every 12 hours (00:00 UTC, 12:00 UTC)
- **Retention:** 30 days (production), 7 days (staging)
- **Point-in-Time Recovery (PITR):** Enabled (1-hour granularity)
- **Storage Location:** Atlas managed (cross-region replication to us-east1, us-west2)

**Atlas Cluster Settings:**

```json
{
  "clusterName": "ethixai-production",
  "clusterType": "REPLICASET",
  "replicationFactor": 3,
  "providerSettings": {
    "providerName": "GCP",
    "regionName": "US_EAST_1",
    "instanceSizeName": "M10"
  },
  "backupEnabled": true,
  "pitEnabled": true,
  "providerBackupEnabled": true
}
```

**Verification Schedule:**
- **Weekly:** Automated restore test to staging cluster (every Monday 02:00 UTC)
- **Quarterly:** Full disaster recovery drill (documented in runbook)

---

### 2.2 Object Storage Backups (GCS/S3)

**Analysis Reports & Model Artifacts:**
- **Primary:** `gs://ethixai-production-reports` (us-east1)
- **Replication:** `gs://ethixai-production-reports-backup` (us-west2, dual-region)
- **Versioning:** Enabled (retain 10 versions per object)
- **Lifecycle Policy:**
  - Keep latest version indefinitely
  - Delete versions older than 90 days
  - Transition to Coldline storage after 30 days (50% cost reduction)

**GCS Bucket Configuration:**

```bash
# Enable versioning
gsutil versioning set on gs://ethixai-production-reports

# Set lifecycle policy
gsutil lifecycle set lifecycle.json gs://ethixai-production-reports
```

**lifecycle.json:**

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"daysSinceNoncurrentTime": 30}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"numNewerVersions": 10}
      }
    ]
  }
}
```

**Replication Policy (Cross-Region):**

```bash
gcloud storage buckets create gs://ethixai-production-reports-backup \
  --location=us-west2 \
  --uniform-bucket-level-access

# Enable replication
gcloud storage buckets update gs://ethixai-production-reports \
  --replication=ASYNC \
  --replication-destination=gs://ethixai-production-reports-backup
```

---

### 2.3 Container Image Backups

**GitHub Container Registry (GHCR):**
- **Retention:** Keep all images tagged with semantic versions (`v1.2.3`) indefinitely
- **Cleanup:** Delete untagged images older than 30 days (via GitHub Actions cron)
- **Disaster Recovery:** Images are immutable; redeploy from GHCR to new Cloud Run region

**Image Tagging Strategy:**

```bash
# Production images tagged with git commit SHA + semver
ghcr.io/geoaziz/ethixai-backend:v1.2.3
ghcr.io/geoaziz/ethixai-backend:sha-abc123def

# Staging images tagged with branch name
ghcr.io/geoaziz/ethixai-backend:staging-latest
```

**Backup Mirror (Optional for Extreme DR):**

```bash
# Mirror GHCR images to GCP Artifact Registry
gcloud artifacts repositories create ethixai-mirror \
  --repository-format=docker \
  --location=us-east1

# Copy production images weekly
docker pull ghcr.io/geoaziz/ethixai-backend:v1.2.3
docker tag ghcr.io/geoaziz/ethixai-backend:v1.2.3 \
  us-east1-docker.pkg.dev/PROJECT_ID/ethixai-mirror/backend:v1.2.3
docker push us-east1-docker.pkg.dev/PROJECT_ID/ethixai-mirror/backend:v1.2.3
```

---

### 2.4 Infrastructure as Code (IaC) Backups

**Source Code & Configuration:**
- **Repository:** GitHub `GeoAziz/EthAI-Guard` (primary source of truth)
- **Backup:** GitHub automated backups (90-day retention)
- **Disaster Recovery:** Clone repository, redeploy via CI/CD pipeline

**Critical Files Backed Up:**
- `.github/workflows/` (CI/CD pipelines)
- `docker-compose.yml` (local dev environment)
- `docs/deploy/` (deployment configurations)
- Dockerfiles (backend, ai_core, frontend)

**Nightly Git Archive (Optional):**

```bash
#!/bin/bash
# Cron: 0 3 * * * (daily at 03:00 UTC)
git clone --mirror https://github.com/GeoAziz/EthAI-Guard.git
tar czf ethixai-repo-$(date +%Y%m%d).tar.gz EthAI-Guard.git
gsutil cp ethixai-repo-$(date +%Y%m%d).tar.gz gs://ethixai-infrastructure-backups/
```

---

## 3. Disaster Recovery Procedures

### 3.1 Scenario 1: Database Corruption (Accidental Deletion)

**Impact:** Critical user data deleted from MongoDB production cluster.

**Recovery Steps:**

1. **Stop Write Traffic Immediately:**
   ```bash
   # Scale backend to 0 replicas to prevent further writes
   gcloud run services update ethixai-backend --region=us-east1 --min-instances=0 --max-instances=0
   ```

2. **Identify Last Known Good Snapshot:**
   ```bash
   # List available snapshots
   atlas backups snapshots list --clusterName ethixai-production --projectId PROJECT_ID
   
   # Output example:
   # ID: 5f8a3b2c9d8e7f6a5b4c3d2e  Created: 2025-11-16T00:00:00Z
   # ID: 5f8a3b2c9d8e7f6a5b4c3d2f  Created: 2025-11-15T12:00:00Z
   ```

3. **Restore from Snapshot (to New Cluster):**
   ```bash
   atlas backups restore start \
     --clusterName ethixai-production-restore \
     --snapshotId 5f8a3b2c9d8e7f6a5b4c3d2e \
     --projectId PROJECT_ID
   
   # Wait for restore completion (10-30 minutes for M10 cluster)
   atlas clusters watch ethixai-production-restore --projectId PROJECT_ID
   ```

4. **Update Backend Connection String:**
   ```bash
   # Update Secret Manager with restored cluster URI
   NEW_MONGO_URI=$(atlas clusters describe ethixai-production-restore --projectId PROJECT_ID -o json | jq -r '.connectionStrings.standardSrv')
   echo "$NEW_MONGO_URI" | gcloud secrets versions add mongodb-uri --data-file=-
   ```

5. **Scale Backend Back to Production:**
   ```bash
   gcloud run services update ethixai-backend \
     --region=us-east1 \
     --min-instances=3 \
     --max-instances=13
   ```

6. **Verify Data Integrity:**
   ```bash
   # Run smoke tests
   curl -X POST https://backend.ethixai.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass"}'
   
   # Check user count matches pre-disaster baseline
   mongo "mongodb+srv://..." --eval "db.users.countDocuments()"
   ```

**RTO:** 45 minutes (10m restore + 5m config update + 30m verification)  
**RPO:** 12 hours (worst case if disaster occurs right before snapshot)

---

### 3.2 Scenario 2: Cloud Region Failure (us-east1 Down)

**Impact:** All Cloud Run services in us-east1 unavailable; MongoDB Atlas automatically fails over to us-west2 replica.

**Recovery Steps:**

1. **Confirm Region Outage:**
   ```bash
   gcloud compute regions describe us-east1 --format="value(status)"
   # Output: DOWN or MAINTENANCE
   ```

2. **Deploy Services to Secondary Region (us-west2):**
   ```bash
   # Backend
   gcloud run deploy ethixai-backend \
     --image ghcr.io/geoaziz/ethixai-backend:v1.2.3 \
     --region us-west2 \
     --min-instances 3 \
     --max-instances 13 \
     --cpu 1 \
     --memory 512Mi
   
   # AI Core
   gcloud run deploy ethixai-ai-core \
     --image ghcr.io/geoaziz/ethixai-ai-core:v1.2.3 \
     --region us-west2 \
     --min-instances 6 \
     --max-instances 11 \
     --cpu 2 \
     --memory 1Gi
   ```

3. **Update DNS/Load Balancer:**
   ```bash
   # Point backend.ethixai.com to us-west2 endpoint
   gcloud compute url-maps edit ethixai-backend-lb \
     --global
   
   # Update backend service to point to us-west2
   gcloud compute backend-services update ethixai-backend-service \
     --global \
     --backend=us-west2
   ```

4. **Verify MongoDB Replica Set Status:**
   ```bash
   mongo "mongodb+srv://..." --eval "rs.status()"
   # Confirm PRIMARY is now in us-west2
   ```

5. **Monitor Application Metrics:**
   ```bash
   # Check error rate and latency in Grafana
   # us-west2 may have higher latency for users in eastern US (add ~30ms)
   ```

**RTO:** 30 minutes (5m detection + 10m redeploy + 15m DNS propagation)  
**RPO:** 0 minutes (MongoDB replica set provides zero data loss)

---

### 3.3 Scenario 3: Object Storage Data Loss

**Impact:** Analysis reports deleted from primary GCS bucket.

**Recovery Steps:**

1. **Check Object Versions:**
   ```bash
   gsutil ls -a gs://ethixai-production-reports/reports/user123/
   # Output shows all versions, including deleted (archived) objects
   ```

2. **Restore from Version History:**
   ```bash
   # Restore specific version
   gsutil cp gs://ethixai-production-reports/reports/user123/report-abc.json#1699564800 \
     gs://ethixai-production-reports/reports/user123/report-abc.json
   ```

3. **Bulk Restore from Backup Bucket:**
   ```bash
   # Copy all objects from backup bucket to primary
   gsutil -m rsync -r gs://ethixai-production-reports-backup/ \
     gs://ethixai-production-reports/
   ```

4. **Verify Restoration:**
   ```bash
   # Check object count matches baseline
   gsutil du -s gs://ethixai-production-reports/
   # Compare with pre-disaster metric
   ```

**RTO:** 20 minutes (5m detection + 10m restore + 5m verification)  
**RPO:** 0 minutes (versioning captures all changes)

---

### 3.4 Scenario 4: Complete GCP Account Compromise

**Impact:** Adversary deletes all Cloud Run services, GCS buckets, and Secret Manager secrets.

**Recovery Steps:**

1. **Secure GitHub Repository:**
   ```bash
   # Immediately rotate GitHub PAT tokens
   # Revoke all service account keys in GCP
   gcloud iam service-accounts keys list --iam-account=backend@PROJECT_ID.iam.gserviceaccount.com
   gcloud iam service-accounts keys delete KEY_ID --iam-account=backend@PROJECT_ID.iam.gserviceaccount.com
   ```

2. **Create New GCP Project (DR Project):**
   ```bash
   gcloud projects create ethixai-dr-20251116 \
     --name="EthixAI Disaster Recovery" \
     --organization=ORG_ID
   
   gcloud config set project ethixai-dr-20251116
   ```

3. **Restore MongoDB from Atlas Backup:**
   ```bash
   # Atlas backups are independent of GCP account
   atlas backups restore start \
     --clusterName ethixai-dr-cluster \
     --snapshotId LATEST_SNAPSHOT_ID \
     --projectId ATLAS_PROJECT_ID
   ```

4. **Recreate Secrets in New Project:**
   ```bash
   # Retrieve secrets from offline backup (encrypted KMS key in safe)
   gcloud secrets create jwt-secret-key --data-file=jwt-secret-backup.txt
   gcloud secrets create mongodb-uri --data-file=mongodb-uri-backup.txt
   ```

5. **Redeploy Services via CI/CD:**
   ```bash
   # Trigger GitHub Actions workflow with new project ID
   gh workflow run deploy-production.yml \
     -f gcp_project_id=ethixai-dr-20251116 \
     -f environment=production
   ```

6. **Update DNS:**
   ```bash
   # Point backend.ethixai.com to new Cloud Run endpoints
   gcloud dns record-sets update backend.ethixai.com \
     --type=A \
     --rrdatas=NEW_CLOUD_RUN_IP \
     --zone=ethixai-zone
   ```

**RTO:** 4 hours (1h secure account + 30m restore DB + 2h redeploy + 30m DNS)  
**RPO:** 15 minutes (last MongoDB PITR snapshot)

---

## 4. Testing & Validation

### 4.1 Backup Verification Schedule

| Test Type | Frequency | Procedure | Owner |
|-----------|-----------|-----------|-------|
| **Snapshot Restore Test** | Weekly (Monday 02:00 UTC) | Restore latest snapshot to staging cluster, run smoke tests | Platform Engineering |
| **Object Storage Restore** | Monthly (1st of month) | Delete random report, restore from version history | Data Engineering |
| **Full DR Drill** | Quarterly | Simulate region failure, failover to us-west2, validate RTO/RPO | Incident Response Team |
| **Secret Recovery Test** | Quarterly | Rotate all secrets, verify services restart successfully | Security Team |

---

### 4.2 Automated Backup Testing

**GitHub Actions Workflow (Weekly Restore Test):**

```yaml
# .github/workflows/backup-verification.yml
name: Backup Verification
on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 02:00 UTC

jobs:
  test-mongodb-restore:
    runs-on: ubuntu-latest
    steps:
      - name: Get latest Atlas snapshot
        run: |
          SNAPSHOT_ID=$(atlas backups snapshots list --clusterName ethixai-production --projectId ${{ secrets.ATLAS_PROJECT_ID }} -o json | jq -r '.[0].id')
          echo "Latest snapshot: $SNAPSHOT_ID"
      
      - name: Restore to staging cluster
        run: |
          atlas backups restore start \
            --clusterName ethixai-staging \
            --snapshotId $SNAPSHOT_ID \
            --projectId ${{ secrets.ATLAS_PROJECT_ID }}
      
      - name: Wait for restore completion
        run: atlas clusters watch ethixai-staging --projectId ${{ secrets.ATLAS_PROJECT_ID }}
      
      - name: Run smoke tests
        run: |
          # Connect to restored cluster
          MONGO_URI=$(atlas clusters describe ethixai-staging --projectId ${{ secrets.ATLAS_PROJECT_ID }} -o json | jq -r '.connectionStrings.standardSrv')
          
          # Verify user count
          USER_COUNT=$(mongo "$MONGO_URI" --eval "db.users.countDocuments()" --quiet)
          echo "User count: $USER_COUNT"
          
          # Fail if user count is 0
          if [ "$USER_COUNT" -eq 0 ]; then
            echo "ERROR: Restored database has no users"
            exit 1
          fi
      
      - name: Notify on failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"❌ Weekly backup verification FAILED"}'
```

---

## 5. Backup Storage Costs

| Resource | Storage | Retention | Monthly Cost |
|----------|---------|-----------|--------------|
| MongoDB Atlas Snapshots (M10) | ~2 GB/snapshot × 60 snapshots | 30 days | $10/month |
| GCS Reports (primary bucket) | ~50 GB | Indefinite (Coldline after 30 days) | $8/month |
| GCS Reports (backup bucket) | ~50 GB (replicated) | 90-day lifecycle | $8/month |
| GHCR Container Images | ~1 GB (10 versions × 100 MB) | Indefinite | $0 (GitHub Free) |
| **Total Backup Costs** | | | **~$26/month** |

---

## 6. Compliance & Audit

### 6.1 Regulatory Requirements

**GDPR/CCPA Compliance:**
- Backups include PII (email, user metadata) → must be encrypted at rest and in transit
- Users' "right to erasure" requires purging from backups after 90 days post-deletion
- Backup access logs retained for 400 days (GDPR audit requirement)

**SOC 2 Type II:**
- Quarterly DR drill documented with RTO/RPO metrics
- Access control: only Platform Engineering + Security teams can restore backups
- Encryption keys rotated every 90 days

---

### 6.2 Backup Access Controls

**GCP IAM Roles:**

| Role | Permissions | Members |
|------|-------------|---------|
| `roles/compute.admin` | Create/delete backups, restore clusters | `platform-eng@ethixai.com` |
| `roles/storage.objectViewer` | Read backups (no restore) | `data-eng@ethixai.com` |
| `roles/secretmanager.secretAccessor` | Access secrets for restore | `backend@PROJECT_ID.iam.gserviceaccount.com` |

**MongoDB Atlas Access:**
- **Project Owner:** Platform Engineering (can restore clusters)
- **Read Only:** Data Engineering (can view snapshots, not restore)

---

## 7. Recovery SLAs

| Disaster Scenario | RTO (Target) | RPO (Target) | Priority |
|-------------------|--------------|--------------|----------|
| Database corruption (accidental delete) | 1 hour | 12 hours | P1 (Critical) |
| Cloud region failure | 30 minutes | 0 minutes | P0 (Urgent) |
| Object storage data loss | 20 minutes | 0 minutes | P2 (High) |
| Complete account compromise | 4 hours | 15 minutes | P1 (Critical) |
| Single container failure | 2 minutes | 0 minutes (Cloud Run auto-restarts) | P3 (Medium) |

**Escalation Path:**
1. **Incident Detected** → On-call engineer notified via PagerDuty
2. **RTO Exceeded by 50%** → Escalate to Engineering Manager
3. **RTO Exceeded by 100%** → Escalate to CTO + activate war room

---

## 8. Post-Disaster Review

**After every DR event (real or drill), document:**

1. **Timeline:**
   - Time of incident detection
   - Time recovery initiated
   - Time service restored
   - Actual RTO vs. target

2. **Root Cause:**
   - What caused the disaster?
   - Could it have been prevented?

3. **Lessons Learned:**
   - What went well?
   - What could be improved?
   - Action items (assign owners + due dates)

4. **Metrics:**
   - Data loss (RPO): actual vs. target
   - Downtime (RTO): actual vs. target
   - User impact: how many requests failed?

**Example Post-Mortem Template:** `docs/playbooks/postmortem-template.md`

---

## 9. References

- [MongoDB Atlas Backup Documentation](https://www.mongodb.com/docs/atlas/backup/cloud-backup/overview/)
- [GCS Lifecycle Management](https://cloud.google.com/storage/docs/lifecycle)
- [Cloud Run Disaster Recovery](https://cloud.google.com/run/docs/multiple-regions)
- [NIST Disaster Recovery Guide](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-34r1.pdf)

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-16 | Platform Engineering | Initial backup & DR policy |

---

**Approval Signatures:**

- [ ] Platform Engineering Lead: _________________ Date: _______
- [ ] Security Lead: _________________ Date: _______
- [ ] CTO: _________________ Date: _______

