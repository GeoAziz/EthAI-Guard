# Model Cards Design Specification

**Version:** 1.0  
**Date:** November 18, 2025  
**Owner:** AI Governance Team  
**Status:** Active

---

## 1. Executive Summary

This document defines the **Model Card** standard for EthixAI Guard. Model Cards provide transparent, standardized documentation for all deployed AI models, ensuring ethical AI usage, regulatory compliance, and auditability.

**Key Objectives:**
- ✅ **Transparency**: Clear model behavior documentation for developers, auditors, and clients
- ✅ **Compliance**: Automated validation against EU AI Act, Kenya Data Protection Act, CBK guidelines
- ✅ **Auditability**: Complete traceability of model decisions, versions, and policy violations
- ✅ **Ethical AI**: Explicit documentation of fairness, bias, and limitations

---

## 2. Model Card Template Structure

### 2.1 Core Sections

Every Model Card MUST include the following sections:

#### **Section 1: Model Metadata**
```yaml
model_name: "FairLens-v2.1"
model_id: "fairlens_20250115_v2_1"
version: "2.1.0"
release_date: "2025-01-15T14:30:00Z"
model_type: "Fairness Analyzer"
author: "EthixAI ML Team"
contact: "ml-team@ethixai.com"
license: "Proprietary"
status: "production"  # production | staging | deprecated
last_updated: "2025-01-15T14:30:00Z"
training_completed: "2025-01-10T09:00:00Z"
```

**Purpose**: Identify and track model versions across environments.

---

#### **Section 2: Intended Use**
```yaml
intended_use:
  primary_purpose: "Detect fairness violations in credit scoring models"
  target_users:
    - "Risk Managers"
    - "Compliance Officers"
    - "ML Engineers"
  supported_tasks:
    - "Demographic Parity Analysis"
    - "Equal Opportunity Detection"
    - "Disparate Impact Calculation"
  business_context: "Financial Services - Credit Risk Assessment"
  deployment_environment: "Production (Render + Vercel)"
  expected_volume: "10,000 predictions/day"
```

**Constraints & Out-of-Scope Uses:**
```yaml
constraints:
  - "Requires minimum 1000 samples per protected group"
  - "Only supports binary and multi-class classification"
  - "Cannot analyze time-series models"
out_of_scope:
  - "Not suitable for medical diagnosis fairness"
  - "Not designed for regression model bias detection"
  - "Should not be used for real-time streaming data"
```

---

#### **Section 3: Performance Metrics**

```yaml
performance:
  overall_accuracy: 0.94
  precision: 0.92
  recall: 0.91
  f1_score: 0.915
  auc_roc: 0.96
  
  # Per-class metrics (if multi-class)
  per_class_metrics:
    class_0:
      precision: 0.93
      recall: 0.90
      f1_score: 0.915
    class_1:
      precision: 0.91
      recall: 0.92
      f1_score: 0.915
  
  # Confidence intervals (95%)
  confidence_intervals:
    accuracy: [0.93, 0.95]
    precision: [0.90, 0.94]
    recall: [0.89, 0.93]
  
  # Test set details
  test_set:
    size: 5000
    sampling_method: "stratified"
    date_range: "2024-01-01 to 2024-12-31"
```

**Benchmark Comparisons:**
```yaml
benchmarks:
  - baseline_model: "Logistic Regression"
    baseline_accuracy: 0.87
    improvement: "+7.0%"
  - competitor_model: "XGBoost Default"
    competitor_accuracy: 0.91
    improvement: "+3.3%"
```

---

#### **Section 4: Fairness & Bias Checks**

```yaml
fairness_metrics:
  protected_attributes:
    - "gender"
    - "age_group"
    - "ethnicity"
    
  demographic_parity:
    gender:
      male: 0.72
      female: 0.68
      difference: 0.04  # Within acceptable threshold (<0.1)
      status: "PASS"
    ethnicity:
      group_a: 0.70
      group_b: 0.69
      group_c: 0.71
      max_difference: 0.02
      status: "PASS"
  
  equal_opportunity:
    gender:
      male_tpr: 0.89
      female_tpr: 0.87
      difference: 0.02  # Within threshold (<0.05)
      status: "PASS"
  
  disparate_impact:
    gender:
      ratio: 0.94  # female/male approval rate
      threshold: 0.80  # 80% rule
      status: "PASS"
    ethnicity:
      min_ratio: 0.91
      threshold: 0.80
      status: "PASS"
  
  calibration:
    overall_calibration_error: 0.03
    per_group_calibration:
      male: 0.029
      female: 0.031
      max_difference: 0.002
      status: "PASS"
```

