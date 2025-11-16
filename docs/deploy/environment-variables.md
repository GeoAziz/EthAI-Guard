# Environment Variables - EthixAI Configuration

**Version:** 1.0  
**Date:** 2025-11-16  
**Owner:** Platform Engineering  
**Applies to:** Backend, AI Core, Frontend

---

## 1. Overview

This document catalogs all environment variables used across EthixAI services. Variables are:

1. **Non-Secret (Safe for Cloud Run env vars):** Configuration flags, service URLs, port numbers
2. **Secret (Loaded from Secret Manager):** Passwords, API keys, JWT secrets

**Critical Rule:** ⚠️ **NEVER commit secrets to `.env` files in Git.** Secrets MUST be stored in GCP Secret Manager and loaded at runtime.

---

## 2. Backend Environment Variables

### 2.1 Application Configuration (Non-Secret)

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `NODE_ENV` | String | `development` | Environment mode (`development`, `staging`, `production`) | `production` | ✅ |
| `PORT` | Number | `3001` | HTTP server port | `3001` | ✅ |
| `LOG_LEVEL` | String | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) | `warn` | ❌ |
| `AI_CORE_URL` | String | `http://localhost:8100` | AI Core service base URL | `https://ai-core.ethixai.com` | ✅ |
| `FRONTEND_URL` | String | `http://localhost:3000` | Frontend URL (for CORS) | `https://ethixai.com` | ✅ |
| `CORS_ORIGINS` | String | `*` | Comma-separated allowed origins | `https://ethixai.com,https://app.ethixai.com` | ✅ |

---

### 2.2 Database Configuration (Non-Secret)

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `MONGO_URL` | **Secret** | — | MongoDB connection string (loaded from Secret Manager) | `mongodb+srv://...` | ✅ |
| `MONGO_MAX_POOL_SIZE` | Number | `10` | MongoDB connection pool size | `20` | ❌ |
| `POSTGRES_URL` | String | — | PostgreSQL connection string (if using Postgres for auth) | `postgres://user:pass@host:5432/db` | ❌ |

**Loading `MONGO_URL` from Secret Manager:**

```javascript
// backend/src/secrets.js
const { accessSecret } = require('./secrets');
process.env.MONGO_URL = await accessSecret('mongodb-uri');
```

---

### 2.3 Authentication & Security (Secrets)

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `SECRET_KEY` | **Secret** | — | HMAC secret for JWT access token signing (loaded from Secret Manager) | `base64-encoded-256-bit-key` | ✅ |
| `REFRESH_SECRET` | **Secret** | — | HMAC secret for JWT refresh token signing (loaded from Secret Manager) | `base64-encoded-256-bit-key` | ✅ |
| `SESSION_ENCRYPTION_KEY` | **Secret** | — | 32-byte key for encrypting session cookies | `base64-encoded-32-bytes` | ❌ |
| `JWT_ACCESS_TOKEN_EXPIRY` | String | `15m` | Access token TTL (time-to-live) | `15m` | ❌ |
| `JWT_REFRESH_TOKEN_EXPIRY` | String | `7d` | Refresh token TTL | `7d` | ❌ |

---

### 2.4 Object Storage (Secrets)

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `GCS_BUCKET_NAME` | String | `ethixai-production-reports` | GCS bucket for storing analysis reports | `ethixai-production-reports` | ✅ |
| `GCS_PROJECT_ID` | String | `ethixai-production` | GCP project ID | `ethixai-production` | ✅ |
| `GCS_SERVICE_ACCOUNT_KEY` | **Secret** | — | Service account JSON key (loaded from Secret Manager, or use Workload Identity) | `{ "type": "service_account", ... }` | ❌ (if using Workload Identity) |

**Preferred:** Use Workload Identity instead of service account keys:

```yaml
# Cloud Run service descriptor
serviceAccountName: backend@ethixai-production.iam.gserviceaccount.com
```

---

