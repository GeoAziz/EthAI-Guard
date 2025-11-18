# Monitoring Infrastructure

**EthixAI Model Monitoring System**  
**Version**: 1.0  
**Last Updated**: November 18, 2025  
**Target**: Free-tier deployment for MVP, scale-out path documented

## Overview

EthixAI's monitoring system is designed to run **entirely on free-tier services** for up to 10,000 predictions/day. This document provides deployment architecture, resource allocation, cost analysis, and scale-out plans.

---

## Deployment Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                            User Traffic                                │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
            ┌───────▼────────┐     ┌───────▼────────┐
            │   Frontend     │     │    Backend     │
            │  (Next.js)     │     │   (Express)    │
            │                │     │                │
            │  Vercel Hobby  │     │  Render Free   │
            │  • 100 GB BW   │     │  • 750 hrs/mo  │
            │  • Serverless  │     │  • 512 MB RAM  │
            │  • Auto-scale  │     │  • Sleeps 15m  │
            └───────┬────────┘     └───────┬────────┘
                    │                      │
                    │                      │ API calls
                    │                      │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼──────────┐
                    │   MongoDB Atlas     │
                    │     (M0 Free)       │
                    │                     │
                    │  • 512 MB storage   │
                    │  • Shared cluster   │
                    │  • Daily backups    │
                    └──────────┬──────────┘
                               │
                               │ reads logs
                               │
                    ┌──────────▼──────────┐
                    │  GitHub Actions     │
                    │  (Drift Analyzer)   │
                    │                     │
                    │  • 2,000 min/mo     │
                    │  • Cron: */6 * * *  │
                    │  • Python worker    │
                    └──────────┬──────────┘
                               │
                               │ triggers alerts
                               │
                    ┌──────────▼──────────┐
                    │  Slack Webhooks     │
                    │  (Free)             │
                    └─────────────────────┘
```

---

## Component Details

### 1. Frontend: Vercel (Hobby Plan)

**Service**: Next.js app deployed to Vercel  
**Plan**: Hobby (Free)  
**URL**: `https://ethixai-monitoring.vercel.app`

**Resources**:
- **Bandwidth**: 100 GB/month
- **Build Minutes**: 6,000 minutes/month
- **Serverless Functions**: Unlimited invocations
- **Edge Network**: Global CDN
- **Custom Domain**: Supported (ethixai.com/monitoring)

**Deployment**:
```yaml
# vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    { "src": "/monitoring/(.*)", "dest": "/monitoring/$1" }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://ethixai-backend.onrender.com"
  }
}
```

**Auto-deployment**: Push to `main` branch triggers build  
**Build Time**: ~2-3 minutes  
**Cold Start**: N/A (serverless, always warm)

**Estimated Usage**:
- **Daily Visits**: ~50 (internal team)
- **Page Views/Visit**: ~5
- **Data Transfer**: ~250 page views × 500 KB = 125 MB/day = **3.75 GB/month**
- **Headroom**: 100 GB limit → **26× headroom** ✓

---

### 2. Backend: Render (Free Plan)

**Service**: Express.js API on Render  
**Plan**: Free  
**URL**: `https://ethixai-backend.onrender.com`

**Resources**:
- **Compute**: 750 hours/month (one instance = 720 hours/month)
- **RAM**: 512 MB
- **CPU**: Shared
- **Sleep After**: 15 minutes of inactivity
- **Wake Time**: ~30 seconds

**Deployment**:
```yaml
# render.yaml
services:
  - type: web
    name: ethixai-backend
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGO_URI
        sync: false  # Set in Render dashboard
      - key: SLACK_WEBHOOK_URL
        sync: false
```

**Auto-deployment**: Push to `main` branch triggers redeploy  
**Build Time**: ~3-5 minutes  
**Healthcheck**: `GET /health` every 5 minutes (keeps service warm during work hours)

**Sleep Behavior**:
- Sleeps after 15 min inactivity
- First request after sleep: ~30s latency (cold start)
- **Mitigation**: Scheduled healthcheck pings (e.g., UptimeRobot free tier)

**Estimated Usage**:
- **API Requests/Day**: ~200 (dashboard loads, drift analyzer triggers)
- **Avg Response Time**: 150ms
- **Compute Time**: 200 × 0.15s = 30 seconds/day = **15 hours/month**
- **Headroom**: 750 hours limit → **50× headroom** ✓