**Bias Mitigation Applied:**
```yaml
bias_mitigation:
  preprocessing:
    - "Reweighting training samples by protected group"
    - "Stratified sampling to balance groups"
  inprocessing:
    - "Fairness constraints during training (epsilon=0.05)"
  postprocessing:
    - "Threshold optimization per group"
  effectiveness:
    before_mitigation:
      demographic_parity_diff: 0.12
      disparate_impact_ratio: 0.73
    after_mitigation:
      demographic_parity_diff: 0.04
      disparate_impact_ratio: 0.94
```

---

#### **Section 5: Explainability**

```yaml
explainability:
  method: "SHAP (SHapley Additive exPlanations)"
  global_importance:
    top_features:
      - feature: "credit_score"
        importance: 0.35
        direction: "positive"
      - feature: "income_to_debt_ratio"
        importance: 0.28
        direction: "positive"
      - feature: "employment_years"
        importance: 0.18
        direction: "positive"
      - feature: "existing_credit_lines"
        importance: 0.12
        direction: "negative"
      - feature: "age"
        importance: 0.07
        direction: "positive"
  
  local_explanations:
    sample_explanation_available: true
    per_prediction_shap: true
    visualization_support: true
  
  interpretability_score: 0.87  # Internal metric (0-1)
  
  # Sanity checks
  sanity_checks:
    protected_attribute_leakage: "PASS"  # Gender/ethnicity not in top 10 features
    feature_correlation_analysis: "PASS"  # No proxy features detected
    counterfactual_stability: "PASS"     # Small changes don't flip predictions
```

---

#### **Section 6: Ethical Considerations**

```yaml
ethical_considerations:
  known_limitations:
    - "Model trained on historical data (2020-2024), may not reflect recent economic shifts"
    - "Limited representation of age group 18-21 (only 3% of training data)"
    - "Fairness metrics optimized for binary gender classification only"
    - "Does not account for intersectional bias (e.g., Black women as distinct group)"
  
  potential_misuse:
    - "Should NOT be used for hiring decisions (different legal requirements)"
    - "Should NOT be deployed without human review for high-stakes decisions (>$100k loans)"
    - "May perpetuate historical lending biases if baseline data is biased"
  
  known_biases:
    - "Slight age bias detected: 55+ age group has 2% lower approval rate (historical lending patterns)"
    - "Urban vs rural bias: Urban applicants 5% higher approval (correlated with credit history availability)"
  
  fairness_tradeoffs:
    - "Accuracy reduced from 0.96 to 0.94 to achieve demographic parity"
    - "Precision slightly lower for protected groups to maintain equal opportunity"
  
  stakeholder_impact:
    positive:
      - "Reduces discriminatory lending practices"
      - "Increases transparency in credit decisions"
      - "Provides explainable reasons for rejections"
    negative:
      - "May flag historically biased models, requiring costly retraining"
      - "Some legitimate risk factors may be deprioritized for fairness"
  
  human_oversight:
    required: true
    review_threshold: "All rejections with fairness score < 0.7"
    escalation_path: "Loan Officer → Senior Underwriter → Compliance"
```

---

#### **Section 7: Compliance Alignment**

```yaml
compliance:
  regulations:
    - regulation: "EU AI Act"
      risk_level: "High-Risk"  # Financial services classification
      requirements_met:
        - "Human oversight mandated (✓)"
        - "Transparency and explainability (✓)"
        - "Accuracy and robustness testing (✓)"
        - "Bias monitoring and mitigation (✓)"
        - "Data governance and quality (✓)"
      compliance_status: "COMPLIANT"
      last_audit: "2025-01-10"
      next_audit: "2025-04-10"  # Quarterly
    
    - regulation: "Kenya Data Protection Act 2019"
      requirements_met:
        - "Consent for data processing (✓)"
        - "Data minimization principle (✓)"
        - "Right to explanation (✓)"
        - "Automated decision-making transparency (✓)"
      compliance_status: "COMPLIANT"
      last_audit: "2025-01-05"
    
    - regulation: "CBK Prudential Guidelines 2023"
      requirements_met:
        - "Model risk management framework (✓)"
        - "Independent validation (✓)"
        - "Documentation and audit trail (✓)"
        - "Ongoing monitoring (✓)"
      compliance_status: "COMPLIANT"
      last_audit: "2025-01-08"
  
  internal_policies:
    - policy: "EthixAI Fairness Policy v2.0"
      requirements:
        - "Demographic parity difference < 0.1 (✓ 0.04)"
        - "Disparate impact ratio > 0.8 (✓ 0.94)"
        - "Protected attributes not in top-5 features (✓)"
      status: "PASS"
    
    - policy: "Model Monitoring Policy"
      requirements:
        - "Weekly drift analysis (✓)"
        - "Monthly fairness re-evaluation (✓)"
        - "Quarterly retraining assessment (✓)"
      status: "PASS"
  
  audit_trail:
    logs_enabled: true
    log_retention: "7 years"  # Financial services requirement
    log_storage: "MongoDB Atlas (encrypted)"
    immutability: "Append-only audit logs with cryptographic hashing"
```