### 2.5 Email (Optional, Secrets)

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `SMTP_HOST` | String | — | SMTP server hostname | `smtp.sendgrid.net` | ❌ |
| `SMTP_PORT` | Number | `587` | SMTP server port | `587` | ❌ |
| `SMTP_USER` | String | — | SMTP username | `apikey` | ❌ |
| `SMTP_PASSWORD` | **Secret** | — | SMTP password (loaded from Secret Manager) | `SG.abc123...` | ❌ |
| `EMAIL_FROM` | String | `noreply@ethixai.com` | Sender email address | `noreply@ethixai.com` | ❌ |

---

### 2.6 Observability (Non-Secret + Secrets)

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `SENTRY_DSN` | **Secret** | — | Sentry error tracking DSN (loaded from Secret Manager) | `https://PUBLIC_KEY@sentry.io/PROJECT_ID` | ❌ |
| `SENTRY_ENVIRONMENT` | String | `production` | Sentry environment tag | `production` | ❌ |
| `PROMETHEUS_SCRAPE_AUTH` | **Secret** | — | Basic auth password for `/metrics` endpoint (loaded from Secret Manager) | `scrape-password-123` | ❌ |
| `RELEASE_VERSION` | String | `v1.0.0` | Application version (set by CI/CD) | `v20251116-abc123` | ✅ |

---

### 2.7 Rate Limiting & Security

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `DISABLE_RATE_LIMIT` | String | `0` | Disable rate limiting (1=disable, 0=enable) | `0` | ❌ |
| `RATE_LIMIT_WINDOW_MS` | Number | `900000` | Rate limit window in milliseconds (15 minutes) | `900000` | ❌ |
| `RATE_LIMIT_MAX_REQUESTS` | Number | `100` | Max requests per window | `100` | ❌ |

---

## 3. AI Core Environment Variables

### 3.1 Application Configuration (Non-Secret)

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `ENVIRONMENT` | String | `development` | Environment mode (`development`, `staging`, `production`) | `production` | ✅ |
| `PORT` | Number | `8100` | HTTP server port | `8100` | ✅ |
| `LOG_LEVEL` | String | `INFO` | Logging verbosity (`DEBUG`, `INFO`, `WARN`, `ERROR`) | `WARN` | ❌ |
| `WORKERS` | Number | `1` | Number of Uvicorn worker processes | `4` | ❌ |

---

### 3.2 Database Configuration (Secret)

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `MONGO_URL` | **Secret** | — | MongoDB connection string (loaded from Secret Manager) | `mongodb+srv://...` | ✅ |

---

### 3.3 Model Configuration (Non-Secret)

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `MODEL_CACHE_DIR` | String | `/tmp/models` | Directory for caching ML models | `/tmp/models` | ❌ |
| `SHAP_MAX_SAMPLES` | Number | `100` | Max samples for SHAP explainability (to prevent OOM) | `100` | ❌ |
| `ENABLE_SHAP_CACHE` | String | `true` | Enable SHAP value caching | `true` | ❌ |

---

### 3.4 Object Storage (Secrets)

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `GCS_BUCKET_NAME` | String | `ethixai-production-reports` | GCS bucket for storing model artifacts | `ethixai-production-reports` | ✅ |
| `GCS_PROJECT_ID` | String | `ethixai-production` | GCP project ID | `ethixai-production` | ✅ |

---

### 3.5 Observability (Secrets)

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `SENTRY_DSN` | **Secret** | — | Sentry error tracking DSN (loaded from Secret Manager) | `https://PUBLIC_KEY@sentry.io/PROJECT_ID` | ❌ |
| `SENTRY_ENVIRONMENT` | String | `production` | Sentry environment tag | `production` | ❌ |
| `RELEASE_VERSION` | String | `v1.0.0` | Application version (set by CI/CD) | `v20251116-abc123` | ✅ |

---

## 4. Frontend Environment Variables

### 4.1 Build-Time Variables (Vercel)

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `NEXT_PUBLIC_BACKEND_URL` | String | `http://localhost:3001` | Backend API base URL (exposed to browser) | `https://backend.ethixai.com` | ✅ |
| `NEXT_PUBLIC_SENTRY_DSN` | String | — | Sentry DSN for frontend error tracking | `https://PUBLIC_KEY@sentry.io/PROJECT_ID` | ❌ |
| `NEXT_PUBLIC_ENVIRONMENT` | String | `production` | Environment name (shown in footer) | `production` | ❌ |