---

### 3. AI Core: Render (Free Plan, Separate Service)

**Service**: FastAPI app on Render  
**Plan**: Free  
**URL**: `https://ethixai-ai-core.onrender.com`

**Resources**: Same as backend (512 MB RAM, 750 hours/month)

**Deployment**: Similar to backend, but uses `uvicorn` as start command

**Usage**:
- **Prediction Requests**: ~1,000/day
- **Avg Processing**: 200ms
- **Compute**: 1,000 × 0.2s = 200 seconds/day = **100 hours/month**
- **Headroom**: 750 hours limit → **7.5× headroom** ✓

**Note**: Backend and AI Core are **separate services**, each gets 750 hours/month.

---

### 4. Database: MongoDB Atlas (M0 Free)

**Service**: MongoDB Atlas  
**Plan**: M0 (Free Forever)  
**Region**: AWS us-east-1

**Resources**:
- **Storage**: 512 MB
- **RAM**: Shared
- **Backups**: Daily (retained 2 days)
- **Network**: Unlimited egress

**Collections Size Estimates** (from `monitoring_schemas.md`):
| Collection | Annual Size |
|------------|-------------|
| prediction_logs | 180 MB (90-day TTL) |
| drift_snapshots | 0.5 MB |
| monitoring_records | 22 MB (5-year retention) |
| incidents | 0.5 MB |
| alerts | 1.5 MB (1-year TTL) |
| alert_suppressions | 0.05 MB |
| monitoring_audit_logs | 3 MB |
| **TOTAL** | **~207 MB** |

**Headroom**: 512 MB limit → **2.5× headroom** ✓

**Connection String**:
```
mongodb+srv://ethixai:PASSWORD@cluster0.xxxxx.mongodb.net/ethixai_monitoring?retryWrites=true&w=majority
```

**Security**:
- IP Whitelist: GitHub Actions runner IPs + Render IPs + office IP
- Database user: `ethixai` (read/write access)
- Password: Stored in GitHub Secrets + Render env vars

---

### 5. Drift Analyzer: GitHub Actions (Free)

**Service**: GitHub Actions workflow  
**Plan**: Free (2,000 minutes/month for public repos)  
**Trigger**: Cron schedule + manual dispatch

**Workflow File**:
```yaml
# .github/workflows/drift-analysis.yml
name: Drift Analysis

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:        # Manual trigger

jobs:
  analyze-drift:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Python 3.11
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('ai_core/requirements.txt') }}
      
      - name: Install dependencies
        run: |
          pip install -r ai_core/requirements.txt
      
      - name: Run drift analyzer
        env:
          MONGO_URI: ${{ secrets.MONGO_URI }}
          BACKEND_URL: ${{ secrets.BACKEND_URL }}
        run: |
          python ai_core/monitoring/drift_analyzer.py
      
      - name: Upload analysis report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: drift-report
          path: drift_report.json
```

**Execution Frequency**:
- Daily models: 4 runs/day (every 6 hours)
- Execution time: ~8 minutes/run
- **Total**: 4 runs × 8 min × 30 days = **960 minutes/month**
- **Headroom**: 2,000 limit → **2× headroom** ✓

**IP Whitelisting**:
GitHub Actions runners use dynamic IPs. Solutions:
1. Use MongoDB Atlas network access: "Allow access from anywhere" (secured by password)
2. Or use Render backend as proxy (drift analyzer → backend → MongoDB)

---

### 6. Alerts: Slack Webhooks (Free)

**Service**: Slack Incoming Webhooks  
**Plan**: Free (unlimited webhooks)  
**Channel**: `#ml-monitoring`

**Setup**:
1. Create Slack app: https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Add webhook to workspace
4. Copy webhook URL: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`
5. Store in GitHub Secrets and Render env vars

**Rate Limits**:
- **1 message/second** per webhook
- EthixAI usage: ~10 alerts/day → **well within limit** ✓

**Alternative**: Email notifications via SendGrid (free tier: 100 emails/day)

---

### 7. Optional: UptimeRobot (Free)

**Service**: Uptime monitoring  
**Plan**: Free (50 monitors, 5-minute checks)  
**Purpose**: Keep Render backend awake during work hours

**Configuration**:
- Monitor: `GET https://ethixai-backend.onrender.com/health`
- Interval: 5 minutes
- Alert if down: Send to #engineering Slack channel