---

#### **Section 8: Training Data Summary**

```yaml
training_data:
  datasets:
    - name: "Historical Credit Applications 2020-2024"
      source: "Partner Bank ABC"
      size: 150000
      date_range: "2020-01-01 to 2024-12-31"
      license: "Commercial License (Partner Agreement)"
      sensitive_data: true
      protected_attributes_included:
        - "gender"
        - "age"
        - "ethnicity"
  
  preprocessing:
    steps:
      - "Missing value imputation (median for numerical, mode for categorical)"
      - "Outlier removal (IQR method, 1.5x threshold)"
      - "Feature scaling (StandardScaler)"
      - "Categorical encoding (One-Hot Encoding)"
      - "Protected attribute encoding (separate pipeline)"
    feature_count:
      original: 87
      after_engineering: 142
      final_selected: 45
  
  data_splits:
    training: 70%  # 105,000 samples
    validation: 15%  # 22,500 samples
    test: 15%  # 22,500 samples
    splitting_strategy: "Stratified by outcome and protected groups"
  
  data_quality:
    completeness: 0.96  # 96% of required fields present
    consistency_score: 0.94
    outliers_removed: 3.2%
    duplicates_removed: 0.5%
  
  protected_group_distribution:
    gender:
      male: 52%
      female: 48%
    age:
      "18-25": 15%
      "26-35": 32%
      "36-45": 28%
      "46-55": 18%
      "56+": 7%
    ethnicity:
      group_a: 45%
      group_b: 30%
      group_c: 18%
      group_d: 7%
```

---

#### **Section 9: Model Architecture & Training**

```yaml
model_architecture:
  algorithm: "Gradient Boosted Trees (LightGBM)"
  hyperparameters:
    num_leaves: 31
    learning_rate: 0.05
    n_estimators: 500
    max_depth: 7
    min_child_samples: 20
    subsample: 0.8
    colsample_bytree: 0.8
  
  fairness_constraints:
    constraint_type: "Demographic Parity"
    epsilon: 0.05  # Max allowed difference
    weight: 0.3    # Balance between accuracy and fairness
  
  training_details:
    duration: "4 hours 23 minutes"
    compute: "AWS EC2 c5.4xlarge (16 vCPUs, 32 GB RAM)"
    framework: "LightGBM 4.0.0 + Fairlearn 0.10.0"
    early_stopping: true
    early_stopping_rounds: 50
    validation_metric: "AUC-ROC"
  
  model_size:
    disk: "45 MB"
    memory_runtime: "120 MB"
    parameters: "2.3 million"
```

---

#### **Section 10: Versioning & Change History**

```yaml
version_history:
  - version: "2.1.0"
    date: "2025-01-15"
    changes:
      - "Improved calibration for age group 56+ (ECE reduced from 0.08 to 0.03)"
      - "Added intersectional fairness checks (gender × ethnicity)"
      - "Updated training data to include Q4 2024"
    metrics_change:
      accuracy: "+0.01"
      demographic_parity_diff: "-0.02"  # Improvement
      disparate_impact_ratio: "+0.04"
    deployed_to: "production"
    rollback_available: true
  
  - version: "2.0.1"
    date: "2024-12-20"
    changes:
      - "Hotfix: Fixed SHAP calculation bug for categorical features"
    metrics_change:
      accuracy: "0.00"
      demographic_parity_diff: "0.00"
    deployed_to: "production"
    rollback_available: true
  
  - version: "2.0.0"
    date: "2024-12-01"
    changes:
      - "Major update: Switched from XGBoost to LightGBM"
      - "Implemented fairness constraints during training"
      - "Added SHAP explainability"
    metrics_change:
      accuracy: "+0.03"
      demographic_parity_diff: "-0.08"  # Major improvement
      disparate_impact_ratio: "+0.21"
    deployed_to: "production"
    rollback_available: true
  
  - version: "1.5.0"
    date: "2024-09-15"
    changes:
      - "Baseline model (XGBoost without fairness constraints)"
    metrics_change: null
    deployed_to: "production"
    rollback_available: false  # Deprecated
```

