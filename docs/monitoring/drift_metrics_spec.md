# Drift Metrics Specification

**EthixAI Model Monitoring System**  
**Version**: 1.0  
**Last Updated**: November 18, 2025

## Overview

This document defines all drift metrics used by EthixAI to monitor model behavior, data quality, and fairness in production. These metrics detect when models deviate from baseline behavior and trigger alerts before harm occurs.

---

## 1. Data Drift Metrics

Data drift occurs when the input distribution changes from the training or baseline distribution.

### 1.1 Population Stability Index (PSI)

**Purpose**: Detect distribution shifts in numerical and categorical features.

**Formula**:
```
PSI = Σ (Actual% - Expected%) × ln(Actual% / Expected%)
```

**Interpretation**:
- **PSI < 0.10**: Stable, no significant change
- **0.10 ≤ PSI < 0.25**: Warning, moderate drift detected
- **PSI ≥ 0.25**: Critical, severe drift requiring action

**Thresholds**:
| Severity | PSI Range | Action |
|----------|-----------|--------|
| INFO | < 0.10 | Log only |
| WARNING | 0.10 - 0.24 | Alert monitoring team |
| CRITICAL | ≥ 0.25 | Trigger incident, recommend retraining |

**Computed Per**: Each numerical and categorical feature

**Frequency**: Daily for high-risk models, weekly for medium-risk

### 1.2 Kullback-Leibler (KL) Divergence

**Purpose**: Measure relative entropy between baseline and current distributions.

**Formula**:
```
KL(P||Q) = Σ P(x) × log(P(x) / Q(x))
```

**Interpretation**:
- **KL < 0.10**: Stable
- **0.10 ≤ KL < 0.30**: Warning
- **KL ≥ 0.30**: Critical

**Thresholds**:
| Severity | KL Range | Action |
|----------|----------|--------|
| INFO | < 0.10 | Log only |
| WARNING | 0.10 - 0.29 | Alert team |
| CRITICAL | ≥ 0.30 | Incident + retraining |

**Computed Per**: Numerical features with continuous distributions

**Frequency**: Daily for high-risk, weekly for medium-risk

### 1.3 Wasserstein Distance (Earth Mover's Distance)

**Purpose**: Robust measure of distribution difference, especially for distributions with different support.

**Formula**:
```
W(P,Q) = inf E[||X-Y||]
```

**Interpretation**:
- More robust than KL when distributions have non-overlapping support
- Normalized by feature range for comparability

**Thresholds**:
| Severity | Normalized Distance | Action |
|----------|---------------------|--------|
| INFO | < 0.15 | Log only |
| WARNING | 0.15 - 0.30 | Alert team |
| CRITICAL | > 0.30 | Incident |

**Computed Per**: Numerical features

**Frequency**: Weekly

### 1.4 Category Frequency Shift

**Purpose**: Detect changes in categorical feature distributions.

**Metrics**:
- **New Categories Appeared**: Count of unseen categories
- **Category Proportion Shift**: Max change in any category frequency
- **Rare Category Surge**: Categories with <1% now >5%

**Thresholds**:
| Metric | WARNING | CRITICAL |
|--------|---------|----------|
| New Categories | ≥2% of samples | ≥5% of samples |
| Proportion Shift | ≥15% | ≥25% |
| Rare Surge | Any occurrence | n/a |

**Computed Per**: Categorical features (gender, loan_type, employment_status)

**Frequency**: Daily

### 1.5 Missing Value Density Change

**Purpose**: Detect sudden increases in missing data.

**Metric**: Change in null rate per feature

**Thresholds**:
| Severity | Null Rate Increase | Action |
|----------|-------------------|--------|
| INFO | < 5% | Log |
| WARNING | 5% - 15% | Alert |
| CRITICAL | > 15% | Incident + data quality review |

**Computed Per**: All features

**Frequency**: Daily

---

## 2. Model Drift Metrics

Model drift occurs when the model's behavior changes over time.

### 2.1 Prediction Distribution Drift

**Purpose**: Detect shifts in model output distribution.

**Metrics**:
- **KL Divergence** on prediction probabilities
- **Class Distribution Shift**: Change in proportion of each predicted class
- **Sudden Spikes**: Any class >2× baseline frequency

