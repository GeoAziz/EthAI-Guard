# Monitoring Data Flow

**EthixAI Model Monitoring System**  
**Version**: 1.0  
**Last Updated**: November 18, 2025

## Overview

This document describes end-to-end data flows through the monitoring system, from prediction logging to alert delivery and dashboard visualization. All flows use **text-based sequence diagrams** for clarity.

---

## Flow 1: Prediction Logging

**Purpose**: Capture every prediction for future drift analysis.

### Sequence Diagram

```
User → Backend → predictionLogger → MongoDB → Backend → AI Core → Backend → User
 |        |             |               |         |        |        |        |
 |        |             |               |         |        |        |        |
 |  POST /predict       |               |         |        |        |        |
 |------->|             |               |         |        |        |        |
 |        |  log()      |               |         |        |        |        |
 |        |------------>|               |         |        |        |        |
 |        |             | insert async  |         |        |        |        |
 |        |             |-------------->|         |        |        |        |
 |        |             |               | ack     |        |        |        |
 |        |             |<--------------|         |        |        |        |
 |        |             | continue      |         |        |        |        |
 |        |<------------|               |         |        |        |        |
 |        | POST /analyze                |         |        |        |        |
 |        |------------------------------------->  |        |        |        |
 |        |                              |         | {result}        |        |
 |        |<-------------------------------------|        |        |        |
 |        | {prediction}                 |         |        |        |        |
 |<-------|                              |         |        |        |        |
```

### Detailed Steps

1. **User Request**: `POST /api/v1/predict` with features
2. **predictionLogger Middleware**: 
   - Extracts features, model_id, user_id from request
   - Calls `mongo.prediction_logs.insertOne()` **asynchronously** (non-blocking)
   - Continues to next middleware immediately
3. **MongoDB Insert**: 
   - Document stored in `prediction_logs` collection
   - Indexed by `{model_id: 1, timestamp: -1}`
4. **AI Core Processing**: 
   - Backend forwards request to AI Core `/analyze` endpoint
   - AI Core computes prediction + SHAP values
5. **Response**: 
   - Backend returns prediction to user
   - predictionLogger updates log entry with prediction result (background)

### Data Payload

```javascript
// What predictionLogger writes to MongoDB
{
  _id: ObjectId("..."),
  timestamp: ISODate("2025-03-29T14:35:22Z"),
  model_id: "loan-approval-v2.3",
  model_version: "2.3.0",
  features: {
    credit_score: 720,
    income: 75000,
    loan_amount: 250000,
    employment_years: 5,
    // ... all input features
  },
  prediction: {
    class: "approve",
    confidence: 0.87,
    probabilities: {
      approve: 0.87,
      reject: 0.11,
      manual_review: 0.02
    }
  },
  metadata: {
    user_id: "user_12345",
    session_id: "sess_abcdef",
    api_version: "v1",
    latency_ms: 145
  }
}
```

### Performance Impact
- **Latency Added**: < 5ms (async write)
- **Storage**: ~2 KB per prediction
- **Daily Volume** (1,000 predictions/day): ~2 MB/day
- **With TTL** (90 days): ~180 MB storage

---

## Flow 2: Baseline Snapshot Creation

**Purpose**: Create reference distribution after model training or deployment.

### Sequence Diagram

```
ML Engineer → Backend API → MongoDB → Backend → ML Engineer
     |            |            |         |           |
     |            |            |         |           |
     | POST /monitoring/baselines        |           |
     | {validation_data}                 |           |
     |----------->|            |         |           |
     |            | compute    |         |           |
     |            | distributions        |           |
     |            | (PSI, fairness)      |           |
     |            |----------->|         |           |
     |            |            | insert  |           |
     |            |            | drift_snapshot      |
     |            |            |-------->|           |
     |            |            |<--------|           |
     |            | {snapshot_id}        |           |
     |<-----------|            |         |           |
```

### Detailed Steps

1. **Engineer Triggers**: `POST /api/v1/monitoring/baselines/create`
   ```json
   {
     "model_id": "loan-approval-v2.3",
     "validation_data": [/* array of samples */],
     "metadata": {
       "training_date": "2025-03-28",
       "dataset_version": "v5.2"
     }
   }
   ```

