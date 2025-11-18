# Monitoring Policy

**EthixAI Model Monitoring System**  
**Version**: 1.0  
**Last Updated**: November 18, 2025

## Purpose

This policy defines how EthixAI monitors deployed models, when to trigger alerts, how to respond to incidents, and how monitoring supports compliance obligations.

---

## 1. Monitoring Cadence

### 1.1 Automated Drift Analysis

| Model Risk Level | Data Drift | Fairness Drift | Model Drift | Explanation Drift |
|------------------|-----------|----------------|-------------|-------------------|
| **High** | Daily | **Daily** | Daily | Weekly |
| **Medium** | Weekly | **Daily** | Weekly | Bi-weekly |
| **Low** | Bi-weekly | Weekly | Bi-weekly | Monthly |

**Notes**:
- **Fairness drift is ALWAYS checked at least daily** regardless of risk level
- High-risk models: Credit lending, hiring, healthcare
- Medium-risk: Marketing optimization, customer segmentation
- Low-risk: Non-sensitive recommendations

### 1.2 Scheduled Runs

| Check Type | Schedule | Tool |
|------------|----------|------|
| Daily Drift Analysis | 2:00 AM UTC | GitHub Actions workflow |
| Weekly Deep Analysis | Sunday 3:00 AM UTC | GitHub Actions workflow |
| Monthly Baseline Review | 1st of month, 4:00 AM UTC | Manual + automated report |

**Execution**: All scheduled runs use `drift_analyzer.py` via GitHub Actions cron jobs.

### 1.3 On-Demand Analysis

Stakeholders can trigger drift analysis manually via:
- **Backend API**: `POST /api/v1/monitoring/analyze-now`
- **GitHub Actions**: Workflow dispatch button
- **Dashboard**: "Analyze Now" button on Drift Overview page

**Use Cases**:
- After model deployment (validate no immediate drift)
- Before quarterly board reviews
- After data pipeline changes

---

## 2. Alerting Rules

### 2.1 Severity Levels

| Level | Criteria | Response Time | Notification |
|-------|----------|---------------|--------------|
| **INFO** | Metrics within normal range | No action | Dashboard only |
| **WARNING** | Any metric in warning threshold | 24 hours | Slack + email digest |
| **CRITICAL** | Any metric in critical threshold | **1 hour** | Slack @channel + instant email + incident creation |

### 2.2 Metric-Specific Triggers

#### Fairness Drift (CRITICAL Priority)
| Metric | WARNING | CRITICAL | Compliance Risk |
|--------|---------|----------|----------------|
| Demographic Parity Drift | > 0.05 | > 0.10 | EU AI Act, Fair Lending |
| Equal Opportunity Drift | > 0.05 | > 0.10 | Equal Opportunity Act |
| Disparate Impact Ratio | 0.80 - 0.89 | < 0.80 | **80% Rule Violation** |

**Action for CRITICAL fairness drift**:
1. Immediate Slack alert with @channel mention
2. Create incident in `incidents` collection
3. **Freeze model** (optional, configurable per model)
4. Notify compliance officer within 1 hour
5. Initiate root cause analysis

#### Data Drift
| Metric | WARNING | CRITICAL |
|--------|---------|----------|
| PSI | 0.10 - 0.24 | ≥ 0.25 |
| KL Divergence | 0.10 - 0.29 | ≥ 0.30 |
| Wasserstein Distance | 0.15 - 0.30 | > 0.30 |

**Action for CRITICAL data drift**:
1. Alert ML team
2. Investigate data source changes
3. Consider retraining within 7 days

#### Model Drift
| Metric | WARNING | CRITICAL |
|--------|---------|----------|
| Accuracy Drop | > 5% | > 10% |
| Prediction Distribution Shift | > 20% | > 40% |
| Output Entropy Change | > 25% | > 50% |

**Action for CRITICAL model drift**:
1. Validate with recent ground truth
2. Trigger model retraining workflow
3. Notify product team of potential service degradation

### 2.3 Composite Alert

