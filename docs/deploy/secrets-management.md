# Secrets Management - EthixAI Production

**Version:** 1.0  
**Date:** 2025-11-16  
**Owner:** Security Team / DevOps  
**Classification:** CONFIDENTIAL

---

## 1. Overview

All production secrets for EthixAI are stored in **GCP Secret Manager** (or AWS Secrets Manager for AWS deployments). **Zero secrets are committed to Git repositories** or stored in plaintext `.env` files in production environments.

**Key Principles:**
- ✅ **Secrets in Secret Manager only** (never in code, logs, or environment variables visible via `ps`)
- ✅ **Least-privilege access** (services access only secrets they need)
- ✅ **Automatic rotation** for database credentials and API keys (every 90 days)
- ✅ **Audit logging** (all secret access logged for compliance)
- ✅ **Version history** (rollback capability if secret compromised)

---

## 2. Secrets Inventory

### 2.1 Application Secrets

| Secret Name | Description | Used By | Rotation Period | Storage Location |
|-------------|-------------|---------|-----------------|------------------|
| `jwt-secret-key` | HMAC secret for access token signing | Backend | 180 days | GCP Secret Manager |
| `jwt-refresh-secret` | HMAC secret for refresh token signing | Backend | 180 days | GCP Secret Manager |
| `mongodb-uri` | MongoDB Atlas connection string (includes user/pass) | Backend, AI Core | Auto-rotated by Atlas | GCP Secret Manager |
| `sentry-dsn` | Sentry error tracking DSN | Backend, AI Core | N/A (revocable via Sentry UI) | GCP Secret Manager |
| `session-encryption-key` | 32-byte key for session cookie encryption | Backend | 90 days | GCP Secret Manager |

### 2.2 Infrastructure Secrets

| Secret Name | Description | Used By | Rotation Period | Storage Location |
|-------------|-------------|---------|-----------------|------------------|
| `gcs-service-account-key` | GCS bucket access for report storage | Backend, AI Core | 90 days | GCP Secret Manager |
| `github-container-registry-token` | PAT for pulling container images (GHCR) | CI/CD pipeline | 90 days | GitHub Secrets |
| `cloud-run-service-account-key` | IAM key for deploying to Cloud Run | CI/CD pipeline | 90 days | GitHub Secrets (OIDC preferred) |
| `pagerduty-integration-key` | Alert routing key | Alertmanager | N/A (revocable via PagerDuty) | GCP Secret Manager |
| `smtp-password` | Email service password (optional) | Backend (notifications) | 180 days | GCP Secret Manager |

### 2.3 CI/CD Secrets (GitHub Secrets)

| Secret Name | Description | Used By | Rotation Period |
|-------------|-------------|---------|-----------------|
| `GCP_PROJECT_ID` | GCP project identifier | GitHub Actions | N/A (static) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | OIDC provider for Workload Identity | GitHub Actions | N/A (static) |
| `GCP_SERVICE_ACCOUNT_EMAIL` | Service account for deployments | GitHub Actions | N/A (static) |
| `MONGODB_ATLAS_API_KEY` | API key for Atlas backups/monitoring | GitHub Actions (backup job) | 90 days |

---

## 3. Secret Manager Configuration

### 3.1 GCP Secret Manager Setup

**Create secrets:**

```bash
# JWT secrets (generate with: openssl rand -base64 64)
gcloud secrets create jwt-secret-key \
  --replication-policy="automatic" \
  --data-file=<(openssl rand -base64 64)

gcloud secrets create jwt-refresh-secret \
  --replication-policy="automatic" \
  --data-file=<(openssl rand -base64 64)

# MongoDB URI (from Atlas)
gcloud secrets create mongodb-uri \
  --replication-policy="automatic" \
  --data-file=<(echo "mongodb+srv://prod-user:PASSWORD@cluster.mongodb.net/ethixai?retryWrites=true&w=majority")

# Sentry DSN
gcloud secrets create sentry-dsn \
  --replication-policy="automatic" \
  --data-file=<(echo "https://PUBLIC_KEY@sentry.io/PROJECT_ID")

# Session encryption key (32 bytes)
gcloud secrets create session-encryption-key \
  --replication-policy="automatic" \
  --data-file=<(openssl rand -base64 32)
```

**Access control (IAM):**

```bash
# Grant backend service account access to secrets
gcloud secrets add-iam-policy-binding jwt-secret-key \
  --member="serviceAccount:backend@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding mongodb-uri \
  --member="serviceAccount:backend@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for ai_core service account and all required secrets
```

---

### 3.2 AWS Secrets Manager Setup (Alternative)

**Create secrets:**

```bash
# JWT secrets
aws secretsmanager create-secret \
  --name ethixai/prod/jwt-secret-key \
  --secret-string "$(openssl rand -base64 64)"

aws secretsmanager create-secret \
  --name ethixai/prod/jwt-refresh-secret \
  --secret-string "$(openssl rand -base64 64)"

# MongoDB URI
aws secretsmanager create-secret \
  --name ethixai/prod/mongodb-uri \
  --secret-string "mongodb+srv://prod-user:PASSWORD@cluster.mongodb.net/ethixai"
```