2. **Backend Computes Baseline**:
   - **Feature Distributions**: Mean, std, quantiles for numerical; frequency for categorical
   - **Fairness Metrics**: Demographic parity, equal opportunity, disparate impact per protected group
   - **Prediction Distribution**: Class frequencies
   - **SHAP Distributions**: Average SHAP values per feature

3. **Store Baseline**:
   ```javascript
   {
     _id: ObjectId("..."),
     snapshot_id: "SNAP-2025-03-28",
     model_id: "loan-approval-v2.3",
     model_version: "2.3.0",
     is_active: true,  // Mark as active baseline
     created_at: ISODate("2025-03-28T10:00:00Z"),
     created_by: "engineer_user_id",
     
     feature_distributions: {
       credit_score: {
         mean: 680,
         std: 85,
         quantiles: [550, 640, 680, 720, 800]
       },
       income: {
         mean: 65000,
         std: 25000,
         quantiles: [35000, 50000, 65000, 80000, 120000]
       },
       // ... all features
     },
     
     fairness_metrics: {
       gender: {
         demographic_parity: 0.02,
         equal_opportunity: 0.01,
         disparate_impact: 0.92
       },
       // ... other protected attributes
     },
     
     prediction_distribution: {
       approve: 0.55,
       reject: 0.40,
       manual_review: 0.05
     },
     
     shap_distributions: {
       credit_score: { mean: 0.15, std: 0.08 },
       income: { mean: 0.12, std: 0.06 },
       // ... all features
     }
   }
   ```

4. **Archive Old Baseline**: Set previous active baseline to `is_active: false`

---

## Flow 3: Scheduled Drift Analysis

**Purpose**: Periodically compute drift metrics and trigger alerts.

### Sequence Diagram

```
GitHub Actions → Drift Analyzer → MongoDB → Drift Analyzer → Alert Manager → Slack/Email
      |               |              |             |                 |             |
      |               |              |             |                 |             |
  Cron trigger        |              |             |                 |             |
  (every 6 hours)     |              |             |                 |             |
      |-------------->|              |             |                 |             |
      |               | Query logs   |             |                 |             |
      |               | (last 24h)   |             |                 |             |
      |               |------------->|             |                 |             |
      |               |<-------------|             |                 |             |
      |               | {prediction_logs}           |                 |             |
      |               |              |             |                 |             |
      |               | Query baseline              |                 |             |
      |               |------------->|             |                 |             |
      |               |<-------------|             |                 |             |
      |               | {drift_snapshot}            |                 |             |
      |               |              |             |                 |             |
      |               | Compute metrics             |                 |             |
      |               | (PSI, KL, fairness)         |                 |             |
      |               |--------------|             |                 |             |
      |               | Insert monitoring_record    |                 |             |
      |               |------------->|             |                 |             |
      |               |<-------------|             |                 |             |
      |               | Check thresholds            |                 |             |
      |               | (any CRITICAL?)             |                 |             |
      |               |--------------|             |                 |             |
      |               | If CRITICAL, create incident|                 |             |
      |               |------------->|             |                 |             |
      |               |<-------------|             |                 |             |
      |               | POST /alerts/trigger        |                 |             |
      |               |------------------------------------>|           |             |
      |               |                             |       | Send Slack|             |
      |               |                             |       |---------->|             |
      |               |                             |       | Send Email|             |
      |               |                             |       |---------->|             |
      |               |                             |       | {alert_id}|             |
      |               |<------------------------------------|             |             |
      |               | Analysis complete           |                 |             |
      |<--------------|                             |                 |             |
```

### Detailed Steps

1. **GitHub Actions Trigger**: 
   - Cron: `0 */6 * * *` (every 6 hours)
   - Runs: `python ai_core/monitoring/drift_analyzer.py`

2. **Query Recent Predictions**:
   ```javascript
   db.prediction_logs.find({
     model_id: "loan-approval-v2.3",
     timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
   })
   ```

3. **Query Active Baseline**:
   ```javascript
   db.drift_snapshots.findOne({
     model_id: "loan-approval-v2.3",
     is_active: true
   })
   ```

