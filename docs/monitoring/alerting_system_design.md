# Alerting System Design

**EthixAI Model Monitoring System**  
**Version**: 1.0  
**Last Updated**: November 18, 2025

## Overview

EthixAI's alerting system provides real-time notifications when model drift, fairness violations, or data quality issues are detected. It uses a **3-tier severity system** (INFO/WARNING/CRITICAL) with smart deduplication and multi-channel notifications.

---

## 1. Severity Levels

### 1.1 INFO
**Definition**: Metric within acceptable range; no action required.

**Notification**: Dashboard only (no external alerts)

**Use Cases**:
- PSI < 0.10 (stable)
- Fairness drift < 0.05 (compliant)
- Normal model behavior

**Storage**: Logged to `monitoring_records`, not to `alerts` collection

### 1.2 WARNING
**Definition**: Metric exceeded warning threshold; investigation needed within 24 hours.

**Notification**:
- Slack message to `#ml-monitoring` channel (no @mentions)
- Email digest (daily summary at 9:00 AM UTC)
- Dashboard badge

**Use Cases**:
- 0.10 ≤ PSI < 0.25 (moderate data drift)
- 0.05 ≤ Fairness drift < 0.10 (approaching violation)
- 5% ≤ Accuracy drop < 10%

**Storage**: Logged to both `monitoring_records` and `alerts` collections

**Response SLA**: 24 hours (acknowledge + investigate)

### 1.3 CRITICAL
**Definition**: Metric exceeded critical threshold; immediate action required.

**Notification**:
- Slack message with **@channel** mention
- Instant email to on-call engineer + ML lead
- SMS to on-call (optional, if configured)
- Dashboard prominent alert banner
- Incident created in `incidents` collection

**Use Cases**:
- PSI ≥ 0.25 (severe data drift)
- Fairness drift ≥ 0.10 (**regulatory breach**)
- Disparate impact ratio < 0.80 (**80% rule violation**)
- Accuracy drop ≥ 10% (model failure)

**Storage**: Logged to `monitoring_records`, `alerts`, and `incidents` collections

**Response SLA**: 1 hour (acknowledge + contain)

**Special Actions**:
- If fairness CRITICAL: Notify compliance officer immediately
- If multiple CRITICAL: Escalate to CTO
- Optional: Auto-freeze model (configurable per model)

---

## 2. Alert Triggers

### 2.1 Metric-Based Triggers

All triggers defined in `drift_metrics_spec.md`. Summary:

| Metric Category | WARNING Trigger | CRITICAL Trigger |
|----------------|----------------|------------------|
| **Data Drift** | PSI ≥ 0.10, KL ≥ 0.10, Wasserstein ≥ 0.15 | PSI ≥ 0.25, KL ≥ 0.30, Wasserstein > 0.30 |
| **Fairness Drift** | DP/EOD ≥ 0.05, DI 0.80-0.89 | DP/EOD ≥ 0.10, DI < 0.80 |
| **Model Drift** | Accuracy drop > 5%, Entropy change > 25% | Accuracy drop > 10%, Entropy change > 50% |
| **Explanation Drift** | SHAP KL ≥ 0.15, Top-3 change | SHAP KL ≥ 0.30, Rank correlation < 0.70 |
| **Data Quality** | Type mismatch > 1%, Range violation > 2% | Type mismatch > 5%, Range violation > 10% |

### 2.2 Composite Trigger

**Aggregated Drift Score**:
```
Score = 0.40 × Fairness + 0.30 × Data + 0.20 × Model + 0.10 × Explanation
```

**Triggers**:
- **WARNING**: Score ≥ 0.15
- **CRITICAL**: Score ≥ 0.30

**Purpose**: Detect when multiple moderate drifts combine into critical situation.

### 2.3 Rate-Based Triggers

**Sudden Spike Detection**:
- If any metric changes by **>3× standard deviation** within 1 hour → CRITICAL
- Example: PSI jumps from 0.05 to 0.40 → immediate alert even before scheduled analysis

**Implementation**: Requires real-time monitoring (future enhancement)

---

## 3. Notification Channels

### 3.1 Slack Integration

**Webhook URL**: Stored in GitHub Secrets and backend environment variables

**Message Format**:

#### INFO (no Slack message)

