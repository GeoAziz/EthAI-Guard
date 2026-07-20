# Alerts Playbook

## Overview
This playbook provides step-by-step guidance for responding to drift detection alerts in EthixAI-Guard.

## Alert Severity Levels

### 🚨 Critical
- **PSI ≥ 0.25**: Severe population drift
- **KL ≥ 0.3**: Major concept drift
- **Fairness drift ≥ 0.1**: Significant bias shift
- **Null rate +15%**: Critical data quality degradation

**Action Required**: Immediate investigation and likely model retraining

### ⚠️ Warning
- **0.1 ≤ PSI < 0.25**: Moderate population drift
- **0.1 ≤ KL < 0.3**: Moderate concept drift
- **0.05 ≤ Fairness drift < 0.1**: Noticeable bias shift
- **Null rate +5%**: Data quality concern

**Action Required**: Monitor closely, investigate if persists

### ✅ Stable
- **PSI < 0.1**: Normal variation
- **KL < 0.1**: Stable predictions
- **Fairness drift < 0.05**: Acceptable bias levels

**Action Required**: Routine monitoring

---

## Alert Types

### Population Drift
**Indicator**: Feature distributions have changed significantly

**Possible Causes**:
- Demographics shifted (new customer segments)
- Data collection process changed
- Seasonal/temporal patterns
- Upstream pipeline bugs

**Response Steps**:
1. **Investigate root cause**
   - Query recent data samples
   - Check for data pipeline changes
   - Review application logs
2. **Assess impact**
   - Check model accuracy on recent data
   - Review business metrics
3. **Decide action**
   - If expected (seasonal): Update baseline
   - If unexpected: Investigate further
   - If accuracy dropped: Retrain model
4. **Document findings**
   - Add comment to GitHub issue
   - Update baseline metadata

**Example**:
```bash
# Check recent feature distributions
python -m ai_core.drift.worker --mode streaming --window 60 --model-id production_model

# Update baseline if drift is expected
python -m ai_core.drift.baseline --update --model-id production_model --reason "Q4 seasonal shift"
```

---

### Concept Drift
**Indicator**: Score distributions have changed (prediction behavior shifted)

**Possible Causes**:
- Real-world patterns changed
- Model no longer reflects current reality
- Label definitions changed
- Training data no longer representative

**Response Steps**:
1. **Verify accuracy degradation**
   - Check recent ground truth labels
   - Calculate confusion matrix
   - Review precision/recall
2. **Identify affected segments**
   - Slice by demographics
   - Check protected attributes
3. **Assess urgency**
   - Critical if accuracy <80%
   - Warning if accuracy 80-90%
4. **Trigger retraining**
   - Use recent labeled data
   - Include new patterns
   - Validate before deployment

**Example**:
```bash
# Trigger retraining via API
curl -X POST https://api.ethixai.com/v1/models/production_model/trigger-retrain \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason": "Concept drift detected", "requested_by": "ops_team"}'
```

---

### Fairness Drift
**Indicator**: Bias metrics have degraded

**Possible Causes**:
- Input data became imbalanced
- Protected attribute distributions shifted
- Model behavior changed for subgroups
- Labeling bias introduced

**Response Steps**:
1. **Urgent**: Stop using model if critical drift
2. **Analyze by group**
   - Check demographic parity
   - Review equal opportunity
   - Calculate disparate impact
3. **Identify bias source**
   - Feature importance by group
   - Prediction distribution by group
4. **Remediate**
   - Re-weight training data
   - Apply fairness constraints
   - Retrain with balanced data
5. **Validate fairness**
   - Run validation pipeline
   - Check all fairness metrics

**Escalation**: Contact compliance team for critical fairness violations

**Example**:
```bash
# Run fairness analysis
python -m ai_core.models.fairness_validator \
  --model-id production_model \
  --protected-attrs race,gender \
  --output fairness_report.json
```

---

### Data Quality Drift
**Indicator**: Null rates increased or new categories appeared

**Possible Causes**:
- Upstream data pipeline failure
- Integration changes
- Schema changes
- Data source reliability issues

**Response Steps**:
1. **Check data pipeline**
   - Review ETL logs
   - Verify data sources
   - Check API integrations
2. **Assess impact**
   - Model handles nulls gracefully?
   - New categories within expected range?