---

## 3. Output Formats

Model Cards MUST be available in three formats:

### 3.1 JSON Format (Machine-Readable)

```json
{
  "model_metadata": {
    "model_name": "FairLens-v2.1",
    "model_id": "fairlens_20250115_v2_1",
    "version": "2.1.0",
    "release_date": "2025-01-15T14:30:00Z",
    "model_type": "Fairness Analyzer",
    "author": "EthixAI ML Team",
    "status": "production"
  },
  "performance": {
    "overall_accuracy": 0.94,
    "precision": 0.92,
    "recall": 0.91,
    "f1_score": 0.915,
    "auc_roc": 0.96
  },
  "fairness_metrics": {
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
    }
  },
  "compliance": {
    "regulations": [
      {
        "regulation": "EU AI Act",
        "risk_level": "High-Risk",
        "compliance_status": "COMPLIANT",
        "last_audit": "2025-01-10"
      }
    ]
  }
}
```

**Use Case**: API integration, automated compliance checks, CI/CD pipelines.

---

### 3.2 YAML Format (Configuration-Friendly)

```yaml
model_metadata:
  model_name: "FairLens-v2.1"
  model_id: "fairlens_20250115_v2_1"
  version: "2.1.0"
  release_date: "2025-01-15T14:30:00Z"
  status: "production"

performance:
  overall_accuracy: 0.94
  precision: 0.92
  recall: 0.91
  f1_score: 0.915

fairness_metrics:
  demographic_parity:
    gender:
      male: 0.72
      female: 0.68
      difference: 0.04
      status: "PASS"
```

**Use Case**: Configuration management, GitOps workflows, easy human editing.

---

### 3.3 Markdown Format (Human-Readable)

```markdown
# Model Card: FairLens v2.1

**Model ID:** `fairlens_20250115_v2_1`  
**Version:** 2.1.0  
**Release Date:** January 15, 2025  
**Status:** 🟢 Production

## Performance Metrics

- **Accuracy:** 94%
- **Precision:** 92%
- **Recall:** 91%
- **F1 Score:** 0.915
- **AUC-ROC:** 0.96

## Fairness Metrics

### Demographic Parity
- **Gender Difference:** 0.04 (✓ PASS)
  - Male: 0.72
  - Female: 0.68

### Disparate Impact
- **Gender Ratio:** 0.94 (✓ PASS, threshold 0.80)

## Compliance Status

✅ **EU AI Act** - COMPLIANT (High-Risk)  
✅ **Kenya Data Protection Act** - COMPLIANT  
✅ **CBK Guidelines** - COMPLIANT
```

**Use Case**: Documentation websites, stakeholder reports, dashboard display.

---

## 4. Storage & Access

### 4.1 Storage Strategy

```yaml
storage:
  primary: "MongoDB Atlas (Free Tier M0)"
  collection: "model_cards"
  indexes:
    - field: "model_metadata.model_id"
      type: "unique"
    - field: "model_metadata.status"
      type: "single"
    - field: "model_metadata.version"
      type: "single"
    - field: "compliance.regulations.compliance_status"
      type: "single"
  
  versioning:
    strategy: "Immutable documents with version history array"
    retention: "All versions retained indefinitely"
  
  backup:
    frequency: "Daily"
    retention: "90 days"
    location: "MongoDB Atlas backup (automatic)"
```

### 4.2 Access Patterns

```javascript
// Get latest model card
GET /api/model-cards/:modelId/latest

// Get specific version
GET /api/model-cards/:modelId/versions/:version

// List all model cards
GET /api/model-cards?status=production&compliance=COMPLIANT

// Get version history
GET /api/model-cards/:modelId/history

// Get compliance summary
GET /api/model-cards/:modelId/compliance
```

---

## 5. Validation Rules

Every Model Card MUST pass these validation rules:

### 5.1 Required Fields

```yaml
required_fields:
  - model_metadata.model_name
  - model_metadata.model_id
  - model_metadata.version
  - model_metadata.release_date
  - performance.overall_accuracy
  - fairness_metrics
  - compliance.regulations
  - training_data.datasets
```

### 5.2 Threshold Validation

