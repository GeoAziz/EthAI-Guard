# Model Governance Quick Start Guide

This guide shows you how to use the EthixAI Model Governance system for Model Cards, Compliance Checks, and Audit Logging.

---

## Prerequisites

- Python 3.11+ with virtual environment activated
- PyYAML installed (`pip install pyyaml`)
- Training artifacts saved in proper format (JSON)
- MongoDB connection configured (for backend APIs)

---

## Step 1: Prepare Training Artifacts

Save your model's training information in three JSON files:

### Training Log (`logs/training/<model_id>_<date>.json`)

```json
{
  "model_id": "fairlens_20251118_v2_1_0",
  "training_start": "2025-01-15T08:00:00Z",
  "training_end": "2025-01-15T13:23:00Z",
  "framework": "LightGBM 4.0.0 + Fairlearn 0.10.0",
  "hyperparameters": {
    "num_leaves": 31,
    "learning_rate": 0.05,
    "n_estimators": 500
  },
  "datasets": [{
    "name": "Historical Credit Applications",
    "source": "Partner Bank ABC",
    "size": 150000,
    "date_range": "2020-01-01 to 2024-12-31"
  }],
  "protected_attributes": ["gender", "age", "ethnicity"],
  "data_quality": {
    "completeness": 0.96,
    "consistency": 0.94
  }
}
```

### Metrics Log (`logs/metrics/<model_id>_<date>.json`)

```json
{
  "model_id": "fairlens_20251118_v2_1_0",
  "evaluation_date": "2025-01-15T14:00:00Z",
  "test_set_size": 22500,
  "metrics": {
    "accuracy": 0.94,
    "precision": 0.92,
    "recall": 0.91,
    "f1_score": 0.915,
    "auc_roc": 0.96
  },
  "confusion_matrix": {
    "true_positives": 10350,
    "false_positives": 900,
    "true_negatives": 10350,
    "false_negatives": 900
  },
  "confidence_intervals": {
    "accuracy": [0.93, 0.95],
    "precision": [0.90, 0.94]
  }
}
```

### Fairness Report (`logs/fairness/<model_id>_<date>.json`)

```json
{
  "model_id": "fairlens_20251118_v2_1_0",
  "analysis_date": "2025-01-15T15:00:00Z",
  "protected_attributes": ["gender", "age", "ethnicity"],
  "demographic_parity": {
    "gender": {
      "male": 0.72,
      "female": 0.68,
      "difference": 0.04,
      "status": "PASS"
    }
  },
  "disparate_impact": {
    "gender": {
      "ratio": 0.94,
      "threshold": 0.80,
      "status": "PASS"
    }
  },
  "feature_importance": {
    "top_features": [
      {"feature": "credit_score", "importance": 0.35},
      {"feature": "income_to_debt_ratio", "importance": 0.28},
      {"feature": "employment_years", "importance": 0.18}
    ]
  },
  "bias_mitigation": {
    "technique": "Reweighting + Fairness Constraints",
    "effectiveness": {
      "before_mitigation": {"demographic_parity_diff": 0.12},
      "after_mitigation": {"demographic_parity_diff": 0.04}
    }
  }
}
```

---

## Step 2: Generate Model Card

Run the Model Card Generator:

```bash
cd ai_core

# Using virtual environment Python
/mnt/devmandrive/EthAI/.venv_ai_core/bin/python governance/model_card_generator.py \
  --model-id fairlens \
  --version 2.1.0 \
  --training-log logs/training/fairlens_20250118.json \
  --metrics logs/metrics/fairlens_20250118.json \
  --fairness-report logs/fairness/fairlens_20250118.json \
  --output-format json \
  --output-dir ../docs/model_cards/
```

**Output:**
```
✅ Model Card generated successfully:
   ../docs/model_cards/fairlens_v2_1_0.json
📊 Summary:
   Model: FairLens v2.1.0
   Accuracy: 94.0%
   Fairness: Monitored
   Compliance: ✅ COMPLIANT
```

### Alternative Output Formats

**YAML:**
```bash
python governance/model_card_generator.py \
  --model-id fairlens \
  --version 2.1.0 \
  --training-log logs/training/fairlens_20250118.json \
  --metrics logs/metrics/fairlens_20250118.json \
  --fairness-report logs/fairness/fairlens_20250118.json \
  --output-format yaml \
  --output-dir ../docs/model_cards/
```

**Markdown (Human-readable):**
```bash
python governance/model_card_generator.py \
  --model-id fairlens \
  --version 2.1.0 \
  --training-log logs/training/fairlens_20250118.json \
  --metrics logs/metrics/fairlens_20250118.json \
  --fairness-report logs/fairness/fairlens_20250118.json \
  --output-format markdown \
  --output-dir ../docs/model_cards/
```

---

## Step 3: Validate Compliance

Run the Compliance Checker:

```bash
cd ai_core

/mnt/devmandrive/EthAI/.venv_ai_core/bin/python governance/compliance_checker.py \
  --model-card ../docs/model_cards/fairlens_v2_1_0.json \
  --policies governance/policies.yaml
```

**Output (PASS):**
```
========================================
COMPLIANCE CHECK REPORT
========================================
Model: fairlens_20251118_v2_1_0
Timestamp: 2025-11-18T05:51:17Z

Overall Status: PASS

========================================
SUMMARY
========================================
Total Checks: 7
✅ Passed: 7
⚠️  Warnings: 0
❌ Failures: 0
```

**Output (WARNING):**
```
========================================
COMPLIANCE CHECK REPORT
========================================
Model: fairlens_20251118_v2_1_0

Overall Status: WARNING

========================================
WARNINGS
========================================

⚠️  Protected Attribute Leakage
   Severity: HIGH
   Message: Protected attribute(s) found in top 5 features: ['age']
```

**Output (FAIL):**
```
========================================
COMPLIANCE CHECK REPORT
========================================
Model: riskassess_20251118_v1_0_0

Overall Status: FAIL

========================================
FAILURES
========================================

❌ Fairness Threshold Violation
   Severity: CRITICAL
   Message: Demographic parity difference 0.15 exceeds threshold 0.10
```

### Save Compliance Report

```bash
python governance/compliance_checker.py \
  --model-card ../docs/model_cards/fairlens_v2_1_0.json \
  --policies governance/policies.yaml \
  --output-format json \
  --output-file compliance_report_fairlens.json
```

---

## Step 4: Commit and Push (Trigger CI/CD)

```bash
# Add generated files
git add ai_core/logs/ docs/model_cards/

# Commit with descriptive message
git commit -m "feat: Add Model Card for fairlens v2.1.0"

# Push to trigger CI/CD workflow
git push origin main
```

The GitHub Actions workflow will automatically:
1. Detect model changes
2. Generate Model Card (again, for verification)
3. Run compliance validation
4. Upload to MongoDB (if on `main` branch)
5. Create audit log
6. Send Slack notification (if FAIL/WARNING)
7. Block deployment if compliance FAILS

---

## Step 5: Query Backend APIs

### Get All Model Cards

```bash
curl http://localhost:5000/api/model-cards
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "673a5f2e8d4c1a2b3e4f5678",
      "model_metadata": {
        "model_id": "fairlens_20251118_v2_1_0",
        "model_name": "FairLens",
        "version": "2.1.0"
      },
      "compliance_report": {
        "overall_status": "WARNING",
        "summary": {
          "total_checks": 7,
          "passed": 6,
          "warnings": 1,
          "failures": 0
        }
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_records": 1,
    "per_page": 20
  }
}
```

### Get Single Model Card

```bash
curl http://localhost:5000/api/model-cards/673a5f2e8d4c1a2b3e4f5678
```

### Get Compliance Statistics

```bash
curl http://localhost:5000/api/model-cards/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "compliance": {
      "total": 3,
      "PASS": 1,
      "WARNING": 2,
      "FAIL": 0
    },
    "status": {
      "PRODUCTION": 1,
      "REVIEW": 1,
      "DRAFT": 1
    }
  }
}
```

### Query Audit Logs

```bash
# Get recent compliance checks
curl "http://localhost:5000/api/audit/logs?event_type=COMPLIANCE_CHECK&limit=10"

# Get audit trail for specific model
curl "http://localhost:5000/api/audit/logs/fairlens/trail"

# Get compliance rate (last 30 days)
curl "http://localhost:5000/api/audit/compliance-rate?days=30"
```

---

## Step 6: Update Model Status

### Promote Model to Production

```bash
curl -X PATCH http://localhost:5000/api/model-cards/673a5f2e8d4c1a2b3e4f5678/status \
  -H "Content-Type: application/json" \
  -d '{"status": "PRODUCTION"}'
```

**Status Lifecycle:**
```
DRAFT → REVIEW → APPROVED → PRODUCTION
                               ↓
                          DEPRECATED
```

---

## Common Use Cases

### Case 1: New Model Release

```bash
# 1. Train model and save artifacts
python train_model.py --model-id mymodel --version 1.0.0

# 2. Generate Model Card
python governance/model_card_generator.py \
  --model-id mymodel --version 1.0.0 \
  --training-log logs/training/mymodel_20251118.json \
  --metrics logs/metrics/mymodel_20251118.json \
  --fairness-report logs/fairness/mymodel_20251118.json \
  --output-format json --output-dir ../docs/model_cards/

# 3. Validate compliance
python governance/compliance_checker.py \
  --model-card ../docs/model_cards/mymodel_v1_0_0.json \
  --policies governance/policies.yaml

# 4. If PASS, commit and push
git add . && git commit -m "feat: Add Model Card for mymodel v1.0.0" && git push
```

### Case 2: Model Retraining