**Access policy (IAM role for ECS task):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:ethixai/prod/*"
      ]
    }
  ]
}
```

---

## 4. Application Integration

### 4.1 Backend (Node.js) Secret Loading

**Using GCP Secret Manager client library:**

```javascript
// backend/src/secrets.js
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

async function accessSecret(secretName) {
  const name = `projects/${process.env.GCP_PROJECT_ID}/secrets/${secretName}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name });
  return version.payload.data.toString('utf8');
}

// Load secrets at startup
async function loadSecrets() {
  return {
    jwtSecretKey: await accessSecret('jwt-secret-key'),
    jwtRefreshSecret: await accessSecret('jwt-refresh-secret'),
    mongoUri: await accessSecret('mongodb-uri'),
    sentryDsn: await accessSecret('sentry-dsn'),
    sessionEncryptionKey: await accessSecret('session-encryption-key')
  };
}

module.exports = { loadSecrets };
```

**Usage in server.js:**

```javascript
const { loadSecrets } = require('./secrets');

(async () => {
  const secrets = await loadSecrets();
  process.env.SECRET_KEY = secrets.jwtSecretKey;
  process.env.REFRESH_SECRET = secrets.jwtRefreshSecret;
  process.env.MONGO_URL = secrets.mongoUri;
  // ... start server
})();
```

---

### 4.2 AI Core (Python/FastAPI) Secret Loading

**Using GCP Secret Manager:**

```python
# ai_core/secrets.py
from google.cloud import secretmanager

def access_secret(secret_name: str, project_id: str) -> str:
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

def load_secrets():
    project_id = os.environ.get("GCP_PROJECT_ID")
    return {
        "mongo_uri": access_secret("mongodb-uri", project_id),
        "sentry_dsn": access_secret("sentry-dsn", project_id),
    }
```

**Usage in main.py:**

```python
import os
from secrets import load_secrets

secrets = load_secrets()
os.environ["MONGO_URL"] = secrets["mongo_uri"]
# ... initialize FastAPI app
```

---

### 4.3 Cloud Run Environment Configuration

**Do NOT set secrets as environment variables directly.** Instead, mount secrets as volumes or use Secret Manager SDK at runtime.

**Cloud Run service descriptor (example):**

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ethixai-backend
spec:
  template:
    spec:
      serviceAccountName: backend@PROJECT_ID.iam.gserviceaccount.com
      containers:
      - image: ghcr.io/geoaziz/ethixai-backend:sha-abc123
        env:
        - name: GCP_PROJECT_ID
          value: "ethixai-production"
        - name: NODE_ENV
          value: "production"
        # Secrets loaded at runtime via SDK (not environment variables)
```

---

## 5. CI/CD Secret Access

### 5.1 GitHub Actions with OIDC (Preferred)

**Why OIDC?** Eliminates long-lived service account keys; GitHub Actions gets short-lived tokens via Workload Identity Federation.

**Setup:**

1. **Create Workload Identity Pool in GCP:**

```bash
gcloud iam workload-identity-pools create "github-actions" \
  --project="ethixai-production" \
  --location="global" \
  --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="ethixai-production" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub OIDC Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

2. **Bind service account to GitHub repo:**

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions@ethixai-production.iam.gserviceaccount.com" \
  --project="ethixai-production" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/attribute.repository/GeoAziz/EthAI-Guard"
```

3. **GitHub Actions workflow:**

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for OIDC
    steps:
      - uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: 'projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/providers/github-provider'
          service_account: 'github-actions@ethixai-production.iam.gserviceaccount.com'
      
      - name: Access secrets
        run: |
          gcloud secrets versions access latest --secret="jwt-secret-key"
```

---

### 5.2 GitHub Secrets (Fallback)

**If OIDC setup is complex, use GitHub Secrets for CI-only secrets:**

```bash
# Navigate to GitHub repo → Settings → Secrets and variables → Actions
# Add these secrets:
GCP_SERVICE_ACCOUNT_KEY  # Base64-encoded JSON key (rotate every 90 days)
MONGODB_ATLAS_API_KEY    # For backup automation
```

**Usage in workflow:**

```yaml
- name: Authenticate to GCP
  uses: google-github-actions/auth@v1
  with:
    credentials_json: '${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}'
```

---

## 6. Secret Rotation Procedures

### 6.1 Manual Rotation (JWT Secrets)

**Steps:**

1. Generate new secret:
   ```bash
   NEW_SECRET=$(openssl rand -base64 64)
   ```

2. Add new version to Secret Manager:
   ```bash
   echo "$NEW_SECRET" | gcloud secrets versions add jwt-secret-key --data-file=-
   ```

3. Deploy new version of backend (it will fetch latest version automatically)

4. Wait 24 hours (allow old tokens to expire; JWT access tokens TTL = 15 minutes)

5. Verify no errors in logs related to token validation

6. (Optional) Disable old secret version:
   ```bash
   gcloud secrets versions disable 1 --secret=jwt-secret-key
   ```

---

### 6.2 Automatic Rotation (MongoDB URI)

**MongoDB Atlas supports automatic credential rotation:**

1. Enable Atlas Database User rotation (30-90 day intervals)
2. Atlas updates connection string automatically
3. Update Secret Manager with new URI via Atlas API or manually
4. Redeploy services (Cloud Run detects new secret version)

**Automation script (run via GitHub Actions cron):**

```bash
#!/bin/bash
# Fetch new MongoDB URI from Atlas API
NEW_URI=$(curl -u "$ATLAS_PUBLIC_KEY:$ATLAS_PRIVATE_KEY" \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/$PROJECT_ID/clusters/$CLUSTER_NAME/connectionStrings" \
  | jq -r '.standardSrv')

# Update Secret Manager
echo "$NEW_URI" | gcloud secrets versions add mongodb-uri --data-file=-

# Trigger rolling restart of backend/ai_core to pick up new secret
gcloud run services update ethixai-backend --region=us-east1
```

---

## 7. Audit & Compliance

### 7.1 Access Logs

**GCP Secret Manager automatically logs all access attempts:**

- **Log name:** `cloudaudit.googleapis.com/data_access`
- **Retention:** 400 days (configurable)
- **Query example (list all jwt-secret-key accesses):**

```bash
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret AND protoPayload.resourceName=~'jwt-secret-key'" \
  --limit=50 \
  --format=json
```

**Alert on suspicious access patterns:**

```yaml
# Alerting policy: Notify if same secret accessed >1000 times in 1 hour
- alert: SecretAccessSpike
  expr: rate(secret_access_total{secret_name="jwt-secret-key"}[1h]) > 1000
  annotations:
    summary: "Unusual secret access pattern detected"
```

---

### 7.2 Secret Versioning

**All secrets in Secret Manager maintain version history:**

- View versions: `gcloud secrets versions list jwt-secret-key`
- Rollback to previous version: `gcloud secrets versions enable 2 --secret=jwt-secret-key`
- Destroy compromised version: `gcloud secrets versions destroy 3 --secret=jwt-secret-key`

---

## 8. Emergency Procedures

### 8.1 Secret Compromise Response

**If a secret is compromised (e.g., leaked in logs, GitHub commit):**

1. **Immediate Rotation:**
   ```bash
   # Generate new secret
   openssl rand -base64 64 | gcloud secrets versions add COMPROMISED_SECRET --data-file=-
   
   # Disable old version
   gcloud secrets versions disable PREVIOUS_VERSION --secret=COMPROMISED_SECRET
   ```

2. **Force Redeploy:**
   ```bash
   # Trigger zero-downtime rolling restart to pick up new secret
   gcloud run services update ethixai-backend --region=us-east1
   ```

3. **Revoke Active Sessions:**
   - For JWT secrets: Invalidate all refresh tokens in database
   - For database credentials: Terminate existing connections via Atlas UI

4. **Incident Report:**
   - Document in post-mortem: how secret was leaked, remediation steps, preventive measures
   - Update access controls if necessary (e.g., remove over-privileged service account)

---

### 8.2 Secret Manager Unavailable

**Failover plan if Secret Manager API is down:**

1. **Read-only mode:** Services continue with last-fetched secrets cached in memory
2. **Cold start fallback:** Store encrypted backup of critical secrets in Cloud Storage with KMS encryption
3. **Decrypt and load:** Use Cloud KMS to decrypt backup secrets during startup if Secret Manager times out

**Implementation (backend):**

```javascript
async function loadSecretsWithFallback() {
  try {
    return await loadSecrets(); // Primary: Secret Manager
  } catch (err) {
    logger.error({ err }, 'Secret Manager unavailable, using KMS-encrypted backup');
    return await loadSecretsFromKMS(); // Fallback: Cloud Storage + KMS
  }
}
```

---

## 9. Secrets Checklist (Pre-Production)

- [ ] All secrets migrated from `.env` files to Secret Manager
- [ ] Service accounts have least-privilege IAM roles (`secretmanager.secretAccessor` only)
- [ ] GitHub Actions uses OIDC (or rotates service account keys every 90 days)
- [ ] Automatic rotation enabled for database credentials
- [ ] Manual rotation schedule documented for JWT secrets (every 180 days)
- [ ] Access logging enabled with alerts for anomalous patterns
- [ ] Secret versions retained for 90 days minimum (compliance requirement)
- [ ] Emergency response playbook tested in staging environment
- [ ] All developers removed from production Secret Manager access (read-only via bastion host only)

---

## 10. References

- [GCP Secret Manager Best Practices](https://cloud.google.com/secret-manager/docs/best-practices)
- [AWS Secrets Manager Rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- [MongoDB Atlas Credential Management](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-16 | Security Team | Initial secrets management policy |

---

**Approval:**
- [ ] Security Lead: _________________ Date: _______
- [ ] DevOps Lead: __________________ Date: _______
