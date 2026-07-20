# Fairness Metrics Reference

## Overview

This document provides a comprehensive reference for all fairness metrics calculated by the Model Validation Engine (MVE). Each metric measures a different aspect of model fairness and bias.

---

## 1. Disparate Impact (80% Rule)

### Definition
Measures whether a model's approval rates differ significantly across demographic groups. Based on the **80% rule** from U.S. employment law.

### Formula
```
Disparate Impact Ratio = (Approval Rate Protected Group) / (Approval Rate Non-Protected Group)
```

### Thresholds
- **Acceptable**: ≥ 0.80 (passes 80% rule)
- **Warning**: 0.70 - 0.79
- **Critical**: < 0.70

### Interpretation
- **1.0**: Perfect parity (equal approval rates)
- **0.80**: Minimum legal threshold
- **0.50**: Protected group approved at half the rate of non-protected group

### Example
```
Approval Rate (Female) = 60%
Approval Rate (Male) = 80%
Disparate Impact = 0.60 / 0.80 = 0.75 → WARNING
```

### Recommendations for Low Scores
- Review feature importance for protected attributes
- Check for correlated features (e.g., job title correlates with gender)
- Retrain with fairness constraints (e.g., demographic parity constraint)
- Adjust decision thresholds per group to equalize approval rates

---

## 2. Equal Opportunity

### Definition
Ensures that **qualified applicants** (those who should be approved) have equal True Positive Rates (TPR) across demographic groups.

### Formula
```
TPR_group = (True Positives) / (True Positives + False Negatives)
Equal Opportunity Score = 1 - max(|TPR_group_i - TPR_group_j|)
```

### Thresholds
- **Acceptable**: ≥ 0.85 (max TPR difference ≤ 15%)
- **Warning**: 0.75 - 0.84
- **Critical**: < 0.75

### Interpretation
- **1.0**: All groups have identical TPR (perfect equal opportunity)
- **0.85**: Max 15% TPR difference across groups
- **0.60**: One group has 40% lower TPR than another

### Example
```
TPR (Age 18-35) = 85%
TPR (Age 66+) = 65%
Equal Opportunity = 1 - |0.85 - 0.65| = 1 - 0.20 = 0.80 → WARNING
```

### Recommendations for Low Scores
- Investigate why qualified applicants from certain groups are rejected
- Review false negative rates per group
- Consider per-group calibration
- Ensure training data represents all groups equally

---

## 3. Demographic Parity

### Definition
Measures whether positive outcome rates (approval rates) are similar across all demographic groups, regardless of qualification.

### Formula
```
Positive_Rate_group = (Positive Outcomes) / (Total Cases)
Demographic Parity Score = 1 - max(|Positive_Rate_i - Positive_Rate_j|)
```

### Thresholds
- **Acceptable**: ≥ 0.80 (max 20% rate difference)
- **Warning**: 0.70 - 0.79
- **Critical**: < 0.70

### Interpretation
- **1.0**: All groups have identical positive outcome rates
- **0.80**: Max 20% difference in approval rates
- **0.50**: One group has 50% lower approval rate

### Example
```
Approval Rate (Ethnicity A) = 70%
Approval Rate (Ethnicity B) = 50%
Demographic Parity = 1 - |0.70 - 0.50| = 1 - 0.20 = 0.80 → ACCEPTABLE
```

### Recommendations for Low Scores
- Similar to disparate impact recommendations
- Consider if equal outcome rates are appropriate for your use case
- Balance with equal opportunity (sometimes these metrics conflict)

---

## 4. Consistency

### Definition
Measures variance in model predictions for applicants with **similar financial profiles**. High variance indicates instability and potential bias.

### Formula
```
1. Group applicants by financial similarity (income, credit score, debt)
2. Calculate variance of risk scores within each group
3. Consistency Score = 1 - normalized_variance
```

### Thresholds
- **Acceptable**: ≥ 0.80 (low variance)
- **Warning**: 0.70 - 0.79
- **Critical**: < 0.70 (high variance)

### Interpretation
- **1.0**: Identical risk scores for similar profiles
- **0.80**: Some variance, but within acceptable bounds
- **0.50**: High variance, model is inconsistent

### Example
```
Similar applicants (income $60K, credit 720):
- Applicant A: Risk Score 45
- Applicant B: Risk Score 75
High variance → Low consistency score → Model is unstable
```

### Recommendations for Low Scores
- Review feature interactions (are non-financial features causing variance?)
- Check for overfitting
- Consider ensemble methods for stability
- Regularize model to reduce sensitivity

---

## 5. Stability

### Definition
Tests model **robustness** by injecting small random noise into inputs and measuring how much predictions change.

### Noise Injection
- **Financial values**: ±5% (income, debt, savings)
- **Credit score**: ±5 points
- **Age**: ±1 year
- **Loan amount**: ±3%