```bash
# 1. Retrain model with new data
python train_model.py --model-id fairlens --version 2.2.0

# 2. Generate new Model Card
python governance/model_card_generator.py \
  --model-id fairlens --version 2.2.0 \
  --training-log logs/training/fairlens_20251125.json \
  --metrics logs/metrics/fairlens_20251125.json \
  --fairness-report logs/fairness/fairlens_20251125.json \
  --output-format json --output-dir ../docs/model_cards/

# 3. Compare versions
curl "http://localhost:5000/api/model-cards/fairlens/versions"

# 4. Validate and deploy
python governance/compliance_checker.py \
  --model-card ../docs/model_cards/fairlens_v2_2_0.json \
  --policies governance/policies.yaml
```

### Case 3: Compliance Audit

```bash
# 1. Get all Model Cards with compliance status
curl "http://localhost:5000/api/model-cards?compliance_status=WARNING"

# 2. Get audit trail for specific model
curl "http://localhost:5000/api/audit/logs/fairlens/trail"

# 3. Export audit logs for regulator
curl "http://localhost:5000/api/audit/logs?start_date=2025-01-01&end_date=2025-12-31" > audit_logs_2025.json

# 4. Get compliance summary
curl "http://localhost:5000/api/audit/summary?days=90"
```

---

## Troubleshooting

### Error: "ModuleNotFoundError: No module named 'yaml'"

**Solution:** Install PyYAML
```bash
pip install pyyaml
```

### Error: "can't open file 'governance/model_card_generator.py'"

**Solution:** Change to correct directory
```bash
cd /mnt/devmandrive/EthAI/ai_core
```

### Error: "YAML parsing error in policies.yaml"

**Solution:** Check YAML syntax (indentation, no tabs)
```bash
# Validate YAML
python -c "import yaml; yaml.safe_load(open('governance/policies.yaml'))"
```

### Warning: "Protected attribute leakage"

**Analysis:** A protected attribute (gender, age, ethnicity) is in the top 5 most important features

**Actions:**
1. **Review model architecture:** Is this feature actually needed for predictions?
2. **Retrain without feature:** Exclude protected attribute from training data
3. **Use fairness constraints:** Apply stronger constraints during training (increase epsilon)
4. **Document justification:** If feature is legitimately needed, document why in Model Card

**Example:**
```python
# Retrain with fairness constraints
from fairlearn.reductions import ExponentiatedGradient, DemographicParity

mitigator = ExponentiatedGradient(
    estimator=base_model,
    constraints=DemographicParity(epsilon=0.03)  # Stricter constraint
)
mitigator.fit(X_train, y_train, sensitive_features=sensitive_features)
```

---

## Policy Configuration

Edit `ai_core/governance/policies.yaml` to adjust thresholds:

```yaml
fairness_policies:
  demographic_parity:
    max_difference: 0.10  # Increase to 0.15 for more lenient threshold
    severity: "CRITICAL"
  
  disparate_impact:
    min_ratio: 0.80  # Decrease to 0.75 for more lenient threshold
    severity: "CRITICAL"

performance_policies:
  minimum_accuracy:
    threshold: 0.75  # Increase to 0.80 for stricter requirement
    severity: "HIGH"
```

**After editing, re-run compliance check to see new results.**

---

## Best Practices

### 1. Semantic Versioning

Use semantic versioning for models:
- **Major (1.0.0 → 2.0.0):** Breaking changes (different features, algorithm)
- **Minor (1.0.0 → 1.1.0):** New features, improved performance
- **Patch (1.0.0 → 1.0.1):** Bug fixes, hyperparameter tuning

### 2. Descriptive Commit Messages

```bash
# Good
git commit -m "feat: Add Model Card for fairlens v2.1.0 - improved fairness metrics"

# Bad
git commit -m "update model"
```

### 3. Regular Fairness Audits

Schedule monthly fairness re-evaluations:
```bash
# Run fairness analysis on production model
python run_fairness_audit.py --model-id fairlens --version 2.1.0

# Generate new fairness report
python governance/model_card_generator.py ... --fairness-report logs/fairness/fairlens_$(date +%Y%m%d).json
```

### 4. Document Model Limitations

Always include `ethical_considerations.known_limitations` in training artifacts:
```json
{
  "ethical_considerations": {
    "known_limitations": [
      "Model trained on historical data (2020-2024), may not reflect recent economic shifts",
      "Limited representation of age group 18-21 (only 3% of training data)"
    ]
  }
}
```

---

## Next Steps

- **Frontend Dashboard:** Visual interface for Model Cards and Audit Logs (Day 24)
- **Test Suites:** Comprehensive unit and integration tests (Day 24)
- **Authentication:** Add JWT auth to API routes (Day 24)
- **PDF Export:** Generate PDF Model Cards for regulators (Day 24)

---

## Support

For issues or questions:
- **Documentation:** `docs/governance/`
- **GitHub Issues:** [EthixAI/issues](https://github.com/ethixai/issues)
- **Email:** ml-team@ethixai.com