**Note:** `NEXT_PUBLIC_*` variables are **public** (visible in browser source). Do NOT use for secrets.

---

### 4.2 Vercel Configuration

| Variable | Type | Default | Description | Example | Required |
|----------|------|---------|-------------|---------|----------|
| `VERCEL_TOKEN` | **Secret** | — | Vercel deployment token (stored in GitHub Secrets) | `abc123...` | ✅ |
| `VERCEL_ORG_ID` | String | — | Vercel organization ID | `team_abc123` | ✅ |
| `VERCEL_PROJECT_ID` | String | — | Vercel project ID | `prj_abc123` | ✅ |

---

## 5. Secret Manager Mapping

**All secrets are stored in GCP Secret Manager with the following naming convention:**

| Environment Variable | Secret Manager Name | Rotation Period | Notes |
|---------------------|---------------------|-----------------|-------|
| `SECRET_KEY` | `jwt-secret-key` | 180 days | Backend access token signing |
| `REFRESH_SECRET` | `jwt-refresh-secret` | 180 days | Backend refresh token signing |
| `MONGO_URL` | `mongodb-uri` | Auto-rotated by Atlas | Backend + AI Core database connection |
| `SENTRY_DSN` | `sentry-dsn` | N/A (revocable via UI) | Backend + AI Core error tracking |
| `SESSION_ENCRYPTION_KEY` | `session-encryption-key` | 90 days | Backend session cookie encryption |
| `SMTP_PASSWORD` | `smtp-password` | 180 days | Backend email sending |
| `GCS_SERVICE_ACCOUNT_KEY` | `gcs-service-account-key` | 90 days | Backend + AI Core object storage (if not using Workload Identity) |
| `PROMETHEUS_SCRAPE_AUTH` | `prometheus-scrape-password` | 90 days | Prometheus authentication |

---

## 6. Environment-Specific Configurations

### 6.1 Development (Local)

**`.env.development` (Backend):**

```bash
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# Local MongoDB (Docker)
MONGO_URL=mongodb://localhost:27017/ethixai_dev

# Local AI Core
AI_CORE_URL=http://localhost:8100

# CORS
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000

# JWT secrets (dev only, NOT production secrets)
SECRET_KEY=dev-secret-key-replace-me
REFRESH_SECRET=dev-refresh-secret-replace-me

# Disable rate limiting for local testing
DISABLE_RATE_LIMIT=1
```

**`.env.development` (AI Core):**

```bash
ENVIRONMENT=development
PORT=8100
LOG_LEVEL=DEBUG

MONGO_URL=mongodb://localhost:27017/ethixai_dev

# Local model cache
MODEL_CACHE_DIR=/tmp/models

# SHAP settings (small samples for fast testing)
SHAP_MAX_SAMPLES=50
ENABLE_SHAP_CACHE=true
```

---

### 6.2 Staging

**Cloud Run Environment Variables (set via `gcloud run deploy`):**

**Backend:**

```bash
NODE_ENV=staging
PORT=3001
LOG_LEVEL=info

# Staging MongoDB Atlas cluster
MONGO_URL=<loaded from Secret Manager: mongodb-uri-staging>

# Staging AI Core URL
AI_CORE_URL=https://ai-core-staging.ethixai.com

# Frontend
FRONTEND_URL=https://staging.ethixai.com
CORS_ORIGINS=https://staging.ethixai.com

# Secrets loaded from Secret Manager
SECRET_KEY=<loaded from Secret Manager: jwt-secret-key-staging>
REFRESH_SECRET=<loaded from Secret Manager: jwt-refresh-secret-staging>

# GCP project
GCS_PROJECT_ID=ethixai-staging
GCS_BUCKET_NAME=ethixai-staging-reports

# Release version (set by CI/CD)
RELEASE_VERSION=v20251116-abc123
```

---

### 6.3 Production

**Cloud Run Environment Variables:**

**Backend:**