```yaml
thresholds:
  performance:
    minimum_accuracy: 0.75
    minimum_auc_roc: 0.70
  
  fairness:
    max_demographic_parity_diff: 0.10
    min_disparate_impact_ratio: 0.80
    max_equal_opportunity_diff: 0.05
  
  explainability:
    min_interpretability_score: 0.70
    protected_attr_top_features_check: true  # Must NOT be in top 5
```

### 5.3 Compliance Validation

```yaml
compliance_checks:
  - check: "EU AI Act high-risk documentation complete"
    required_fields:
      - intended_use
      - ethical_considerations.human_oversight
      - audit_trail
  
  - check: "Kenya Data Protection Act consent documented"
    required_fields:
      - training_data.sensitive_data
      - compliance.regulations[name='Kenya Data Protection Act']
  
  - check: "CBK model risk management"
    required_fields:
      - version_history
      - compliance.audit_trail
      - performance.confidence_intervals
```

---

## 6. Update Triggers

Model Cards are automatically updated when:

### 6.1 Version Changes

```yaml
triggers:
  - event: "New model version deployed"
    action: "Generate new model card with incremented version"
    fields_updated:
      - model_metadata.version
      - model_metadata.release_date
      - performance.*
      - fairness_metrics.*
      - version_history
  
  - event: "Model retraining completed"
    action: "Update performance and fairness metrics"
    fields_updated:
      - performance.*
      - fairness_metrics.*
      - training_data.date_range
      - model_architecture.training_details
```

### 6.2 Compliance Changes

```yaml
triggers:
  - event: "Compliance audit completed"
    action: "Update compliance status and audit dates"
    fields_updated:
      - compliance.regulations[].last_audit
      - compliance.regulations[].next_audit
      - compliance.regulations[].compliance_status
  
  - event: "Policy threshold updated"
    action: "Re-validate model against new thresholds"
    fields_updated:
      - compliance.internal_policies[].status
```

### 6.3 Drift Detection

```yaml
triggers:
  - event: "Drift threshold exceeded"
    action: "Flag model card with drift warning"
    fields_updated:
      - model_metadata.status  # production → degraded
      - ethical_considerations.known_limitations  # Append drift note
  
  - event: "Fairness drift detected"
    action: "Update fairness metrics and trigger compliance re-check"
    fields_updated:
      - fairness_metrics.*
      - compliance.internal_policies[].status
```

---

## 7. Integration Points

### 7.1 CI/CD Integration

```yaml
github_actions:
  workflow: ".github/workflows/governance-compliance.yml"
  triggers:
    - "push to main (ai_core/models/)"
    - "pull_request (model changes)"
  
  steps:
    - name: "Generate Model Card"
      script: "python ai_core/governance/model_card_generator.py"
      input: "training_logs/*.json"
      output: "model_cards/{model_id}_v{version}.json"
    
    - name: "Validate Compliance"
      script: "python ai_core/governance/compliance_checker.py"
      input: "model_cards/{model_id}_v{version}.json"
      output: "compliance_report.json"
    
    - name: "Upload to MongoDB"
      condition: "compliance_status == COMPLIANT"
      action: "POST /api/model-cards"
    
    - name: "Fail CI if non-compliant"
      condition: "compliance_status == FAIL"
      action: "exit 1"
```

### 7.2 Dashboard Integration

```yaml
frontend_pages:
  - path: "/governance/model-cards"
    component: "ModelCardsListPage"
    features:
      - "Grid view of all model cards"
      - "Filter by status, compliance, model type"
      - "Search by model name or ID"
  
  - path: "/governance/model-cards/:id"
    component: "ModelCardDetailPage"
    tabs:
      - "Overview (metadata, performance, summary)"
      - "Fairness (detailed fairness metrics, bias analysis)"
      - "Compliance (regulation alignment, audit history)"
      - "History (version timeline, change log)"
      - "Technical (architecture, training data, hyperparameters)"
```

### 7.3 Alert Integration

```yaml
alerts:
  - trigger: "Model Card compliance status changes to FAIL"
    channel: "Slack #alerts-compliance"
    message: "🚨 Model {model_name} v{version} failed compliance check: {violation_summary}"
    escalation: "Email to compliance-team@ethixai.com after 30 minutes"
  
  - trigger: "Fairness drift detected (threshold exceeded)"
    channel: "Slack #alerts-fairness"
    message: "⚠️ Fairness drift detected in {model_name}: {metric_name} changed by {delta}"
    action: "Auto-generate Model Card update with drift note"
```

---