**Thresholds**:
| Metric | WARNING | CRITICAL |
|--------|---------|----------|
| Output KL | ≥ 0.15 | ≥ 0.30 |
| Class Shift | ≥ 20% | ≥ 40% |
| Spike | 2× baseline | 3× baseline |

**Frequency**: Daily

### 2.2 Accuracy Drift (When Ground Truth Available)

**Purpose**: Track model performance degradation.

**Metrics**:
- **Accuracy Delta**: Current accuracy vs baseline
- **Per-Class F1 Delta**: F1 score change per class
- **False Positive Rate Increase**

**Thresholds**:
| Metric | WARNING | CRITICAL |
|--------|---------|----------|
| Accuracy Drop | > 5% | > 10% |
| F1 Drop (any class) | > 8% | > 15% |
| FPR Increase | > 3% | > 5% |

**Frequency**: Weekly (depends on label availability)

### 2.3 Output Entropy Change

**Purpose**: Detect confidence drift (model becoming more/less confident).

**Formula**:
```
Entropy = -Σ p(c) × log(p(c))
```

**Thresholds**:
| Change Type | WARNING | CRITICAL |
|-------------|---------|----------|
| Entropy Drop | > 20% (overconfident) | > 40% |
| Entropy Increase | > 30% (underconfident) | > 50% |

**Frequency**: Daily

### 2.4 Prediction Volatility

**Purpose**: Detect unstable predictions (same input → different output).

**Metric**: Standard deviation of predictions for similar inputs

**Thresholds**:
| Severity | Std Dev Increase | Action |
|----------|-----------------|--------|
| WARNING | > 25% | Alert |
| CRITICAL | > 50% | Incident |

**Frequency**: Weekly

---

## 3. Fairness Drift Metrics

Fairness drift detects when bias grows over time.

### 3.1 Demographic Parity Drift

**Purpose**: Monitor selection rate differences across protected groups.

**Formula**:
```
DP_Drift = |DP_current - DP_baseline|
where DP = |P(Ŷ=1|A=0) - P(Ŷ=1|A=1)|
```

**Thresholds**:
| Severity | DP Drift | Action |
|----------|----------|--------|
| INFO | < 0.05 | Log |
| WARNING | 0.05 - 0.10 | Alert fairness team |
| CRITICAL | > 0.10 | **Incident + model freeze** |

**Protected Attributes**: gender, age_group, race (if available)

**Frequency**: **Daily** (high priority)

### 3.2 Equal Opportunity Drift

**Purpose**: Monitor TPR differences across groups.

**Formula**:
```
EOD_Drift = |EOD_current - EOD_baseline|
where EOD = |TPR(A=0) - TPR(A=1)|
```

**Thresholds**:
| Severity | EOD Drift | Action |
|----------|-----------|--------|
| INFO | < 0.05 | Log |
| WARNING | 0.05 - 0.10 | Alert |
| CRITICAL | > 0.10 | **Incident** |

**Frequency**: **Daily**

### 3.3 Disparate Impact Ratio Drift

**Purpose**: Track selection rate ratio changes.

**Formula**:
```
DI_Drift = |DI_current - DI_baseline|
where DI = P(Ŷ=1|A=minority) / P(Ŷ=1|A=majority)
```

**Compliance Threshold**: DI < 0.80 is considered discriminatory (80% rule)

**Thresholds**:
| Severity | DI Value | Action |
|----------|----------|--------|
| INFO | ≥ 0.90 | Log |
| WARNING | 0.80 - 0.89 | Alert |
| CRITICAL | < 0.80 | **Compliance breach + incident** |

**Frequency**: **Daily**

### 3.4 Group Accuracy Drift

**Purpose**: Detect when model becomes less accurate for specific groups.

**Formula**:
```
Accuracy_Gap = max(|Acc(group_i) - Acc(group_j)|)
```

**Thresholds**:
| Severity | Gap Increase | Action |
|----------|-------------|--------|
| WARNING | > 5% | Alert |
| CRITICAL | > 10% | Incident |

**Frequency**: Weekly (when labels available)

---

## 4. Explanation Drift Metrics

Explanation drift detects when SHAP values or feature importances change.

### 4.1 SHAP Distribution Drift

**Purpose**: Monitor changes in feature importance.

**Metrics**:
- **Top-3 Feature Stability**: Do top 3 features remain the same?
- **SHAP Value Distribution KL**: KL divergence on SHAP distributions
- **Feature Rank Correlation**: Spearman correlation of feature ranks

