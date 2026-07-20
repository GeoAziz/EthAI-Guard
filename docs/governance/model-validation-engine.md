# Model Validation Engine (MVE)

## Overview

The **Model Validation Engine (MVE)** is a comprehensive fairness testing framework that automatically generates synthetic test cases, evaluates AI models for bias, and produces detailed validation reports. It ensures that EthixAI models meet ethical AI standards before deployment.

## Key Features

### 🎯 Synthetic Data Generation
- **Diverse Test Cases**: Generates 100-500 synthetic applicant profiles spanning:
  - **Gender**: Male, Female, Non-binary, Prefer not to say
  - **Ethnicity**: African American, Asian, Caucasian, Hispanic, Native American, Pacific Islander, Multi-racial
  - **Age Brackets**: Young adult (18-25), Adult (26-35), Middle-aged (36-50), Senior (51-65), Elderly (66-80), Very elderly (80+)
  - **Disability Status**: None, Physical, Cognitive, Sensory, Mental health, Multiple
  - **Economic Status**: Very low income, Low income, Middle income, High income, Very high income

- **Edge Case Testing**: Automatically includes challenging scenarios:
  - Very young applicants with high income
  - Elderly applicants with low income
  - Applicants with multiple disadvantages
  - High credit score with high debt
  - Low income with high savings
  - Unstable employment history
  - Very short/long loan terms

### 📊 Fairness Metrics

The MVE calculates six core fairness metrics:

#### 1. **Disparate Impact** (80% Rule)
Measures the ratio of approval rates between protected and non-protected groups. Scores below 0.8 indicate potential discrimination.

**Formula**: `(Approval Rate Protected Group) / (Approval Rate Non-Protected Group)`

#### 2. **Equal Opportunity**
Measures True Positive Rate (TPR) differences across demographic groups. Ensures qualified applicants have equal chances regardless of protected attributes.

**Formula**: `1 - max(|TPR_group_i - TPR_group_j|)` across all group pairs

#### 3. **Demographic Parity**
Ensures positive outcome rates are similar across demographic groups, detecting systemic bias.

**Formula**: `1 - max(|Positive_Rate_group_i - Positive_Rate_group_j|)`

#### 4. **Consistency**
Measures variance in risk scores for applicants with similar financial profiles, detecting model instability.

**Formula**: `1 - normalized_variance(similar_profiles)`

#### 5. **Stability**
Tests model robustness by injecting small noise (±5% financial values, ±1 age, ±5 credit score) and measuring score volatility.

**Formula**: `1 - mean_absolute_difference(original_scores, noisy_scores) / 100`

#### 6. **Rule Violation Severity**
Tracks ethical rule violations and calculates severity based on high-risk flagging of protected groups.

**Formula**: Based on triggered rules and their impact on protected groups

### 🛡️ Validation Pipeline

```
1. Generate Synthetic Dataset
   ↓
2. Run Evaluations Through Model
   ↓
3. Compute Fairness Metrics
   ↓
4. Generate Validation Report
   ↓
5. Store in Firestore
   ↓
6. Display in Dashboard
```

### 📄 Validation Reports

Each validation generates a comprehensive report containing:

- **Overall Status**: Pass / Conditional Pass / Fail
- **Fairness Score**: 0-100 aggregate fairness rating
- **Confidence Score**: Statistical confidence based on sample size and success rate
- **Metric Details**: Individual scores with thresholds and explanations
- **Recommendations**: Actionable steps to address fairness issues
- **Dataset Statistics**: Distribution of synthetic test cases
- **Exportable Formats**: JSON and HTML

### 🎨 Dashboard

The validation dashboard provides:

- **List View**: All validation reports with status, scores, and timestamps
- **Detail View**: Full report with collapsible sections:
  - Status overview with color-coded badges
  - Metric cards with progress bars
  - Recommendations with severity indicators
  - Dataset statistics
  - Raw JSON export

- **Run New Validation**: Interactive form to trigger validations with configurable parameters:
  - Model name and version
  - Number of synthetic cases (100-500)
  - Edge case inclusion
  - Stability testing

## Architecture

### Components

#### AI Core (`ai_core/`)
- **`synthetic/generator.py`**: Synthetic data generation engine
- **`validation/metrics.py`**: Fairness metrics calculator
- **`validation/validator.py`**: Validation pipeline orchestrator
- **`validation/report.py`**: Report generation (JSON/HTML)
- **`routers/validation.py`**: FastAPI endpoint (`POST /validation/validate-model`)

#### Backend (`backend/src/`)
- **`routes/validation.js`**: Express routes for validation management
  - `POST /v1/validate-model`: Trigger validation
  - `GET /v1/validation-reports`: List reports
  - `GET /v1/validation-reports/:id`: Get report details
- Firestore integration for persistent storage

#### Frontend (`frontend/src/app/validation/`)
- **`page.tsx`**: Validation list page with run validation form
- **`[id]/page.tsx`**: Validation detail page with full report display