## 8. Best Practices

### 8.1 Writing Model Cards

✅ **DO:**
- Use precise, quantifiable metrics (not "good accuracy" but "94% accuracy")
- Document known limitations honestly
- Include confidence intervals for metrics
- Provide context for fairness scores (industry benchmarks)
- Update cards immediately after model changes

❌ **DON'T:**
- Hide negative results or biases
- Use jargon without explanation
- Skip ethical considerations
- Forget to update version history
- Deploy models without compliant Model Cards

### 8.2 Maintenance

```yaml
maintenance_schedule:
  monthly:
    - "Re-calculate fairness metrics on fresh data"
    - "Check for new regulatory requirements"
    - "Review ethical considerations for emerging issues"
  
  quarterly:
    - "Comprehensive compliance audit"
    - "Stakeholder review of Model Cards"
    - "Update training data summary with latest statistics"
  
  annually:
    - "Full model re-evaluation"
    - "External audit coordination"
    - "Compliance policy refresh"
```

---

## 9. Example Use Cases

### 9.1 Regulatory Audit

**Scenario:** Kenya Data Protection Commissioner requests documentation for credit scoring model.

**Response:**
1. Export Model Card as PDF (generated from Markdown)
2. Include compliance section with Kenya Data Protection Act alignment
3. Provide audit trail logs (last 12 months)
4. Attach version history showing bias mitigation improvements

**Outcome:** Audit passed with commendation for transparency.

---

### 9.2 Client Transparency

**Scenario:** Bank client questions why loan application was rejected.

**Response:**
1. Show client-facing Model Card summary (simplified Markdown)
2. Highlight SHAP explanation for their specific application
3. Reference fairness metrics to demonstrate non-discriminatory decision
4. Provide human review contact for escalation

**Outcome:** Client satisfied with transparency, no formal complaint.

---

### 9.3 Internal Model Selection

**Scenario:** ML team evaluating 3 candidate models for production deployment.

**Response:**
1. Generate Model Cards for all 3 candidates
2. Compare side-by-side: accuracy, fairness metrics, compliance status
3. Dashboard visualization showing tradeoffs (accuracy vs fairness)
4. Compliance Checker auto-flags Model B as non-compliant (disparate impact ratio 0.72)

**Decision:** Deploy Model A (best balance of accuracy 93% and fairness compliance).

---

## 10. Future Enhancements

### 10.1 Roadmap (Post Day 23)

```yaml
planned_features:
  - name: "Automated Model Card Comparison Tool"
    priority: "High"
    description: "Side-by-side comparison of 2+ model cards with visual diff"
  
  - name: "Client-Facing Model Card API"
    priority: "Medium"
    description: "Public API endpoint with redacted sensitive info for transparency"
  
  - name: "Model Card Templates by Industry"
    priority: "Medium"
    description: "Pre-filled templates for Banking, Healthcare, Insurance"
  
  - name: "Multilingual Model Cards"
    priority: "Low"
    description: "Support for Swahili, French translations (Kenya, East Africa expansion)"
  
  - name: "Interactive Model Card Explorer"
    priority: "High"
    description: "Frontend component for drilling into metrics, comparing versions"
```

---

## 11. Appendix

### 11.1 Glossary

| Term | Definition |
|------|------------|
| **Demographic Parity** | Equal positive outcome rates across protected groups |
| **Disparate Impact** | Ratio of positive outcome rates (80% rule for compliance) |
| **Equal Opportunity** | Equal true positive rates across protected groups |
| **SHAP** | SHapley Additive exPlanations - method for explaining individual predictions |
| **Protected Attribute** | Sensitive feature requiring fairness monitoring (gender, race, age, etc.) |
| **Calibration** | Alignment between predicted probabilities and actual outcomes |
| **Intersectional Bias** | Bias affecting combinations of protected groups (e.g., Black women) |

### 11.2 References

- **Google Model Cards:** https://modelcards.withgoogle.com/about
- **Hugging Face Model Cards:** https://huggingface.co/docs/hub/model-cards
- **EU AI Act (2024):** https://artificialintelligenceact.eu/
- **Kenya Data Protection Act (2019):** https://www.odpc.go.ke/dpa-act/
- **Fairlearn Documentation:** https://fairlearn.org/
- **SHAP Documentation:** https://shap.readthedocs.io/

---

**Document Status:** ✅ APPROVED  
**Next Review:** February 18, 2025  
**Owner:** AI Governance Lead  
**Stakeholders:** ML Team, Compliance, Legal, Product