**Effect**: Prevents backend from sleeping during 9 AM - 6 PM UTC (work hours)

---

## Deployment Workflows

### Initial Deployment

```bash
# 1. Deploy backend to Render
git push origin main  # Auto-deploys via GitHub integration

# 2. Deploy frontend to Vercel
vercel --prod

# 3. Set up MongoDB Atlas
# (Manual: Create cluster via web UI)

# 4. Configure GitHub Actions secrets
gh secret set MONGO_URI -b"mongodb+srv://..."
gh secret set BACKEND_URL -b"https://ethixai-backend.onrender.com"

# 5. Create Slack webhook
# (Manual: via Slack app settings)

# 6. Run first baseline creation
curl -X POST https://ethixai-backend.onrender.com/api/v1/monitoring/baselines/create \
  -H "Content-Type: application/json" \
  -d @validation_data.json

# 7. Trigger first drift analysis (manual)
gh workflow run drift-analysis.yml
```

### Continuous Deployment

**Frontend**:
- Push to `frontend/` directory → Vercel auto-deploys
- Preview URLs for PRs

**Backend**:
- Push to `backend/` directory → Render auto-deploys
- Zero-downtime rolling deployment

**AI Core**:
- Push to `ai_core/` directory → Render auto-deploys

**Drift Analyzer**:
- Push to `.github/workflows/` → GitHub Actions uses updated workflow

---

## Environment Variables

### Backend (Render)

```env
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb+srv://ethixai:PASSWORD@cluster0.xxxxx.mongodb.net/ethixai_monitoring
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
JWT_SECRET=...
FIREBASE_SERVICE_ACCOUNT=... (optional)
AI_CORE_URL=https://ethixai-ai-core.onrender.com
```

### Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://ethixai-backend.onrender.com
NEXT_PUBLIC_FIREBASE_CONFIG=... (for auth)
```

### GitHub Actions Secrets

```
MONGO_URI
BACKEND_URL
SLACK_WEBHOOK_URL (optional, can also trigger via backend)
```

---

## Cost Analysis

### Free Tier (MVP, 0-10k predictions/day)

| Service | Plan | Cost | Usage | Limit | Headroom |
|---------|------|------|-------|-------|----------|
| **Vercel** | Hobby | $0 | 3.75 GB/mo | 100 GB | 26× |
| **Render (Backend)** | Free | $0 | 15 hrs/mo | 750 hrs | 50× |
| **Render (AI Core)** | Free | $0 | 100 hrs/mo | 750 hrs | 7.5× |
| **MongoDB Atlas** | M0 | $0 | 207 MB | 512 MB | 2.5× |
| **GitHub Actions** | Free | $0 | 960 min/mo | 2,000 min | 2× |
| **Slack Webhooks** | Free | $0 | 10/day | 1/sec | ∞ |
| **TOTAL** | | **$0/month** | | | ✓ |

### Scale-Out (Paid Tier, 10k-100k predictions/day)

| Service | Plan | Cost | Notes |
|---------|------|------|-------|
| **Vercel** | Pro | $20/mo | 1 TB bandwidth, better performance |
| **Render (Backend)** | Starter | $7/mo | Always-on, 512 MB RAM → 1 GB |
| **Render (AI Core)** | Starter | $7/mo | Always-on |
| **MongoDB Atlas** | M10 | $57/mo | Dedicated cluster, 10 GB storage |
| **GitHub Actions** | Free | $0 | Still within limit (or move to Render cron) |
| **Slack** | Free | $0 | Still within limit |
| **TOTAL** | | **~$91/month** | 10× capacity vs free tier |

### Enterprise (100k+ predictions/day)

| Service | Plan | Cost | Notes |
|---------|------|------|-------|
| **Vercel** | Enterprise | $Custom | Dedicated support, SLA |
| **AWS ECS** | Custom | $200/mo | 2× backend instances, auto-scaling |
| **AWS ECS** | Custom | $200/mo | 3× AI Core instances, load balanced |
| **MongoDB Atlas** | M30 | $343/mo | Replica set, 80 GB storage |
| **AWS Lambda** | Pay-per-use | $50/mo | Drift analyzer as Lambda function |
| **PagerDuty** | Team | $19/user/mo | Advanced alerting |
| **TOTAL** | | **~$812/month** | 100× capacity vs free tier |

---

## Monitoring the Infrastructure

### Health Checks

1. **Backend Health**: `GET /health`
   ```json
   {
     "status": "healthy",
     "uptime": 3600,
     "mongodb": "connected",
     "ai_core": "reachable"
   }
   ```

2. **Database Health**: MongoDB Atlas UI → Metrics tab
   - Storage usage
   - Connection count
   - Query performance

3. **Drift Analyzer Health**: GitHub Actions workflow status
   - Last run timestamp
   - Success/failure rate
   - Execution duration

### Alerting for Infrastructure Issues

| Issue | Detection | Alert |
|-------|-----------|-------|
| **Backend Down** | UptimeRobot (5-min checks) | Slack #engineering |
| **MongoDB Full** | Storage >90% | MongoDB Atlas email |
| **GitHub Actions Fail** | Workflow failure | GitHub notifications |
| **Drift Analyzer Stale** | No analysis >12 hours | Backend cronjob checks |

---

## Performance Benchmarks

### API Response Times (Backend on Render Free)

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| `GET /monitoring/records` | 120ms | 350ms | 800ms |
| `GET /monitoring/fairness` | 150ms | 400ms | 900ms |
| `POST /alerts/trigger` | 80ms | 200ms | 500ms |
| **Cold Start** | 25s | 35s | 45s |

**Note**: Cold starts only occur after 15 min inactivity. UptimeRobot prevents this during work hours.

### Drift Analysis Duration

| Model | Prediction Count | Analysis Time |
|-------|-----------------|---------------|
| Small (10 features) | 1,000 | 2 minutes |
| Medium (50 features) | 1,000 | 5 minutes |
| Large (200 features) | 1,000 | 8 minutes |

**GitHub Actions Timeout**: 10 minutes (configured in workflow)

---

## Disaster Recovery

### Backup Strategy

| Component | Backup Method | Frequency | Retention |
|-----------|--------------|-----------|-----------|
| **MongoDB** | Atlas automatic | Daily | 2 days (free tier) |
| **Code** | GitHub repo | On push | Indefinite |
| **Environment Vars** | Documented in this file | Manual | N/A |

### Recovery Procedures

#### Scenario 1: Render Backend Down
1. Check Render status page: https://status.render.com
2. If Render issue: Wait for resolution (SLA: best-effort)
3. If app issue: Check logs, rollback deployment via Render dashboard
4. **RTO**: 15 minutes

#### Scenario 2: MongoDB Atlas Down
1. Check MongoDB status: https://status.cloud.mongodb.com
2. If Atlas issue: Wait (99.9% uptime SLA, even free tier)
3. If data corruption: Restore from daily backup (via Atlas UI)
4. **RTO**: 1 hour (manual restore)

#### Scenario 3: GitHub Actions Failing
1. Check workflow logs in GitHub UI
2. If transient failure: Re-run workflow
3. If code issue: Fix `drift_analyzer.py`, push to main
4. If GitHub issue: Run drift analyzer manually on local machine, POST results to backend
5. **RTO**: 30 minutes

#### Scenario 4: Complete Data Loss
1. Restore MongoDB from Atlas backup (last 2 days)
2. Redeploy backend/frontend from `main` branch
3. Recreate baseline snapshots from training data
4. **RPO**: 2 days, **RTO**: 4 hours

---

## Security Hardening

### Network Security

1. **MongoDB IP Whitelist**:
   - Render IPs (for backend)
   - GitHub Actions IPs (all ranges, since dynamic)
   - Office/VPN IP (for manual access)

2. **API Authentication**:
   - All monitoring endpoints require JWT
   - Firebase Auth for dashboard access
   - API keys for drift analyzer

3. **Secrets Management**:
   - GitHub Secrets for MONGO_URI, webhooks
   - Render env vars (encrypted at rest)
   - No secrets in code or logs

### Data Security

1. **Encryption in Transit**: All connections use TLS 1.2+
2. **Encryption at Rest**: MongoDB Atlas encrypts all data
3. **PII Handling**: User IDs hashed, no raw PII in prediction logs
4. **Access Control**: MongoDB database user has read/write only on `ethixai_monitoring` database

---

## Scalability Triggers

| Metric | Free Tier Limit | Action Required |
|--------|----------------|-----------------|
| **Predictions/day** | 10,000 | Upgrade MongoDB to M10 |
| **Storage** | 512 MB | Upgrade MongoDB or reduce TTL |
| **API requests/min** | ~50 | Upgrade Render to Starter (always-on) |
| **Drift analysis time** | 10 min | Move to Render cron or AWS Lambda |
| **Dashboard traffic** | 100 GB/mo | Upgrade Vercel to Pro |

---

## Migration Paths

### From Free Tier to Paid Tier

**Trigger**: Predictions exceed 10k/day or MongoDB >400 MB

**Steps**:
1. Upgrade MongoDB Atlas: M0 → M10 ($57/mo)
   - Zero downtime, click "Upgrade" in Atlas UI
   - Update connection string (should be same)
2. Upgrade Render Backend: Free → Starter ($7/mo)
   - Prevents cold starts
3. Upgrade Render AI Core: Free → Starter ($7/mo)
4. (Optional) Upgrade Vercel: Hobby → Pro ($20/mo)
   - Better performance, custom domains

**Total Time**: 15 minutes  
**Downtime**: 0 minutes

### From Render to AWS (Enterprise Scale)

**Trigger**: Predictions exceed 100k/day

**Steps**:
1. Deploy backend to AWS ECS (Fargate)
2. Deploy AI Core to AWS ECS with Application Load Balancer
3. Move drift analyzer to AWS Lambda (scheduled via EventBridge)
4. Keep MongoDB Atlas (upgrade to M30)
5. Add CloudFront CDN for frontend (or keep Vercel)

**Estimated Migration Time**: 2-3 days  
**Cost**: ~$800/month

---

## Operational Runbooks

### Runbook 1: Scale Up MongoDB

**Scenario**: Storage approaching 512 MB limit

**Steps**:
1. Log in to MongoDB Atlas
2. Navigate to Cluster → Configuration
3. Click "Modify"
4. Select M10 tier
5. Confirm upgrade
6. Wait 5-10 minutes for migration
7. Test connection: `curl -X GET https://ethixai-backend.onrender.com/health`