#### Firestore
- **`validation_reports` collection**: Stores validation results
- **Security Rules**: Per-user read/write access
- **Indexes**: Optimized queries by user_id, status, model_name, created_at

## Security

### Data Privacy
- **User Isolation**: Firestore rules enforce user_id matching for all CRUD operations
- **Synthetic Data**: No real PII in test cases, randomly generated profiles
- **Audit Trail**: All validations timestamped and attributed to users

### Access Control
- **Authentication Required**: Firebase Auth middleware on all validation routes
- **Per-User Visibility**: Users can only access their own validation reports
- **Rate Limiting**: Global rate limiter prevents abuse

## Cost Analysis (Firebase Free Tier)

### Firestore Operations
- **Writes**: 1 document per validation (~200 validations/day = 6K writes/month ✅ within 20K limit)
- **Reads**: ~10-50 reads per dashboard load, ~500 reads/day = 15K reads/month ✅ within 50K limit)
- **Storage**: ~100KB per report × 200 reports = 20MB ✅ within 1GB limit)

### Compute
- **AI Core**: Validation takes ~30-60 seconds for 200 cases (depends on evaluation complexity)
- **Backend**: Minimal processing, mainly proxying to AI Core

**Estimated Cost**: $0/month on free tier with moderate usage (<200 validations/month)

## Performance

### Validation Timing
- **100 cases**: ~15-30 seconds
- **200 cases**: ~30-60 seconds
- **500 cases**: ~75-150 seconds

### Optimization Strategies
- Synthetic data generation is fast (<1 second for 500 cases)
- Bottleneck is model evaluation pipeline
- Stability testing doubles evaluation time (runs twice)
- Can be run asynchronously in production

## Usage Examples

### Running a Validation

**Frontend**:
```typescript
// Navigate to /validation
// Fill form: Model Name, Version, Number of Cases
// Click "Run Validation"
// Report appears in list after completion
```

**Backend API**:
```bash
curl -X POST http://localhost:5000/v1/validate-model \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "EthicalLoanDecisionAI",
    "model_version": "1.0",
    "num_synthetic_cases": 200,
    "include_edge_cases": true,
    "include_stability_test": true
  }'
```

**AI Core Direct**:
```bash
curl -X POST http://localhost:8000/validation/validate-model \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "EthicalLoanDecisionAI",
    "model_version": "1.0",
    "num_synthetic_cases": 200
  }'
```

### Interpreting Results

#### Pass (≥80 Fairness Score)
- ✅ All metrics within acceptable thresholds
- Model ready for production
- Continue quarterly monitoring

#### Conditional Pass (60-79 Fairness Score)
- ⚠️ Some warnings detected
- Review specific metric issues
- Consider retraining or threshold adjustments
- Safe for production with monitoring

#### Fail (<60 Fairness Score or Critical Issues)
- ❌ Critical fairness violations detected
- DO NOT deploy to production
- Address specific recommendations
- Re-run validation after fixes

## Best Practices

### When to Validate
- ✅ Before initial model deployment
- ✅ After retraining with new data
- ✅ Quarterly for production models
- ✅ After major feature changes
- ✅ When fairness complaints arise

### Test Case Configuration
- **Initial Testing**: 200 cases with edge cases and stability test
- **Quick Checks**: 100 cases without stability test
- **Comprehensive Audits**: 500 cases with all options enabled

### Addressing Failures
1. **Review Recommendations**: Start with actionable suggestions in report
2. **Inspect Triggered Rules**: Check which ethical rules are violated
3. **Analyze Distributions**: Look at synthetic dataset statistics
4. **Retrain with Fairness Constraints**: Use techniques like adversarial debiasing
5. **Adjust Decision Thresholds**: Calibrate per-group thresholds if needed
6. **Re-validate**: Run validation again after changes

## Troubleshooting

### Common Issues

**Issue**: Validation times out
- **Solution**: Reduce `num_synthetic_cases` or disable `include_stability_test`

**Issue**: Low confidence score
- **Solution**: Increase `num_synthetic_cases` (higher sample size = higher confidence)

**Issue**: All metrics show "critical"
- **Solution**: Model may have fundamental bias issues, review training data

**Issue**: Cannot access validation report
- **Solution**: Ensure Firebase Auth token is valid and report belongs to current user

## Future Enhancements

- [ ] Batch validation for multiple models
- [ ] Historical trend analysis (compare validations over time)
- [ ] Custom metric thresholds per organization
- [ ] PDF export with charts
- [ ] Email notifications for validation completion
- [ ] Slack/Teams integration for alerts
- [ ] Model comparison view (side-by-side metrics)
- [ ] A/B testing framework for model variants

## References

- [Fairlearn: Fairness in ML](https://fairlearn.org/)
- [Google's AI Principles](https://ai.google/principles/)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [80% Rule (Disparate Impact)](https://en.wikipedia.org/wiki/Disparate_impact)

---

**Last Updated**: Day 19  
**Maintainer**: EthixAI Team