```bash
NODE_ENV=production
PORT=3001
LOG_LEVEL=warn

# Secrets loaded at runtime from Secret Manager (not env vars)
# See backend/src/secrets.js for loading code

# Production AI Core URL
AI_CORE_URL=https://ai-core.ethixai.com

# Frontend
FRONTEND_URL=https://ethixai.com
CORS_ORIGINS=https://ethixai.com

# GCP project
GCS_PROJECT_ID=ethixai-production
GCS_BUCKET_NAME=ethixai-production-reports

# Release version (set by CI/CD)
RELEASE_VERSION=v20251116-abc123

# Rate limiting enabled
DISABLE_RATE_LIMIT=0
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Sentry (loaded from Secret Manager)
SENTRY_DSN=<loaded from Secret Manager: sentry-dsn>
SENTRY_ENVIRONMENT=production
```

---

## 7. CI/CD Environment Variables (GitHub Secrets)

**Required GitHub Secrets for `.github/workflows/deploy-production.yml`:**

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | OIDC provider for GitHub Actions | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT_EMAIL` | Service account for deployments | `github-actions@ethixai-production.iam.gserviceaccount.com` |
| `SLACK_WEBHOOK_URL` | Slack webhook for deployment notifications | `https://hooks.slack.com/services/...` |
| `SENTRY_AUTH_TOKEN` | Sentry API token (for creating releases) | `abc123...` |

---

## 8. Security Best Practices

### 8.1 Secret Rotation

**JWT Secrets:**

```bash
# Generate new secret
openssl rand -base64 64

# Add new version to Secret Manager
gcloud secrets versions add jwt-secret-key --data-file=<(echo "NEW_SECRET")

# Deploy new backend revision (picks up latest secret version)
gcloud run services update ethixai-backend --region us-east1
```

**Rotation Schedule:**
- JWT secrets: Every 180 days
- Session encryption key: Every 90 days
- Database credentials: Auto-rotated by MongoDB Atlas every 90 days
- Service account keys: Every 90 days (or use Workload Identity to eliminate keys)

---

### 8.2 Secret Auditing

**View who accessed secrets:**

```bash
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret AND protoPayload.resourceName=~'jwt-secret-key'" \
  --limit=50 \
  --format=json
```

**Alert on unusual access patterns:**

```promql
# Prometheus alert: More than 1000 secret accesses per hour
rate(secret_access_total{secret_name="jwt-secret-key"}[1h]) > 1000
```

---

## 9. Environment Variables Checklist (Pre-Production)

- [ ] All secrets migrated from `.env` files to Secret Manager
- [ ] `NODE_ENV=production` set for production backend
- [ ] `ENVIRONMENT=production` set for production ai_core
- [ ] `LOG_LEVEL=warn` or `error` in production (not `debug`)
- [ ] `DISABLE_RATE_LIMIT=0` (rate limiting enabled)
- [ ] `CORS_ORIGINS` set to production domain (not `*`)
- [ ] `RELEASE_VERSION` set by CI/CD (tracks deployed version)
- [ ] `SENTRY_DSN` configured for error tracking
- [ ] `GCS_BUCKET_NAME` points to production bucket
- [ ] No hardcoded secrets in Cloud Run env vars (loaded from Secret Manager)

---

## 10. Debugging Environment Variables

**Check what environment variables are set in a running Cloud Run service:**

```bash
# Get current environment variables
gcloud run services describe ethixai-backend --region us-east1 \
  --format="value(spec.template.spec.containers[0].env)"

# Expected output (secrets should NOT appear here):
# - name: NODE_ENV
#   value: production
# - name: GCS_PROJECT_ID
#   value: ethixai-production
```

**Test secret loading locally:**

```bash
# Backend
export GCP_PROJECT_ID=ethixai-production
node -e "const { loadSecrets } = require('./backend/src/secrets'); loadSecrets().then(secrets => console.log(Object.keys(secrets)));"

# Expected output:
# ['jwtSecretKey', 'jwtRefreshSecret', 'mongoUri', 'sentryDsn', 'sessionEncryptionKey']
```

---

## 11. References

- [Secrets Management Documentation](secrets-management.md)
- [Production Deployment Plan](production-plan.md)
- [GCP Secret Manager Best Practices](https://cloud.google.com/secret-manager/docs/best-practices)
- [Twelve-Factor App: Config](https://12factor.net/config)

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-16 | Platform Engineering | Initial environment variables catalog |