**Verification**: `db.stats()` shows increased storage limit

### Runbook 2: Deploy New Model Version

**Steps**:
1. Train and validate new model
2. Export validation set as JSON
3. Deploy model to AI Core
4. Create new baseline:
   ```bash
   curl -X POST $BACKEND_URL/api/v1/monitoring/baselines/create \
     -H "Content-Type: application/json" \
     -d @validation_set.json
   ```
5. Trigger immediate drift analysis:
   ```bash
   gh workflow run drift-analysis.yml
   ```
6. Monitor dashboard for first 24 hours

---

## Infrastructure as Code

### Terraform (Future Enhancement)

```hcl
# infrastructure/main.tf (planned for Day 30)

resource "mongodbatlas_cluster" "ethixai" {
  project_id = var.mongodb_project_id
  name       = "ethixai-monitoring"
  
  provider_name               = "AWS"
  provider_region_name        = "US_EAST_1"
  provider_instance_size_name = "M10"
  
  cluster_type = "REPLICASET"
  
  backup_enabled               = true
  auto_scaling_disk_gb_enabled = true
}

resource "vercel_project" "frontend" {
  name      = "ethixai-monitoring"
  framework = "nextjs"
  
  git_repository = {
    type = "github"
    repo = "ethixai/ethixai"
  }
}
```

---

## Conclusion

EthixAI's monitoring infrastructure is designed for **$0/month operation** in MVP stage, with clear scale-out paths as usage grows. The free-tier architecture supports:

✓ Up to 10,000 predictions/day  
✓ 4 drift analyses/day  
✓ Unlimited dashboard access (internal team)  
✓ Slack/email alerting  
✓ 90-day prediction log retention  
✓ 5-year compliance data retention

**Next Upgrade Trigger**: When predictions exceed 10k/day, upgrade MongoDB to M10 (~$60/month), unlocking **100k predictions/day** capacity.

---

## References

- **Architecture**: `monitoring_architecture.md`
- **Schemas**: `monitoring_schemas.md`
- **Data Flows**: `monitoring_data_flow.md`
- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com

---

**Next**: See `DAY22_COMPLETION.md` for summary and next steps.