### Formula
```
Stability Score = 1 - mean(|original_score - noisy_score|) / 100
```

### Thresholds
- **Acceptable**: ≥ 0.85 (mean score change ≤ 15 points)
- **Warning**: 0.75 - 0.84
- **Critical**: < 0.75 (mean score change > 25 points)

### Interpretation
- **1.0**: Predictions unchanged with noise
- **0.85**: Average score change ≤ 15 points
- **0.60**: Average score change 40 points (highly unstable)

### Example
```
Original Risk Score: 65
After noise (income +3%, age +1): Risk Score 78
Score Change: 13 points → Acceptable
```

### Recommendations for Low Scores
- Model is too sensitive to minor input variations
- Apply regularization (L1/L2)
- Use ensemble methods (bagging, boosting)
- Increase training data
- Feature scaling improvements

---

## 6. Rule Violation Severity

### Definition
Measures how often the model triggers **ethical rule violations** (e.g., high-risk flagging based on protected attributes).

### Formula
```
1. Count rule violations per evaluation
2. Calculate severity based on rule importance and frequency
3. Normalize to 0-100 scale
```

### Thresholds
- **Acceptable**: ≥ 0.90 (< 10% violation rate)
- **Warning**: 0.80 - 0.89
- **Critical**: < 0.80 (> 20% violation rate)

### Common Rule Violations
- **Age Discrimination**: Flagging elderly applicants as high-risk solely due to age
- **Gender Bias**: Different risk scores for identical profiles except gender
- **Disability Penalty**: Higher risk scores for applicants with disabilities
- **Ethnic Profiling**: Risk score correlated with ethnicity

### Example
```
200 test cases
- 15 violations (age-based high-risk)
- Violation rate: 7.5%
Rule Violation Score = 1 - 0.075 = 0.925 → ACCEPTABLE
```

### Recommendations for High Violations
- Audit ethical rules implementation
- Remove or reduce weight of protected attributes
- Add fairness constraints to training
- Consider removing biased features

---

## Overall Fairness Score

### Calculation
The overall fairness score is a **weighted average** of all individual metrics:

```
Overall Score = (
  Disparate Impact × 0.20 +
  Equal Opportunity × 0.20 +
  Demographic Parity × 0.15 +
  Consistency × 0.15 +
  Stability × 0.15 +
  Rule Violations × 0.15
) × 100
```

### Thresholds
- **Pass**: ≥ 80
- **Conditional Pass**: 60 - 79
- **Fail**: < 60 OR any critical metric

### Interpretation
- **≥ 90**: Excellent fairness, production-ready
- **80-89**: Good fairness, minor improvements recommended
- **60-79**: Acceptable with warnings, monitor closely
- **< 60**: Unacceptable, DO NOT deploy

---

## Metric Relationships

### Complementary Metrics
- **Disparate Impact + Demographic Parity**: Both measure outcome parity
- **Equal Opportunity + Rule Violations**: Both ensure qualified applicants are treated fairly

### Conflicting Metrics
- **Equal Opportunity vs Demographic Parity**: Sometimes you can't achieve both
  - Equal opportunity: Fair treatment of qualified applicants
  - Demographic parity: Equal outcomes regardless of qualification
  - Trade-off: Choose based on your ethical framework

### Independence
- **Consistency + Stability**: Measure model quality, not bias
  - Can have high fairness but low consistency/stability
  - Both are important for production reliability

---

## Metric Selection Guide

### Use Case: Loan Approval
**Priority Metrics**: Disparate Impact, Equal Opportunity, Rule Violations  
**Rationale**: Legal compliance (80% rule), ensure qualified borrowers aren't rejected due to bias

### Use Case: Risk Scoring
**Priority Metrics**: Consistency, Stability, Equal Opportunity  
**Rationale**: Risk scores must be reliable and fair for qualified applicants

### Use Case: Regulatory Compliance
**Priority Metrics**: All metrics, with Rule Violations highest priority  
**Rationale**: Comprehensive fairness assessment for audits

---

## Advanced Topics

### Per-Attribute Analysis
MVE calculates each metric for multiple sensitive attributes:
- Gender
- Ethnicity
- Age
- Disability status

This provides **granular insights** into which groups are affected.

### Intersectionality
Future enhancement: Analyze fairness for intersectional groups (e.g., "young Black women")

### Temporal Drift
Future enhancement: Track metric changes over time to detect model degradation

---

## References

- [Fairness Definitions Explained](https://fairware.cs.umass.edu/papers/Verma.pdf) - Survey of fairness metrics
- [NIST AI 100-1: Identifying and Managing Bias](https://doi.org/10.6028/NIST.SP.1270)
- [Google's What-If Tool](https://pair-code.github.io/what-if-tool/) - Interactive fairness exploration
- [Fairlearn Documentation](https://fairlearn.org/main/user_guide/assessment.html)

---

**Last Updated**: Day 19  
**Maintainer**: EthixAI Team