#### WARNING
```json
{
  "text": "⚠️ WARNING: Data drift detected",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "⚠️ Data Drift Warning"
      }
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Model:* loan-approval-v2.3"},
        {"type": "mrkdwn", "text": "*Metric:* PSI"},
        {"type": "mrkdwn", "text": "*Value:* 0.15 (threshold: 0.10)"},
        {"type": "mrkdwn", "text": "*Severity:* WARNING"}
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Features affected:* credit_score (PSI: 0.18), income (PSI: 0.14)"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {"type": "plain_text", "text": "View Dashboard"},
          "url": "https://ethixai.vercel.app/monitoring/drift",
          "style": "primary"
        },
        {
          "type": "button",
          "text": {"type": "plain_text", "text": "View Logs"},
          "url": "https://ethixai.vercel.app/monitoring/incidents/INC-2025-042"
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "🕐 2025-03-15 14:30 UTC | Incident: INC-2025-042"
        }
      ]
    }
  ]
}
```

#### CRITICAL
```json
{
  "text": "🚨 CRITICAL: Fairness drift detected @channel",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 CRITICAL: Fairness Drift",
        "emoji": true
      }
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Model:* loan-approval-v2.3"},
        {"type": "mrkdwn", "text": "*Metric:* Demographic Parity"},
        {"type": "mrkdwn", "text": "*Value:* 0.14 (threshold: 0.10)"},
        {"type": "mrkdwn", "text": "*Severity:* 🔴 CRITICAL"}
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Impact:* Selection rate for female applicants is 14% lower than male applicants.\n\n*Compliance Risk:* Potential EU AI Act violation (Article 10)"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Required Actions:*\n• Acknowledge within 1 hour\n• Notify compliance officer\n• Investigate root cause\n• Consider model freeze"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {"type": "plain_text", "text": "🔍 Investigate Now"},
          "url": "https://ethixai.vercel.app/monitoring/fairness",
          "style": "danger"
        },
        {
          "type": "button",
          "text": {"type": "plain_text", "text": "📊 View Incident"},
          "url": "https://ethixai.vercel.app/monitoring/incidents/INC-2025-043"
        },
        {
          "type": "button",
          "text": {"type": "plain_text", "text": "📖 Runbook"},
          "url": "https://github.com/ethixai/docs/monitoring_policy.md#fairness-drift-response"
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "🕐 2025-03-15 14:35 UTC | Incident: INC-2025-043 | @channel"
        }
      ]
    }
  ]
}
```

**Rate Limiting**: Maximum 5 Slack messages per hour per model (to prevent spam)

### 3.2 Email Notifications

**WARNING**:
- **Frequency**: Daily digest at 9:00 AM UTC
- **Recipients**: ML team mailing list
- **Format**: HTML email with summary table

**CRITICAL**:
- **Frequency**: Immediate (within 1 minute of detection)
- **Recipients**: On-call engineer + ML lead + compliance officer (for fairness)
- **Format**: HTML email with detailed incident info + direct links

**Email Template (CRITICAL)**:
```
Subject: [CRITICAL] Fairness Drift Detected - Model loan-approval-v2.3

Body:
🚨 CRITICAL ALERT

A critical fairness drift has been detected in production model loan-approval-v2.3.

Metric: Demographic Parity Drift
Current Value: 0.14
Threshold: 0.10 (CRITICAL)
Detected At: 2025-03-15 14:35 UTC

Impact:
- Selection rate for female applicants is 14% lower than male applicants
- Potential EU AI Act compliance breach (Article 10)

Required Actions (1 hour SLA):
1. Acknowledge this alert
2. Investigate root cause
3. Notify compliance officer
4. Consider model freeze

Links:
- View Dashboard: https://ethixai.vercel.app/monitoring/fairness
- Incident Details: https://ethixai.vercel.app/monitoring/incidents/INC-2025-043
- Response Runbook: https://github.com/ethixai/docs/monitoring_policy.md#fairness-drift-response

Incident ID: INC-2025-043
```

### 3.3 SMS Notifications (Optional)

**When**: CRITICAL alerts only, if no acknowledgment within 15 minutes

**Recipients**: On-call engineer phone number

**Provider**: Twilio (free tier: $15 credit, ~1000 SMS)

**Message Format** (160 chars max):
```
CRITICAL: Fairness drift detected in loan-approval-v2.3. 
DP=0.14 (threshold 0.10). 
Acknowledge at ethixai.vercel.app/monitoring
```

**Not Implemented**: Future enhancement (Day 25+)