**Aggregated Drift Score**:
- Weighted combination: Fairness (40%) + Data (30%) + Model (20%) + Explanation (10%)
- **CRITICAL if score > 0.30**: Initiate full model review and retraining

---

## 3. Response Procedures

### 3.1 Incident Response Flow

```
Alert Triggered → On-Call Receives Notification → Acknowledge (15 min SLA)
                                                         ↓
                                              Assess Severity
                                                         ↓
                        ┌────────────────────────────────┴────────────────────────┐
                        │                                                         │
                   WARNING                                                  CRITICAL
                        │                                                         │
                 Investigate (24h)                                     Investigate (1h)
                 Document findings                                     Notify leadership
                 Plan remediation                                      Consider model freeze
                        │                                                         │
                        └────────────────────────┬────────────────────────────────┘
                                                 ↓
                                        Implement Fix
                                   (retrain, redeploy, or accept risk)
                                                 ↓
                                         Verify Resolution
                                   (re-run drift analysis, confirm)
                                                 ↓
                                           Close Incident
                                     (document in incident log)
```

### 3.2 Escalation Paths

| Severity | Primary | Secondary (if no response in 1h) | Executive (CRITICAL only) |
|----------|---------|----------------------------------|---------------------------|
| INFO | None | None | None |
| WARNING | ML Engineer | ML Lead | None |
| CRITICAL (Data/Model) | ML Lead | CTO | CEO (if unresolved in 4h) |
| CRITICAL (Fairness) | Compliance Officer | CTO | **CEO (immediate)** |

**On-Call Rotation**:
- Primary: ML Engineering team (weekly rotation)
- Secondary: Senior ML Engineers
- Compliance Officer: Always on-call for fairness alerts

### 3.3 Runbook: Fairness Drift Response

**Trigger**: Fairness drift (DP, EOD, or DI) exceeds CRITICAL threshold

**Steps**:
1. **Immediate (< 15 min)**:
   - Acknowledge alert in Slack
   - Check dashboard for affected groups
   - Verify alert is not false positive (check raw prediction logs)

2. **Diagnosis (15-60 min)**:
   - Compare current vs baseline distributions by protected attribute
   - Check for data drift in protected attributes (has gender distribution changed?)
   - Review recent model changes (deployment, config updates)
   - Check upstream data sources (API changes?)

3. **Containment (< 1 hour)**:
   - **If drift is severe**: Enable manual review queue (route predictions for human review)
   - **If drift is from data issue**: Investigate data pipeline, consider rollback
   - **If drift is from model issue**: Consider model rollback to previous version

4. **Documentation (within 24 hours)**:
   - Create incident report in `incidents` collection
   - Document root cause
   - Propose corrective action (retrain, fix data, update baseline)
   - Update audit log with all actions taken

5. **Resolution**:
   - Implement fix (retrain with balanced data, fix data pipeline, etc.)
   - Deploy updated model
   - Re-run drift analysis to confirm resolution
   - Mark incident as resolved
   - Schedule post-mortem review (within 7 days)

### 3.4 Runbook: Data Drift Response

**Trigger**: PSI, KL, or Wasserstein exceeds CRITICAL threshold

**Steps**:
1. **Immediate**: Acknowledge alert, check which features drifted
2. **Diagnosis**:
   - Review data source logs (upstream API changes?)
   - Check for seasonal/temporal patterns (holiday, economic event?)
   - Validate data quality (missing values, outliers)
3. **Decision**:
   - **Concept drift** (real-world change): Accept and retrain
   - **Data quality issue**: Fix pipeline, backfill if needed
   - **Temporary anomaly**: Monitor closely, no action yet
4. **Action**:
   - If retraining: Trigger model retraining workflow
   - If accepting: Update baseline to new distribution
5. **Follow-up**: Review in next weekly meeting, document decision

---

## 4. Baseline Management Policy

### 4.1 Baseline Definition

A **baseline** is the reference distribution used to compute drift. It includes:
- Feature distributions (mean, std, quantiles for numerical; frequency for categorical)
- Prediction distribution
- Fairness metrics (DP, EOD, DI per protected group)
- SHAP distributions