4. **Compute Metrics** (in Python):
   ```python
   # Data drift
   psi_scores = compute_psi_per_feature(
       current=current_features,
       baseline=baseline_distributions
   )
   
   # Fairness drift
   fairness_drift = compute_fairness_drift(
       predictions=current_predictions,
       protected_attrs=current_protected_attrs,
       baseline_fairness=baseline_fairness_metrics
   )
   
   # Model drift
   prediction_shift = compute_distribution_shift(
       current_preds=current_predictions,
       baseline_preds=baseline_prediction_distribution
   )
   ```

5. **Store Monitoring Record**:
   ```javascript
   {
     _id: ObjectId("..."),
     record_id: "MON-2025-1234",
     model_id: "loan-approval-v2.3",
     timestamp: ISODate("2025-03-29T14:00:00Z"),
     analysis_period: {
       start: ISODate("2025-03-28T14:00:00Z"),
       end: ISODate("2025-03-29T14:00:00Z")
     },
     sample_count: 1247,
     
     metrics: {
       data_drift: {
         psi: {
           credit_score: { value: 0.18, severity: "WARNING" },
           income: { value: 0.14, severity: "WARNING" },
           // ... all features
         },
         kl_divergence: { value: 0.14, severity: "WARNING" },
         wasserstein: { value: 0.12, severity: "INFO" }
       },
       fairness_drift: {
         demographic_parity: { value: 0.14, severity: "CRITICAL" },
         equal_opportunity: { value: 0.06, severity: "WARNING" },
         disparate_impact: { value: 0.74, severity: "CRITICAL" }
       },
       model_drift: {
         prediction_shift: { value: 0.22, severity: "WARNING" },
         accuracy_drop: { value: 0.05, severity: "WARNING" },
         entropy_change: { value: -0.15, severity: "INFO" }
       },
       explanation_drift: {
         shap_kl: { value: 0.08, severity: "INFO" },
         rank_correlation: { value: 0.89, severity: "INFO" }
       }
     },
     
     aggregated_score: 0.28,  // Weighted composite
     max_severity: "CRITICAL"
   }
   ```

6. **Check Thresholds**:
   ```python
   critical_metrics = [m for m in metrics if m['severity'] == 'CRITICAL']
   if critical_metrics:
       create_incident(critical_metrics)
       trigger_alert('CRITICAL', critical_metrics)
   ```

7. **Create Incident** (if CRITICAL):
   ```javascript
   {
     _id: ObjectId("..."),
     incident_id: "INC-2025-043",
     model_id: "loan-approval-v2.3",
     severity: "CRITICAL",
     status: "open",
     created_at: ISODate("2025-03-29T14:35:00Z"),
     
     metrics_triggered: [
       {
         metric_name: "demographic_parity_drift",
         value: 0.14,
         threshold: 0.10,
         affected_groups: ["female"]
       },
       {
         metric_name: "disparate_impact",
         value: 0.74,
         threshold: 0.80,
         affected_groups: ["female"]
       }
     ],
     
     monitoring_record_id: "MON-2025-1234",
     alert_ids: []  // Will be populated by Alert Manager
   }
   ```

8. **Trigger Alert**:
   - Drift Analyzer POSTs to `POST /api/v1/alerts/trigger`
   - Alert Manager handles notification (see Flow 4)

---

## Flow 4: Alert Delivery

**Purpose**: Send notifications when incidents are created.

### Sequence Diagram

```
Drift Analyzer → Alert Manager → Dedup Check → Slack → Email → MongoDB
      |               |              |          |       |         |
      |               |              |          |       |         |
  POST /alerts/trigger               |          |       |         |
  {incident, metrics}                |          |       |         |
      |------------->|               |          |       |         |
      |               | Check suppression       |       |         |
      |               | (maintenance window?)   |       |         |
      |               |--------------|          |       |         |
      |               | Check deduplication     |       |         |
      |               | (sent in last 6h?)      |       |         |
      |               |------------->|          |       |         |
      |               |<-------------|          |       |         |
      |               | {should_send: true}     |       |         |
      |               |              |          |       |         |
      |               | Create alert record     |       |         |
      |               |-------------------------------->|         |
      |               |<--------------------------------|         |
      |               | {alert_id}   |          |       |         |
      |               |              |          |       |         |
      |               | Format Slack message    |       |         |
      |               | POST webhook |          |       |         |
      |               |------------------------->|       |         |
      |               |<------------------------|       |         |
      |               | {ok: true}   |          |       |         |
      |               |              |          |       |         |
      |               | Send email   |          |       |         |
      |               |-------------------------------->|         |
      |               |<--------------------------------|         |
      |               | {message_id} |          |       |         |
      |               |              |          |       |         |
      |               | Update alert.channels_notified   |         |
      |               |-------------------------------->|         |
      |               |<--------------------------------|         |
      |               | {alert_id, status}              |         |
      |<--------------|              |          |       |         |
```