### 3.4 Dashboard Alerts

**INFO**: Green badge, visible only in dashboard logs

**WARNING**: Yellow banner at top of dashboard + badge count

**CRITICAL**: Red banner (persistent until acknowledged) + modal popup on dashboard load

**Banner Text**:
```
🚨 CRITICAL: Fairness drift detected in loan-approval-v2.3 
[View Details] [Acknowledge]
```

---

## 4. Alert Deduplication

### 4.1 Time-Based Deduplication

**Rule**: Do not send duplicate alert for same metric + model + severity within **6 hours**.

**Logic**:
```javascript
function shouldSendAlert(metric_name, model_id, severity) {
  const recentAlert = db.alerts.findOne({
    metric_name,
    model_id,
    severity,
    timestamp: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }
  });
  
  return !recentAlert; // Send only if no recent alert
}
```

**Example**:
- 14:00: PSI = 0.16 → WARNING alert sent
- 14:30: PSI = 0.17 → Alert suppressed (within 6 hours)
- 20:00: PSI = 0.18 → WARNING alert sent again
- 20:30: PSI = 0.26 → CRITICAL alert sent (severity escalation, always send)

**Escalation Exception**: If severity increases (WARNING → CRITICAL), always send alert regardless of deduplication.

### 4.2 Value-Based Deduplication

**Rule**: If metric value changes by <5% from last alert, suppress notification.

**Example**:
- PSI = 0.16 → Alert sent
- PSI = 0.165 → Suppressed (3% change)
- PSI = 0.20 → Alert sent (25% change)

**Not Applied To**: CRITICAL fairness alerts (always send, zero tolerance)

### 4.3 Composite Deduplication

**Rule**: If multiple metrics trigger simultaneously, group into single notification.

**Example**:
Instead of 3 separate alerts:
- PSI = 0.15 (WARNING)
- KL = 0.12 (WARNING)
- Wasserstein = 0.18 (WARNING)

Send one alert:
```
⚠️ Multiple Data Drift Warnings Detected
- PSI: 0.15 (threshold 0.10)
- KL Divergence: 0.12 (threshold 0.10)
- Wasserstein: 0.18 (threshold 0.15)

Aggregated Drift Score: 0.17 (WARNING)
```

---

## 5. Alert Suppression Rules

### 5.1 Planned Maintenance

**Use Case**: Model deployment, baseline update, scheduled maintenance

**Configuration**:
```javascript
POST /api/v1/monitoring/suppress
{
  "model_id": "loan-approval-v2.3",
  "start_time": "2025-03-15T10:00:00Z",
  "end_time": "2025-03-15T12:00:00Z",
  "reason": "Deploying model v2.4",
  "suppress_severities": ["WARNING"], // still send CRITICAL
  "created_by": "ml_engineer_user_id"
}
```

**Effect**: All WARNING alerts suppressed during window; CRITICAL alerts still sent.

**Audit**: Suppression logged in `alert_suppressions` collection.

### 5.2 Accepted Risk

**Use Case**: Business accepts known drift (e.g., seasonal behavior)

**Configuration**:
```javascript
POST /api/v1/monitoring/suppress
{
  "model_id": "loan-approval-v2.3",
  "metric_name": "psi",
  "end_time": "2025-04-01T00:00:00Z", // max 30 days
  "reason": "Seasonal applicant profile change during tax season",
  "approved_by": "compliance_officer_user_id"
}
```

**Effect**: Alerts for specified metric suppressed until end_time or manual unsuppression.

**Compliance**: Requires compliance officer approval for fairness metrics.

### 5.3 Testing/Development

**Use Case**: Testing in staging environment

**Configuration**: Environment variable `MONITORING_ENV=staging` disables all external notifications (Slack, email).

**Effect**: Alerts still logged to database, but no notifications sent.

---

## 6. Alert Acknowledgment

### 6.1 Acknowledgment Flow

```
Alert Triggered → Notification Sent → On-Call Receives
                                            ↓
                                   Acknowledges in Dashboard
                                            ↓
                              Update alert status to 'acknowledged'
                              Record acknowledger + timestamp
                                            ↓
                              Banner changes from red → yellow
                              No further notifications for this incident
```

### 6.2 Acknowledgment API

```javascript
POST /api/v1/alerts/:alert_id/acknowledge
{
  "acknowledged_by": "user_id",
  "notes": "Investigating data pipeline change"
}

Response:
{
  "alert_id": "ALT-2025-042",
  "status": "acknowledged",
  "acknowledged_at": "2025-03-15T14:45:00Z",
  "acknowledged_by": "user_id"
}
```