### 4.2 Baseline Update Triggers

| Trigger | Action | Approval Required |
|---------|--------|-------------------|
| New model deployed | Create new baseline from validation set | Automatic |
| Concept drift accepted | Update baseline to current distribution | ML Lead approval |
| Quarterly review | Refresh baseline if drift stabilized | Automatic |
| Major data source change | Reset baseline | CTO approval |

### 4.3 Baseline Versioning

- All baselines stored in `drift_snapshots` collection
- Each baseline has:
  - `version` (e.g., "2025-03-15-v1")
  - `model_id`
  - `is_active` (boolean, only one active per model)
  - `created_by` (user ID)
  - `created_at` (timestamp)
- Old baselines archived (not deleted) for historical comparison

### 4.4 Manual Baseline Reset

**Use Case**: When concept drift is confirmed (e.g., economic downturn changes applicant profiles)

**Process**:
1. ML Lead requests baseline reset via API: `POST /api/v1/monitoring/baselines/reset`
2. System creates new baseline from last 7 days of predictions
3. System archives old baseline (marks `is_active=false`)
4. Drift monitoring continues with new baseline
5. Incident is created documenting the reset reason

---

## 5. Compliance Mapping

### 5.1 EU AI Act Requirements

| Requirement | EthixAI Implementation |
|-------------|------------------------|
| **Continuous Monitoring** (Article 72) | Daily drift analysis for high-risk models |
| **Bias Monitoring** (Article 10) | Fairness drift checked daily |
| **Record-Keeping** (Article 12) | All monitoring records stored with 5-year retention |
| **Performance Degradation Detection** (Article 15) | Accuracy drift tracked weekly (when labels available) |
| **Incident Reporting** (Article 73) | CRITICAL incidents logged and reported to compliance team |

**Audit Trail**: All drift analysis results, incidents, and alerts stored in MongoDB with immutable audit logs.

### 5.2 Kenya Data Protection Act

| Requirement | EthixAI Implementation |
|-------------|------------------------|
| **Data Minimization** (Section 25) | Prediction logs store only necessary features; PII hashed |
| **Data Accuracy** (Section 26) | Data quality drift metrics detect inaccurate inputs |
| **Automated Decision Transparency** (Section 35) | Explanation drift ensures consistent explanations |

### 5.3 Banking & Fair Lending (80% Rule)

| Regulation | Metric | Threshold | Action if Violated |
|------------|--------|-----------|-------------------|
| **80% Rule (Disparate Impact)** | Disparate Impact Ratio | < 0.80 | Immediate incident, notify compliance, halt lending |
| **FCRA Accuracy** | Model accuracy drift | > 10% drop | Validate with recent outcomes, retrain |
| **Equal Opportunity** | Equal Opportunity Drift | > 0.10 | Review for discrimination, consider model freeze |

**Reporting**: Quarterly compliance reports generated from `monitoring_records` and `incidents` collections.

---

## 6. Monitoring Dashboard Access Control

| Role | Drift Overview | Fairness Monitor | Model Health | Incident Timeline | Can Trigger Analysis |
|------|----------------|------------------|--------------|-------------------|---------------------|
| **Admin** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **ML Engineer** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Compliance Officer** | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Auditor** | ✓ | ✓ | ✓ | ✓ (read-only) | ✗ |
| **Viewer** | ✓ | ✗ | ✗ | ✗ | ✗ |

**Authentication**: Firebase Auth with role-based access control (RBAC)

**Audit Logging**: All dashboard actions logged (who viewed what, when)

---

## 7. Data Retention Policy

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| **Prediction Logs** | 90 days | Storage cost, privacy |
| **Monitoring Records** | 5 years | Compliance (EU AI Act) |
| **Incidents** | Indefinite | Legal, audit trail |
| **Drift Snapshots (Baselines)** | Indefinite | Historical comparison |
| **Alerts** | 1 year | Operational history |

**Implementation**: MongoDB TTL indexes auto-delete expired logs.

---

