# Monitoring Architecture

**EthixAI Model Monitoring System**  
**Version**: 1.0  
**Last Updated**: November 18, 2025

## Overview

EthixAI's monitoring system consists of **4 core components** that work together to detect drift, trigger alerts, and provide visibility into model health:

1. **Data Collector** (within Backend)
2. **Drift Analyzer Worker** (scheduled computation)
3. **Alert Manager** (notification engine)
4. **Monitoring Dashboard** (frontend UI)

This architecture prioritizes **free-tier compatibility** while maintaining production-grade reliability.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Production Traffic                          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 v
                    ┌────────────────────────┐
                    │    Backend API         │
                    │  (Express + Mongoose)  │
                    │                        │
                    │  • Prediction logging  │
                    │  • Evaluation storage  │
                    │  • Audit logs          │
                    └───────────┬────────────┘
                                │
                                │ writes prediction_logs
                                │ (timestamp, features, prediction, metadata)
                                v
                    ┌────────────────────────┐
                    │     MongoDB Atlas      │
                    │    (Free Tier M0)      │
                    │                        │
                    │  Collections:          │
                    │  • prediction_logs     │
                    │  • drift_snapshots     │
                    │  • monitoring_records  │
                    │  • incidents           │
                    │  • alerts              │
                    └───────────┬────────────┘
                                │
                                │ reads logs (scheduled)
                                v
        ┌───────────────────────────────────────────────┐
        │       Drift Analyzer Worker (Python)          │
        │       Runs via GitHub Actions Cron            │
        │                                               │
        │  1. Query prediction_logs (last 24h/7d)      │
        │  2. Load baseline from drift_snapshots       │
        │  3. Compute all metrics (PSI, KL, fairness)  │
        │  4. Write to monitoring_records              │
        │  5. Check thresholds → create incidents      │
        │  6. Trigger alerts if severity ≥ WARNING     │
        └───────────┬───────────────────────────────────┘
                    │
                    │ triggers alerts
                    v
        ┌────────────────────────┐
        │    Alert Manager       │
        │   (Backend Service)    │
        │                        │
        │  • Deduplication       │
        │  • Suppression rules   │
        │  • Notification router │
        └───────────┬────────────┘
                    │
                    ├─────> Slack Webhooks (instant)
                    ├─────> Email (digest)
                    └─────> Write to alerts collection
                                │
                                │ dashboard queries
                                v
                    ┌────────────────────────┐
                    │  Monitoring Dashboard  │
                    │   (Next.js on Vercel)  │
                    │                        │
                    │  Pages:                │
                    │  • Drift Overview      │
                    │  • Fairness Monitor    │
                    │  • Model Health        │
                    │  • Incident Timeline   │
                    └────────────────────────┘