### Detailed Steps

1. **Trigger Alert**: Drift Analyzer calls `POST /api/v1/alerts/trigger`
   ```json
   {
     "incident_id": "INC-2025-043",
     "severity": "CRITICAL",
     "metrics": [
       {
         "metric_name": "demographic_parity_drift",
         "value": 0.14,
         "threshold": 0.10
       }
     ],
     "model_id": "loan-approval-v2.3"
   }
   ```

2. **Check Suppression**:
   ```javascript
   const suppression = await AlertSuppression.findOne({
     model_id: "loan-approval-v2.3",
     start_time: { $lte: new Date() },
     end_time: { $gte: new Date() }
   });
   if (suppression) return { suppressed: true };
   ```

3. **Check Deduplication**:
   ```javascript
   const recentAlert = await Alert.findOne({
     model_id: "loan-approval-v2.3",
     metric_name: "demographic_parity_drift",
     severity: "CRITICAL",
     timestamp: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }
   });
   if (recentAlert) return { deduplicated: true };
   ```

4. **Create Alert Record**:
   ```javascript
   const alert = await Alert.create({
     alert_id: "ALT-2025-043",
     incident_id: "INC-2025-043",
     model_id: "loan-approval-v2.3",
     metric_name: "demographic_parity_drift",
     metric_value: 0.14,
     threshold: 0.10,
     severity: "CRITICAL",
     status: "pending",
     channels_notified: [],
     created_at: new Date()
   });
   ```

5. **Send Slack Notification**:
   ```javascript
   await fetch(process.env.SLACK_WEBHOOK_URL, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       text: "🚨 CRITICAL: Fairness drift detected @channel",
       blocks: [/* rich formatting, see alerting_system_design.md */]
     })
   });
   ```

6. **Send Email**:
   ```javascript
   await sendEmail({
     to: ['oncall@ethixai.com', 'compliance@ethixai.com'],
     subject: '[CRITICAL] Fairness Drift Detected - Model loan-approval-v2.3',
     body: `<html><!-- see alerting_system_design.md --></html>`
   });
   ```

7. **Update Alert Record**:
   ```javascript
   alert.channels_notified = ['slack', 'email'];
   alert.slack_message_ts = '1711723522.123456';
   await alert.save();
   ```

8. **Link to Incident**:
   ```javascript
   await Incident.findOneAndUpdate(
     { incident_id: "INC-2025-043" },
     { $push: { alert_ids: "ALT-2025-043" } }
   );
   ```

---

## Flow 5: Dashboard Visualization

**Purpose**: Display drift metrics and incidents to users.

### Sequence Diagram

```
User → Browser → Next.js Frontend → Backend API → MongoDB → Backend → Frontend → Browser
 |        |             |                |            |        |          |         |
 |        |             |                |            |        |          |         |
 | Navigate to /monitoring/drift         |            |        |          |         |
 |------->|             |                |            |        |          |         |
 |        | Render page |                |            |        |          |         |
 |        |------------>|                |            |        |          |         |
 |        |             | GET /monitoring/records?range=7d     |          |         |
 |        |             |----------------------------------->  |          |         |
 |        |             |                | Query      |        |          |         |
 |        |             |                |----------->|        |          |         |
 |        |             |                |<-----------|        |          |         |
 |        |             |                | {records}  |        |          |         |
 |        |             |<-----------------------------------|  |          |         |
 |        |             | {json}         |            |        |          |         |
 |        |             | Render charts  |            |        |          |         |
 |        |             |----------------|            |        |          |         |
 |        |<------------|                |            |        |          |         |
 |        | Page displayed               |            |        |          |         |
```