3. **Fix pipeline**
   - Repair broken integrations
   - Update data validation
   - Backfill missing data if possible
4. **Decide on model**
   - Can handle new data? Continue
   - Cannot handle? Block predictions until fixed

**Example**:
```bash
# Check data quality metrics
python -m ai_core.utils.data_quality_check \
  --days 7 \
  --features loan_amount,income,credit_score
```

---

## Escalation Paths

### Level 1: Warning Alerts (First 24h)
- **Owner**: ML Engineer on-call
- **Action**: Monitor, investigate, document
- **SLA**: Acknowledge within 2 hours

### Level 2: Persistent Warnings (>24h)
- **Owner**: ML Engineering Lead
- **Action**: Deep investigation, coordinate fixes
- **SLA**: Resolution plan within 8 hours

### Level 3: Critical Alerts
- **Owner**: ML Engineering Lead + Product Manager
- **Action**: Immediate response, may require model rollback
- **SLA**: Acknowledge within 30 minutes, action within 2 hours

### Level 4: Critical Fairness Violations
- **Owner**: ML Lead + Compliance + Legal
- **Action**: Stop model, urgent remediation
- **SLA**: Immediate response

---

## Communication Channels

### Slack
- **Channel**: `#ethixai-alerts`
- **Critical alerts**: Auto-ping `@ml-oncall`
- **Daily summaries**: Posted at 9 AM

### Email
- **Recipients**: ml-team@company.com
- **Frequency**: Critical alerts immediately, daily digest

### GitHub Issues
- **Repository**: GeoAziz/EthAI-Guard
- **Labels**: `drift-alert`, `critical`/`warning`, alert type
- **Auto-assignment**: ML on-call rotation

---

## Retraining Workflow

### Trigger Conditions
1. **≥2 critical alerts in 24 hours** (auto-flagged)
2. **Manual trigger** by ML team
3. **Scheduled retraining** (monthly baseline)

### Retraining Steps
1. **Prepare data**
   ```bash
   python -m ai_core.data.prepare_training_data \
     --days 90 \
     --output training_data.parquet
   ```

2. **Train model**
   ```bash
   python -m ai_core.models.train \
     --data training_data.parquet \
     --model-id production_model_v2 \
     --fairness-constraints
   ```

3. **Validate**
   ```bash
   python -m ai_core.models.validate \
     --model-id production_model_v2 \
     --run-fairness-tests \
     --output validation_report.json
   ```

4. **Create new baseline**
   ```bash
   python -m ai_core.drift.baseline --create \
     --model-id production_model_v2 \
     --training-data training_data.parquet
   ```

5. **Deploy**
   - Stage to canary environment
   - Monitor for 24 hours
   - Promote to production
   - Archive old model

---

## Runbook Commands

### Check current drift status
```bash
curl https://api.ethixai.com/v1/drift/status/production_model | jq
```

### Get active alerts
```bash
curl https://api.ethixai.com/v1/drift/alerts/production_model?resolved=false | jq
```

### Resolve alert
```bash
curl -X POST https://api.ethixai.com/v1/drift/alerts/ALERT_ID/resolve \
  -H "Content-Type: application/json" \
  -d '{"resolution_note": "Fixed data pipeline, drift expected"}'
```

### Run manual drift detection
```bash
python -m ai_core.drift.worker --mode batch --window 1 --model-id production_model
```

### Update baseline (after retraining)
```bash
python -m ai_core.drift.baseline --update \
  --model-id production_model \
  --training-data new_training_data.parquet \
  --reason "Model retrained on 2024-12-17"
```

---

## Prevention Best Practices

1. **Monitor proactively**: Check dashboard daily
2. **Set up alerts**: Configure Slack/email notifications
3. **Regular baselines**: Update every 2-3 months
4. **Document changes**: Log all data/model updates
5. **Test before deploy**: Validate drift detection on staging
6. **Maintain runbooks**: Keep this document updated

---

## Contact Information

- **ML On-Call**: Slack `@ml-oncall` or PagerDuty
- **ML Engineering Lead**: lead@company.com
- **Compliance Team**: compliance@company.com
- **Security Team**: security@company.com

---

**Last Updated**: December 2024  
**Maintained By**: ML Engineering Team