## 8. Performance SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Alert Delivery Time** | < 5 minutes after detection | Slack webhook latency |
| **Dashboard Load Time** | < 2 seconds | Frontend performance monitoring |
| **Drift Analysis Completion** | < 10 minutes per run | GitHub Actions workflow duration |
| **API Response Time** | < 500ms (p95) | Backend metrics |

**Monitoring the Monitor**: If drift analysis fails to complete in 12 hours, send alert to #engineering channel.

---

## 9. Review & Update Schedule

| Activity | Frequency | Owner |
|----------|-----------|-------|
| **Policy Review** | Quarterly | ML Lead + Compliance |
| **Threshold Tuning** | Bi-annually | ML Engineering |
| **Runbook Testing** | Monthly | ML Engineers (on-call rotation) |
| **Compliance Audit** | Annually | External auditor |

**Change Management**: All policy changes require approval from ML Lead, Compliance Officer, and CTO.

---

## 10. Incident Severity Examples

### INFO
- PSI = 0.08 (within stable range)
- New category appeared in < 1% of samples
- SHAP rank correlation = 0.82

### WARNING
- PSI = 0.15 (moderate drift)
- Demographic parity drift = 0.07
- Prediction distribution shift = 22%
- Accuracy drop = 6%

### CRITICAL
- Fairness drift (DP) = 0.12 (**regulatory breach**)
- Disparate impact ratio = 0.75 (**80% rule violation**)
- PSI = 0.35 (severe data drift)
- Accuracy drop = 15% (model failure)
- Multiple metrics simultaneously critical (aggregated score > 0.30)

---

## 11. Communication Plan

### Internal Notifications

| Severity | Channel | Frequency |
|----------|---------|-----------|
| INFO | Dashboard only | Real-time |
| WARNING | Slack #ml-monitoring + email digest | Daily digest |
| CRITICAL | Slack #ml-monitoring @channel + instant email + SMS (on-call) | Immediate |

### External Reporting

| Stakeholder | Report Type | Frequency |
|-------------|-------------|-----------|
| **Executive Team** | Drift summary + incidents | Monthly |
| **Board of Directors** | Compliance + risk report | Quarterly |
| **Regulators** | Incident reports (if required) | As needed |
| **Customers** (B2B clients) | Model health dashboard (optional) | On-demand access |

---

## 12. Exceptions & Overrides

**Scenario**: Model shows WARNING-level drift, but business context justifies acceptance.

**Process**:
1. ML Lead documents rationale (e.g., "Seasonal drift expected during holiday season")
2. Compliance Officer reviews and approves
3. Exception logged in `incidents` collection with `status: accepted_risk`
4. Monitoring continues; drift tracked but alert suppressed for specified period (max 30 days)

**Example**:
```json
{
  "incident_id": "INC-2025-03-042",
  "metric": "psi",
  "value": 0.18,
  "severity": "WARNING",
  "status": "accepted_risk",
  "rationale": "Seasonal applicant profile change during Q1 tax season",
  "approved_by": "compliance_officer_user_id",
  "suppression_until": "2025-04-15T00:00:00Z"
}
```

---

## 13. Training & Onboarding

**Required Training**:
- All ML Engineers: Drift metrics interpretation (2 hours)
- On-call Engineers: Incident response runbooks (4 hours)
- Compliance Officer: Regulatory mapping (2 hours)

**Materials**:
- Video: "EthixAI Monitoring System Overview" (30 min)
- Runbook simulations: Monthly tabletop exercises
- Documentation: This policy + `drift_metrics_spec.md` + `monitoring_architecture.md`

---

## 14. References

- **Metrics**: `drift_metrics_spec.md`
- **Architecture**: `monitoring_architecture.md`
- **Alerting**: `alerting_system_design.md`
- **Dashboard**: `monitoring_dashboard_design.md`
- **Incident Management**: Confluence wiki (internal)
- **Compliance**: `docs/security/compliance_mapping.md`

---

**Approval**:
- **Author**: ML Engineering Team
- **Reviewed by**: Compliance Officer, CTO
- **Approved by**: CEO
- **Effective Date**: 2025-03-01

---

**Next**: See `alerting_system_design.md` for technical implementation of notification system.