### 6.3 Escalation on No Acknowledgment

**Rule**: If CRITICAL alert not acknowledged within **15 minutes**, escalate.

**Escalation Actions**:
1. Send notification to secondary on-call
2. Send SMS to primary on-call (if configured)
3. Slack message with additional @mentions (ML lead)

**Implementation**: Background job checks `alerts` collection every 5 minutes for unacknowledged CRITICAL alerts.

---

## 7. Alert Storage Schema

### 7.1 Alerts Collection

```javascript
{
  _id: ObjectId("..."),
  alert_id: "ALT-2025-042",               // Human-readable ID
  incident_id: "INC-2025-042",            // Reference to incident
  model_id: "loan-approval-v2.3",
  metric_name: "demographic_parity_drift",
  metric_value: 0.14,
  threshold: 0.10,
  severity: "CRITICAL",                   // INFO | WARNING | CRITICAL
  status: "acknowledged",                 // pending | acknowledged | resolved
  
  // Notification tracking
  channels_notified: ["slack", "email"],
  slack_message_ts: "1710512100.123456",  // Slack message timestamp
  
  // Acknowledgment
  acknowledged_by: "user_id",
  acknowledged_at: ISODate("2025-03-15T14:45:00Z"),
  acknowledgment_notes: "Investigating...",
  
  // Resolution
  resolved_by: "user_id",
  resolved_at: ISODate("2025-03-15T16:20:00Z"),
  resolution_notes: "Fixed data pipeline, retraining scheduled",
  
  // Metadata
  created_at: ISODate("2025-03-15T14:35:00Z"),
  updated_at: ISODate("2025-03-15T16:20:00Z"),
  
  // Deduplication tracking
  deduplicated_from: "ALT-2025-041",      // If this was suppressed
  deduplicated_count: 3                   // How many alerts suppressed
}
```

**Indexes**:
- `{model_id: 1, metric_name: 1, timestamp: -1}` (deduplication lookup)
- `{status: 1, severity: 1, created_at: -1}` (dashboard queries)
- `{incident_id: 1}` (link to incidents)

**TTL**: Retain for 1 year, then auto-delete (except CRITICAL, retained indefinitely)

### 7.2 Incidents Collection

```javascript
{
  _id: ObjectId("..."),
  incident_id: "INC-2025-042",
  model_id: "loan-approval-v2.3",
  severity: "CRITICAL",
  status: "investigating",  // open | investigating | resolved | accepted_risk
  
  // Root cause
  root_cause: "Data pipeline upstream API changed schema",
  affected_groups: ["female applicants"],
  
  // Metrics
  metrics_triggered: [
    {
      metric_name: "demographic_parity_drift",
      value: 0.14,
      threshold: 0.10
    }
  ],
  
  // Response
  response_actions: [
    {
      action: "notified_compliance_officer",
      taken_by: "user_id",
      taken_at: ISODate("2025-03-15T14:37:00Z")
    },
    {
      action: "investigated_data_source",
      taken_by: "user_id",
      taken_at: ISODate("2025-03-15T15:10:00Z")
    }
  ],
  
  // Alerts
  alert_ids: ["ALT-2025-042", "ALT-2025-043"],
  
  // Timeline
  created_at: ISODate("2025-03-15T14:35:00Z"),
  resolved_at: ISODate("2025-03-15T16:20:00Z"),
  
  // Compliance
  compliance_reported: true,
  compliance_report_id: "CR-2025-008"
}
```

**Indexes**:
- `{status: 1, severity: 1, created_at: -1}` (dashboard)
- `{model_id: 1, created_at: -1}` (model history)

**Retention**: Indefinite (compliance requirement)

---

## 8. Integration with Drift Analyzer

### 8.1 Analyzer Output

When `drift_analyzer.py` completes, it POSTs to Alert Manager:

```python
# ai_core/monitoring/drift_analyzer.py

def trigger_alerts(monitoring_record):
    critical_metrics = [m for m in monitoring_record['metrics'] 
                       if m['severity'] == 'CRITICAL']
    warning_metrics = [m for m in monitoring_record['metrics'] 
                      if m['severity'] == 'WARNING']
    
    if critical_metrics:
        # Create incident
        incident = create_incident(monitoring_record, critical_metrics)
        
        # Trigger CRITICAL alert
        requests.post(f'{BACKEND_URL}/api/v1/alerts/trigger', json={
            'incident_id': incident['incident_id'],
            'severity': 'CRITICAL',
            'metrics': critical_metrics,
            'model_id': monitoring_record['model_id']
        })
    
    elif warning_metrics:
        # Trigger WARNING alert
        requests.post(f'{BACKEND_URL}/api/v1/alerts/trigger', json={
            'severity': 'WARNING',
            'metrics': warning_metrics,
            'model_id': monitoring_record['model_id']
        })
```

### 8.2 Alert Manager API

```javascript
// backend/src/routes/alerts.js

router.post('/trigger', async (req, res) => {
  const { incident_id, severity, metrics, model_id } = req.body;
  
  // Check suppression
  if (isAlertSuppressed(model_id, metrics[0].metric_name)) {
    return res.json({ suppressed: true });
  }
  
  // Check deduplication
  if (!shouldSendAlert(model_id, metrics, severity)) {
    return res.json({ deduplicated: true });
  }
  
  // Create alert record
  const alert = await Alert.create({
    alert_id: generateAlertId(),
    incident_id,
    model_id,
    metric_name: metrics[0].metric_name,
    metric_value: metrics[0].value,
    severity,
    status: 'pending',
    channels_notified: []
  });
  
  // Send notifications
  if (severity === 'CRITICAL') {
    await sendSlackAlert(alert, '@channel');
    await sendEmailAlert(alert, getCriticalRecipients());
    alert.channels_notified.push('slack', 'email');
  } else if (severity === 'WARNING') {
    await queueEmailDigest(alert);
    await sendSlackAlert(alert);
    alert.channels_notified.push('slack');
  }
  
  await alert.save();
  res.json({ alert_id: alert.alert_id });
});
```

---

## 9. Testing & Validation

### 9.1 Alert Simulation

**Tool**: `tools/simulate_alert.sh`

```bash
#!/bin/bash
# Simulate CRITICAL fairness drift alert

curl -X POST https://backend.render.com/api/v1/alerts/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "INC-TEST-001",
    "severity": "CRITICAL",
    "metrics": [{
      "metric_name": "demographic_parity_drift",
      "value": 0.14,
      "threshold": 0.10
    }],
    "model_id": "loan-approval-v2.3"
  }'
```

**Expected Outcome**:
- Slack message in `#ml-monitoring` with @channel
- Email to on-call engineer
- Alert record created in database
- Dashboard shows red banner

### 9.2 Monthly Alert Drill

**Procedure**:
1. On-call engineer triggers test alert
2. Acknowledges within SLA (15 min target)
3. Follows runbook procedures
4. Marks incident as resolved
5. Post-mortem: What went well? What needs improvement?

**Documentation**: Log results in Confluence

---

## 10. Performance & Reliability

### 10.1 Notification SLAs

| Channel | Target Latency | p95 Latency |
|---------|----------------|-------------|
| Slack webhook | < 2 seconds | < 5 seconds |
| Email (instant) | < 1 minute | < 3 minutes |
| Dashboard update | < 5 seconds | < 10 seconds |

**Monitoring**: Track notification delivery times in backend metrics.

### 10.2 Failure Handling

**Scenario**: Slack webhook fails (rate limit, network error)

**Fallback**:
1. Retry 3 times with exponential backoff (1s, 2s, 4s)
2. If all retries fail, log error and send email only
3. Alert #engineering channel about Slack delivery failure

**Scenario**: Email server unavailable

**Fallback**:
1. Queue email for later delivery (retry every 5 min for 1 hour)
2. If still failing, log to database and escalate to #engineering

---

## 11. Future Enhancements

- [ ] SMS notifications via Twilio (Day 25)
- [ ] PagerDuty integration for enterprise clients (Day 26)
- [ ] Microsoft Teams webhook support (Day 27)
- [ ] Webhook for custom integrations (Day 28)
- [ ] Alert analytics: MTTR, false positive rate, alert fatigue metrics (Day 29)

---

## 12. References

- **Metrics**: `drift_metrics_spec.md`
- **Policy**: `monitoring_policy.md`
- **Architecture**: `monitoring_architecture.md`
- **Schemas**: `monitoring_schemas.md`

---

**Next**: See `monitoring_dashboard_design.md` for UI specifications.