```

---

## Component 1: Data Collector

**Location**: `backend/src/middleware/predictionLogger.js` (new)

**Responsibilities**:
- Log every prediction request to MongoDB
- Capture input features, prediction, confidence, timestamp
- Store metadata: model version, user ID, session ID
- Write to `prediction_logs` collection

**Schema**:
```javascript
{
  timestamp: Date,
  model_id: String,
  model_version: String,
  features: Object,           // raw input features
  prediction: String,         // model output class
  confidence: Number,         // probability
  metadata: {
    user_id: String,
    session_id: String,
    api_version: String
  }
}
```

**Performance**:
- Asynchronous writes (non-blocking)
- Batch writes every 10 requests or 5 seconds
- TTL index: auto-delete logs older than 90 days

**Integration**:
```javascript
// backend/src/routes/predict.js
app.post('/api/v1/predict', 
  authenticateUser,
  predictionLogger,  // <-- middleware logs to Mongo
  async (req, res) => {
    const result = await aiCoreClient.post('/analyze', req.body);
    res.json(result.data);
  }
);
```

**Existing Code**: Already partially implemented; needs formalization.

---

## Component 2: Drift Analyzer Worker

**Location**: `ai_core/monitoring/drift_analyzer.py` (new)

**Execution Model**: Scheduled GitHub Actions workflow

**Responsibilities**:
1. **Query recent predictions**: Fetch last 24 hours (or 7 days for weekly checks)
2. **Load baseline**: Retrieve training distribution from `drift_snapshots`
3. **Compute metrics**: Calculate all metrics from `drift_metrics_spec.md`
4. **Store results**: Write to `monitoring_records` collection
5. **Generate incidents**: Create incident if any metric exceeds threshold
6. **Trigger alerts**: Call Alert Manager API if WARNING or CRITICAL

**Pseudocode**:
```python
def run_drift_analysis():
    # 1. Fetch recent predictions
    logs = mongo.prediction_logs.find({
        'timestamp': {'$gte': datetime.now() - timedelta(days=1)}
    })
    
    # 2. Load baseline
    baseline = mongo.drift_snapshots.find_one({
        'model_id': MODEL_ID,
        'is_active': True
    })
    
    # 3. Compute data drift
    psi = compute_psi(logs['features'], baseline['feature_distributions'])
    kl = compute_kl_divergence(logs['features'], baseline)
    wasserstein = compute_wasserstein_distance(logs['features'], baseline)
    
    # 4. Compute fairness drift
    fairness_drift = compute_fairness_drift(
        predictions=logs['prediction'],
        protected_attrs=logs['features']['gender'],
        baseline_fairness=baseline['fairness_metrics']
    )
    
    # 5. Store results
    mongo.monitoring_records.insert_one({
        'timestamp': datetime.now(),
        'model_id': MODEL_ID,
        'metrics': {
            'psi': psi,
            'kl_divergence': kl,
            'fairness_drift': fairness_drift,
            # ... all other metrics
        },
        'severity': calculate_max_severity(all_metrics)
    })
    
    # 6. Check thresholds
    if fairness_drift['demographic_parity'] > 0.10:
        create_incident('CRITICAL', 'Fairness drift exceeded 0.10', ...)
        trigger_alert('CRITICAL', ...)
```

**GitHub Actions Workflow**:
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
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r ai_core/requirements.txt
      - name: Run drift analyzer
        env:
          MONGO_URI: ${{ secrets.MONGO_URI }}
          ALERT_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
        run: python ai_core/monitoring/drift_analyzer.py
```

**Free Tier Limits**:
- GitHub Actions: 2,000 minutes/month (free)
- 4 runs/day × 10 min/run × 30 days = 1,200 minutes/month ✓

**Fallback**: Can run as `backend` cron job if GitHub Actions unavailable.

---

## Component 3: Alert Manager

**Location**: `backend/src/services/alertManager.js` (new)

**Responsibilities**:
- Receive alert triggers from Drift Analyzer
- Apply deduplication (no duplicate alerts within 6 hours)
- Route notifications to appropriate channels
- Track alert history in `alerts` collection

**Alert Flow**:
```
Incident Created → Alert Manager → Check Suppression → Route Notification
                                         ↓
                            ┌────────────┴────────────┐
                            │                         │
                      Deduplicate            Check time window
                    (same metric+model)     (quiet hours?)
                            │                         │
                            └────────────┬────────────┘
                                         ↓
                                   Send notification
```

**Notification Channels**:

| Severity | Slack | Email | Dashboard |
|----------|-------|-------|-----------|
| INFO | ✗ | ✗ | ✓ |
| WARNING | ✓ (instant) | ✓ (digest) | ✓ |
| CRITICAL | ✓ (instant + @channel) | ✓ (instant) | ✓ |

**Deduplication Logic**:
```javascript
function shouldSendAlert(incident) {
  const recentAlert = db.alerts.findOne({
    metric_name: incident.metric_name,
    model_id: incident.model_id,
    severity: incident.severity,
    timestamp: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } // 6 hours
  });
  
  return !recentAlert; // Only send if no recent alert
}
```