### Detailed Steps

1. **User Navigates**: `/monitoring/drift`

2. **Next.js SSR** (Server-Side Rendering):
   ```typescript
   // app/monitoring/drift/page.tsx
   export default async function DriftOverviewPage() {
     const records = await getDriftOverview('all', '7d');
     return <DriftOverviewUI data={records} />;
   }
   ```

3. **API Call**: `GET /api/v1/monitoring/records?model_id=all&range=7d`

4. **Backend Query**:
   ```javascript
   const records = await MonitoringRecord.find({
     model_id: { $in: ['loan-approval-v2.3', 'hiring-v1.0'] },  // all models
     timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
   }).sort({ timestamp: -1 });
   ```

5. **Response**:
   ```json
   {
     "records": [
       {
         "record_id": "MON-2025-1234",
         "model_id": "loan-approval-v2.3",
         "timestamp": "2025-03-29T14:00:00Z",
         "aggregated_score": 0.28,
         "max_severity": "CRITICAL",
         "metrics": {
           "data_drift": { "psi": 0.18, "kl": 0.14 },
           "fairness_drift": { "demographic_parity": 0.14 }
         }
       },
       // ... more records
     ],
     "summary": {
       "total_records": 28,
       "critical_count": 1,
       "warning_count": 8,
       "info_count": 19
     }
   }
   ```

6. **Frontend Renders**:
   - Gauge charts with aggregated scores
   - Trend line chart (Recharts library)
   - Metric details table

7. **Real-Time Updates** (Future):
   - WebSocket connection for live updates
   - New alert triggers automatic dashboard refresh

---

## Flow 6: Incident Acknowledgment

**Purpose**: Engineer acknowledges alert and begins investigation.

### Sequence Diagram

```
User → Dashboard → Backend API → MongoDB → Backend → Dashboard → Slack
 |         |            |           |         |          |          |
 |         |            |           |         |          |          |
 | Click [Acknowledge]  |           |         |          |          |
 |-------->|            |           |         |          |          |
 |         | POST /alerts/:id/acknowledge     |          |          |
 |         |------------------------->        |          |          |
 |         |            | Update   |         |          |          |
 |         |            | alert.status        |          |          |
 |         |            | acknowledged        |          |          |
 |         |            |--------->|         |          |          |
 |         |            |<---------|         |          |          |
 |         |            | Update incident     |          |          |
 |         |            |--------->|         |          |          |
 |         |            |<---------|         |          |          |
 |         |            | Update Slack thread |          |          |
 |         |            |-------------------------------->|          |
 |         |            | {acknowledged_at} |          |          |
 |         |<------------------------|         |          |          |
 |         | Update UI  |           |         |          |          |
 |         | (banner → yellow)       |         |          |          |
 |<--------|            |           |         |          |          |
```

### Detailed Steps

1. **User Clicks**: "Acknowledge" button on alert banner or incident card

2. **API Call**: `POST /api/v1/alerts/ALT-2025-043/acknowledge`
   ```json
   {
     "acknowledged_by": "engineer_user_id",
     "notes": "Investigating data pipeline change"
   }
   ```

3. **Update Alert**:
   ```javascript
   await Alert.findOneAndUpdate(
     { alert_id: "ALT-2025-043" },
     {
       status: "acknowledged",
       acknowledged_by: "engineer_user_id",
       acknowledged_at: new Date(),
       acknowledgment_notes: "Investigating..."
     }
   );
   ```

4. **Update Incident**:
   ```javascript
   await Incident.findOneAndUpdate(
     { incident_id: "INC-2025-043" },
     {
       status: "investigating",
       $push: {
         response_actions: {
           action: "acknowledged",
           taken_by: "engineer_user_id",
           taken_at: new Date()
         }
       }
     }
   );
   ```

5. **Update Slack Thread** (Optional):
   ```javascript
   await fetch(process.env.SLACK_WEBHOOK_URL, {
     method: 'POST',
     body: JSON.stringify({
       thread_ts: alert.slack_message_ts,
       text: "✅ Acknowledged by @engineer_jane. Status: Investigating."
     })
   });
   ```