**Thresholds**:
| Metric | WARNING | CRITICAL |
|--------|---------|----------|
| Top-3 Change | 1 feature | 2+ features |
| SHAP KL | > 0.15 | > 0.30 |
| Rank Correlation | < 0.85 | < 0.70 |

**Frequency**: Weekly

### 4.2 Explanation Consistency

**Purpose**: Detect when similar inputs get different explanations.

**Metric**: Cosine similarity between SHAP vectors for similar inputs

**Thresholds**:
| Severity | Avg Similarity | Action |
|----------|---------------|--------|
| INFO | ≥ 0.80 | Log |
| WARNING | 0.60 - 0.79 | Alert |
| CRITICAL | < 0.60 | Incident |

**Frequency**: Weekly

---

## 5. Data Quality Drift Metrics

### 5.1 Schema Violations

**Metrics**:
- **Type Mismatches**: Expected int, received string
- **Range Violations**: Values outside expected range
- **Required Field Missing**: Critical fields null

**Thresholds**:
| Violation Type | WARNING | CRITICAL |
|---------------|---------|----------|
| Type Mismatch | > 1% | > 5% |
| Range Violation | > 2% | > 10% |
| Required Missing | Any | n/a |

**Frequency**: Real-time validation + daily aggregate

### 5.2 Feature Correlation Changes

**Purpose**: Detect multicollinearity drift.

**Metric**: Change in pairwise feature correlations

**Thresholds**:
| Change | WARNING | CRITICAL |
|--------|---------|----------|
| New High Correlation (>0.9) | Any pair | Multiple pairs |
| Correlation Drop | > 0.3 change | > 0.5 change |

**Frequency**: Weekly

---

## 6. Aggregated Drift Score

**Purpose**: Single metric summarizing overall drift.

**Formula**:
```
Drift_Score = w1×Data_Drift + w2×Model_Drift + w3×Fairness_Drift + w4×Explanation_Drift

Weights (w):
- Fairness: 0.40 (highest priority)
- Data: 0.30
- Model: 0.20
- Explanation: 0.10
```

**Thresholds**:
| Severity | Aggregated Score | Action |
|----------|-----------------|--------|
| INFO | < 0.15 | Monitor |
| WARNING | 0.15 - 0.30 | Alert team |
| CRITICAL | > 0.30 | **Trigger retraining workflow** |

**Frequency**: Daily

---

## 7. Monitoring Cadence Summary

| Model Risk | Data Drift | Fairness Drift | Model Drift | Explanation Drift |
|------------|-----------|----------------|-------------|-------------------|
| **High** | Daily | **Daily** | Daily | Weekly |
| **Medium** | Weekly | **Daily** | Weekly | Bi-weekly |
| **Low** | Bi-weekly | Weekly | Bi-weekly | Monthly |

**Note**: Fairness drift is always checked at least daily for all risk levels.

---

## 8. Compliance Mapping

| Metric | EU AI Act | Kenya Data Act | Banking Regulation |
|--------|-----------|----------------|-------------------|
| Fairness Drift | ✓ High-risk AI monitoring | ✓ Anti-discrimination | ✓ Fair lending |
| Data Drift | ✓ Data quality requirements | ✓ | ✓ Model validation |
| Accuracy Drift | ✓ Performance monitoring | | ✓ Stress testing |
| Explanation Drift | ✓ Transparency | ✓ Right to explanation | ✓ Audit trails |

---

## 9. Implementation Notes

**Storage**: All metric values stored in `monitoring_records` collection with:
- `metric_name`
- `metric_value`
- `severity`
- `timestamp`
- `model_id`
- `snapshot_id`

**Computation**: Drift analyzer worker runs as:
- Scheduled GitHub Actions workflow (free tier)
- Or backend cron job
- Or triggered by API

**Baseline Management**:
- Baselines updated after successful retraining
- Manual baseline resets allowed for concept drift
- Baseline snapshots stored with version control

---

## 10. References

- **PSI**: [Credit Risk Modeling Best Practices](https://www.listendata.com/2015/05/population-stability-index.html)
- **Fairness Metrics**: [Fairlearn Documentation](https://fairlearn.org/)
- **Wasserstein Distance**: SciPy stats module
- **EU AI Act**: [Regulatory Requirements](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)

---

**Next Steps**: See `monitoring_policy.md` for response procedures and `alerting_system_design.md` for notification workflows.