**Slack Webhook Format**:
```json
{
  "text": "🚨 CRITICAL: Fairness drift detected",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 Fairness Drift Alert"
      }
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Model:* loan-approval-v2.3"},
        {"type": "mrkdwn", "text": "*Metric:* Demographic Parity"},
        {"type": "mrkdwn", "text": "*Value:* 0.14 (threshold: 0.10)"},
        {"type": "mrkdwn", "text": "*Severity:* CRITICAL"}
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {"type": "plain_text", "text": "View Dashboard"},
          "url": "https://ethixai.vercel.app/monitoring/fairness"
        }
      ]
    }
  ]
}
```

**API Endpoint**:
```javascript
// backend/src/routes/alerts.js
POST /api/v1/alerts/trigger
{
  incident_id: String,
  severity: 'INFO' | 'WARNING' | 'CRITICAL',
  message: String,
  metadata: Object
}
```

---

## Component 4: Monitoring Dashboard

**Location**: `frontend/src/app/monitoring/*` (new pages)

**Technology**: Next.js (React) deployed to Vercel

**Pages**:

### 4.1 Drift Overview (`/monitoring/drift`)
- **Aggregated drift score** (gauge chart)
- **Trend line** (last 30 days)
- **Metric cards** (PSI, KL, Wasserstein)
- **Quick filters**: Model, time range

### 4.2 Fairness Monitor (`/monitoring/fairness`)
- **Demographic parity chart** (per group)
- **Equal opportunity comparison**
- **Disparate impact ratio** (with 80% rule threshold)
- **Historical trends** (line charts)
- **Alert badges** (WARNING/CRITICAL)

### 4.3 Model Health (`/monitoring/health`)
- **Prediction distribution** (histogram)
- **Accuracy metrics** (when labels available)
- **Output entropy trend**
- **Confidence distribution**

### 4.4 Incident Timeline (`/monitoring/incidents`)
- **Filterable incident list** (table)
- **Incident detail modal** (click to expand)
- **Resolution tracking** (acknowledged, resolved)
- **Export to CSV**

**Data Fetching**:
```typescript
// frontend/src/lib/api/monitoring.ts
export async function getMonitoringRecords(timeRange: '24h' | '7d' | '30d') {
  const response = await fetch(`/api/v1/monitoring/records?range=${timeRange}`);
  return response.json();
}
```

**Backend API**:
```javascript
// backend/src/routes/monitoring.js
GET /api/v1/monitoring/records?range=7d&model_id=...
GET /api/v1/monitoring/incidents?severity=CRITICAL
GET /api/v1/monitoring/drift-snapshots/:model_id
```

---

## Data Flow: End-to-End

### Prediction Flow
```
User Request → Backend /predict 
  → predictionLogger middleware logs to MongoDB
  → AI Core processes request
  → Response returned to user
```

### Monitoring Flow
```
GitHub Actions (cron) → Drift Analyzer Worker
  → Query prediction_logs (last 24h)
  → Load baseline from drift_snapshots
  → Compute metrics (PSI, fairness drift, etc.)
  → Write monitoring_records
  → IF threshold exceeded:
      → Create incident
      → Trigger Alert Manager
      → Send Slack notification
  → Dashboard polls monitoring_records
  → User views dashboard
```

### Baseline Update Flow
```
Model Retraining → New validation results
  → POST /api/v1/monitoring/baselines
  → Store new drift_snapshot
  → Mark as active baseline
  → Old baseline archived (is_active=false)
```

---

## Integration with Existing Systems

### AI Core Integration
**Current**: AI Core handles `/analyze` requests independently  
**New**: AI Core also runs `drift_analyzer.py` as scheduled job  
**Change**: Add `ai_core/monitoring/` module, no changes to existing `/analyze` endpoint

### Backend Integration
**Current**: Backend routes predictions to AI Core  
**New**: Backend adds `predictionLogger` middleware and `/monitoring` API routes  
**Change**: Minimal - add middleware, new routes, Alert Manager service