6. **Frontend Update**:
   - Alert banner changes from red to yellow
   - Incident status changes to "Investigating"
   - No more notifications for this incident (deduplication)

---

## Flow 7: Baseline Update After Retraining

**Purpose**: Update baseline after deploying new model version.

### Sequence Diagram

```
ML Engineer → Backend → Drift Analyzer → MongoDB → Backend → ML Engineer
     |           |            |             |         |            |
     |           |            |             |         |            |
 | POST /models/deploy       |             |         |            |
 | {model_v2.4, validation_set}            |         |            |
 |---------->   |            |             |         |            |
 |           | Create baseline              |         |            |
 |           |--------------------------->  |         |            |
 |           |            | Compute distributions    |            |
 |           |            |-------------|   |         |            |
 |           |            | Insert      |   |         |            |
 |           |            | drift_snapshot  |         |            |
 |           |            |--------------->|         |            |
 |           |            | Mark old baseline inactive            |
 |           |            |--------------->|         |            |
 |           |            |<---------------|         |            |
 |           |            | {snapshot_id}  |         |            |
 |           |<-----------------------------|         |            |
 |           | Trigger immediate analysis  |         |            |
 |           |--------------------------->  |         |            |
 |           |            | Run drift check (v2.3 → v2.4)         |
 |           |            |-------------|   |         |            |
 |           |            | {no_drift_expected}       |            |
 |           |<-----------------------------|         |            |
 |           | {success, snapshot_id}      |         |            |
 |<----------|            |             |   |         |            |
```

### Detailed Steps

1. **Deploy New Model**: 
   ```bash
   curl -X POST /api/v1/models/deploy \
     -d '{
       "model_id": "loan-approval",
       "version": "2.4.0",
       "validation_set": [/* samples */],
       "create_baseline": true
     }'
   ```

2. **Create Baseline** (same as Flow 2)

3. **Archive Old Baseline**:
   ```javascript
   await DriftSnapshot.updateMany(
     { model_id: "loan-approval-v2.3", is_active: true },
     { $set: { is_active: false, archived_at: new Date() } }
   );
   ```

4. **Trigger Immediate Drift Check**:
   - Backend calls drift analyzer to compare v2.3 predictions vs v2.4 baseline
   - Should show NO drift (expected, since new model just deployed)
   - Creates monitoring record documenting baseline reset

5. **Return Success**:
   ```json
   {
     "status": "deployed",
     "model_version": "2.4.0",
     "baseline_snapshot_id": "SNAP-2025-03-30",
     "drift_check": {
       "aggregated_score": 0.02,
       "severity": "INFO",
       "message": "No significant drift detected after deployment"
     }
   }
   ```

---

## Data Retention & Cleanup Flows

### Flow 8: TTL Cleanup (Automatic)

**Purpose**: Auto-delete old prediction logs to manage storage.

```
MongoDB TTL Monitor → prediction_logs collection
        |                     |
        |                     |
  (runs every 60 seconds)     |
        |                     |
        | Check created_at + 90 days
        |-------------------->|
        | Delete expired docs |
        |-------------------->|
        |<--------------------|
        | {deleted_count}     |
```

**Implementation**:
```javascript
// When creating collection
db.prediction_logs.createIndex(
  { "created_at": 1 },
  { expireAfterSeconds: 7776000 }  // 90 days
);
```

### Flow 9: Manual Evidence Export

**Purpose**: Before cleanup, export critical prediction data for compliance.

```
Compliance Officer → Backend → MongoDB → Backend → S3/Download
        |               |         |         |           |
        |               |         |         |           |
 | POST /evidence/export             |         |           |
 | {incident_id}                     |         |           |
 |-------------->    |         |         |           |
 |               | Query related logs  |           |
 |               |------------>|         |           |
 |               |<------------|         |           |
 |               | Query incident        |           |
 |               |------------>|         |           |
 |               |<------------|         |           |
 |               | Build bundle |         |           |
 |               |-------------|         |           |
 |               | Upload to S3 (optional)           |
 |               |------------------------------>    |
 |               | {download_url}        |           |
 |<--------------|               |         |           |
```

---

## Error Handling Flows

### Flow 10: Drift Analyzer Failure

**Scenario**: Drift analyzer crashes or GitHub Actions workflow fails.

```
GitHub Actions → Drift Analyzer → (CRASH) → GitHub → Slack
      |               |                        |       |
      |               |                        |       |
  Cron trigger        |                        |       |
      |------------->|                        |       |
      |               | Exception raised       |       |
      |               X-----------------------X       |
      |               |                        |       |
      | Workflow failed                        |       |
      |---------------------------------------->|       |
      |                                        | Send failure notification
      |                                        |------>|
      |                                        | "@engineering Drift analysis failed"
```

**Mitigation**:
1. GitHub Actions sends failure notification to #engineering Slack
2. On-call engineer investigates logs
3. Manual trigger option available: `POST /api/v1/monitoring/analyze-now`
4. If repeated failures: Escalate to CTO, consider moving worker to Render cron

---

## Summary: Data Flow Topology

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Production Traffic                          │
│                                  ↓                                   │
│                          Backend API (Render)                        │
│                                  ↓                                   │
│                          predictionLogger ←──────────────────┐       │
│                                  ↓                           │       │
│                          MongoDB Atlas (M0)                  │       │
│                                  ↓                           │       │
│            ┌─────────────────────┼─────────────────────┐     │       │
│            ↓                     ↓                     ↓     │       │
│    prediction_logs      drift_snapshots      monitoring_records     │
│            ↓                     ↓                     ↓     │       │
│            └─────────────────────┼─────────────────────┘     │       │
│                                  ↓                           │       │
│                     GitHub Actions (Cron)                    │       │
│                   Drift Analyzer Worker                      │       │
│                                  ↓                           │       │
│                    Compute Drift Metrics                     │       │
│                                  ↓                           │       │
│                    Check Thresholds                          │       │
│                                  ↓                           │       │
│                    If WARNING/CRITICAL                       │       │
│                                  ↓                           │       │
│            ┌─────────────────────┼─────────────────────┐     │       │
│            ↓                     ↓                     ↓     │       │
│    Create Incident        Create Alert         Trigger Notification │
│    (incidents collection) (alerts collection)        ↓     │       │
│            ↓                     ↓              ┌────────────┴──┐    │
│            └─────────────────────┼──────────────┤ Alert Manager │    │
│                                  ↓              └────────────┬──┘    │
│                                  ↓                           │       │
│            ┌─────────────────────┼─────────────────────┐     ↓       │
│            ↓                     ↓                     ↓   Slack/Email│
│    Monitoring Dashboard   Incident Timeline    Fairness Monitor     │
│    (Next.js on Vercel)                                              │
│                                  ↑                                   │
│                            User Access                               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Performance Characteristics

| Flow | Latency | Throughput | Bottleneck |
|------|---------|-----------|------------|
| **Prediction Logging** | +5ms | 100 req/s | MongoDB write speed |
| **Drift Analysis** | 5-10 min | N/A (scheduled) | Python compute time |
| **Alert Delivery** | 2-5 sec | 10 alerts/min | Slack webhook rate limit |
| **Dashboard Load** | 1-2 sec | 50 req/min | Backend API query time |
| **Incident Acknowledgment** | <500ms | N/A | MongoDB update speed |

---

## Monitoring the Flows

### Health Checks

1. **Prediction Logger**:
   - Metric: `prediction_logs_count` (daily)
   - Alert if: Count drops to 0 (logging broken)

2. **Drift Analyzer**:
   - Metric: `last_analysis_timestamp`
   - Alert if: No analysis in 12 hours (worker down)

3. **Alert Delivery**:
   - Metric: `alert_delivery_latency_ms`
   - Alert if: p95 > 10 seconds (delivery delayed)

4. **Dashboard**:
   - Metric: `dashboard_load_time_ms`
   - Alert if: p95 > 3 seconds (performance degradation)

---

## References

- **Architecture**: `monitoring_architecture.md`
- **Schemas**: `monitoring_schemas.md`
- **Alerting**: `alerting_system_design.md`
- **Dashboard**: `monitoring_dashboard_design.md`

---

**Next**: See `monitoring_schemas.md` for detailed database schema definitions.