### Frontend Integration
**Current**: Next.js with `/dashboard` and `/reports`  
**New**: Add `/monitoring/*` pages  
**Change**: New pages, no changes to existing routes

### Firebase Integration
**Current**: Firebase Auth for user management  
**New**: Monitoring data stored in MongoDB (not Firestore)  
**Change**: None - Firebase remains auth-only

---

## Scalability Considerations

### Free Tier Limits

| Resource | Limit | Usage | Headroom |
|----------|-------|-------|----------|
| MongoDB Atlas M0 | 512 MB storage | ~50 MB/month (logs with TTL) | 10× |
| GitHub Actions | 2,000 min/month | ~1,200 min/month | 1.6× |
| Vercel (Hobby) | 100 GB bandwidth | ~5 GB/month | 20× |
| Render (Free) | 750 hours/month | 720 hours (1 instance) | 1× |

### Scale-Out Path

**Phase 1 (Current)**: All free tier, GitHub Actions worker  
**Phase 2 (10k predictions/day)**: Upgrade MongoDB to M10, move worker to Render cron  
**Phase 3 (100k predictions/day)**: Add Redis for alert deduplication, scale AI Core to 2 instances  
**Phase 4 (1M predictions/day)**: Move to managed Kubernetes, dedicated monitoring cluster

---

## Monitoring the Monitor

**Meta-monitoring**: How do we know the monitoring system is working?

1. **Heartbeat checks**: Drift analyzer logs "analysis_completed" events
2. **Dashboard health endpoint**: `/api/v1/monitoring/health` returns last analysis timestamp
3. **Alert for silent failures**: If no analysis in 12 hours → Slack alert
4. **GitHub Actions notifications**: Workflow failure emails sent to maintainers

---

## Security Considerations

### Access Control
- **Dashboard**: Firebase Auth required, role-based access (admin, auditor, viewer)
- **API**: JWT auth for all `/monitoring` endpoints
- **Drift Analyzer**: Read-only database access, no write to prediction_logs

### Data Privacy
- **Prediction logs**: Hashed user IDs, no PII in feature logs
- **Aggregation**: All dashboards show aggregate metrics, not individual predictions
- **Retention**: Logs auto-deleted after 90 days (TTL index)

### Secrets Management
- **MongoDB URI**: GitHub Secrets, Vercel environment variables
- **Slack webhooks**: GitHub Secrets, backend environment variables
- **Rotation**: Quarterly webhook rotation, documented in `docs/security/secret_rotation.md`

---

## Cost Analysis

**Total Monthly Cost (Free Tier)**:
- MongoDB Atlas M0: **$0**
- GitHub Actions: **$0** (within free tier)
- Vercel Hobby: **$0**
- Render Free: **$0**
- Slack: **$0** (webhook-only)

**Total: $0/month** ✅

**Paid Tier Trigger**: When prediction volume exceeds 10k/day (~300k/month), upgrade to:
- MongoDB M10: ~$57/month
- Render Starter: $7/month (worker instance)
- **Total: ~$64/month**

---

## Deployment Checklist

- [ ] Create MongoDB collections with indexes
- [ ] Deploy `predictionLogger` middleware to backend
- [ ] Add `/monitoring` API routes to backend
- [ ] Implement `alertManager.js` service
- [ ] Build `drift_analyzer.py` worker
- [ ] Configure GitHub Actions workflow
- [ ] Add Slack webhook to secrets
- [ ] Build monitoring dashboard pages
- [ ] Deploy frontend to Vercel
- [ ] Configure MongoDB connection strings
- [ ] Test end-to-end flow with synthetic data
- [ ] Document runbooks in `docs/playbooks/monitoring_playbook.md`

---

## References

- **Drift Metrics**: See `drift_metrics_spec.md`
- **Alerting Rules**: See `alerting_system_design.md`
- **Monitoring Policy**: See `monitoring_policy.md`
- **Dashboard UX**: See `monitoring_dashboard_design.md`

---

**Next**: See `monitoring_policy.md` for response procedures and escalation paths.
