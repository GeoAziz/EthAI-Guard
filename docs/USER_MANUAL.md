# EthixAI User Manual

**Version:** 1.0  
**Last Updated:** Day 25  
**Target Audience:** End Users, Analysts, Compliance Officers

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Running Your First Analysis](#running-your-first-analysis)
5. [Understanding Results](#understanding-results)
6. [Advanced Features](#advanced-features)
7. [Reports & Export](#reports--export)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## 1. Introduction

### What is EthixAI?

EthixAI is an ethical AI governance platform that helps organizations:
- **Detect bias** in machine learning models
- **Explain** AI decisions with transparency
- **Ensure compliance** with fairness regulations
- **Monitor** model performance over time

### Who Should Use EthixAI?

- **Data Scientists:** Validate model fairness before deployment
- **Compliance Officers:** Audit AI systems for regulatory compliance
- **Business Analysts:** Understand AI decision patterns
- **Executives:** Get high-level fairness reports

### Key Benefits

✅ **Reduce Risk** - Catch bias before models go to production  
✅ **Build Trust** - Explain AI decisions to stakeholders  
✅ **Save Time** - Automated analysis in seconds  
✅ **Stay Compliant** - Audit trail for regulators  

---

## 2. Getting Started

### System Requirements

- **Browser:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Internet Connection:** Required for cloud version
- **Screen Resolution:** 1280x720 minimum (1920x1080 recommended)

### Accessing EthixAI

**Cloud Version:**
1. Navigate to `https://ethixai.yourdomain.com`
2. Create an account or log in
3. Accept terms of service

**Self-Hosted Version:**
1. Ensure Docker and Docker Compose are installed
2. Clone the repository
3. Run `docker-compose up -d`
4. Access at `http://localhost:3000`

### Creating Your Account

1. Click **Sign Up** on the homepage
2. Enter your details:
   - Email address
   - Strong password (8+ characters, mixed case, numbers, symbols)
   - Organization name (optional)
3. Verify your email (check spam folder)
4. Log in with your credentials

### First Login

Upon first login, you'll see:
- **Welcome Tour** - 2-minute walkthrough of key features
- **Sample Dataset** - Pre-loaded credit scoring example
- **Quick Start Guide** - Step-by-step tutorial

---

## 3. Dashboard Overview

### Main Navigation

```
┌──────────────────────────────────────────────────────┐
│  [Logo] EthixAI                     [User] [Logout]  │
├──────────────────────────────────────────────────────┤
│  📊 Dashboard  |  📈 Analyze  |  📄 Reports  |  ⚙️ Settings
└──────────────────────────────────────────────────────┘
```

### Dashboard Sections

#### 1. **Overview Panel** (Top)
- **Total Analyses:** Count of all analyses run
- **Recent Activity:** Last 5 analyses
- **Success Rate:** Percentage of successful analyses
- **Avg Analysis Time:** Average processing time

#### 2. **Quick Actions** (Left Sidebar)
- ➕ **New Analysis** - Start a new bias detection
- 📤 **Upload Dataset** - Import your data
- 📊 **View Reports** - Access past reports
- 📖 **Documentation** - Help resources

#### 3. **Recent Analyses** (Center)

| Date | Model Type | Status | Fairness Score | Actions |
|------|-----------|--------|---------------|---------|
| 2024-01-15 | Credit Scoring | ✅ Completed | 87/100 | View • Export |
| 2024-01-14 | Loan Approval | ⚠️ Issues Found | 62/100 | View • Export |

#### 4. **Insights Panel** (Right)
- **Bias Alerts:** Models flagged for unfair treatment
- **Trending Metrics:** Performance over time
- **Recommendations:** Suggested improvements

---

## 4. Running Your First Analysis

### Step 1: Prepare Your Data

**Required Format:** CSV, JSON, or Excel

**Minimum Requirements:**
- At least 100 rows (1000+ recommended)
- One target column (the outcome you're predicting)
- At least one protected attribute (gender, race, age, etc.)
- Numeric or categorical features

**Example Dataset Structure:**

```csv
age,gender,income,credit_score,approved
35,Male,75000,720,1
42,Female,68000,680,0
28,Male,52000,650,1
...
```

### Step 2: Upload Your Dataset

1. Click **📈 Analyze** in the main navigation
2. Click **Upload Dataset** button
3. Select your file (max 50MB)
4. Wait for upload confirmation
5. Preview your data in the table

**Data Preview:**
- First 10 rows displayed
- Column types auto-detected
- Missing values highlighted

### Step 3: Configure Analysis

#### Select Model Type

Choose the type of model you're analyzing:

| Model Type | Use Case | Example |
|-----------|----------|---------|
| **Credit Scoring** | Loan approval decisions | Credit card applications |
| **Hiring** | Candidate screening | Resume filtering |
| **Insurance Pricing** | Premium calculation | Auto insurance rates |
| **Healthcare** | Treatment recommendations | Patient risk assessment |
| **Custom** | Other use cases | Define your own |

#### Specify Protected Attributes

Select attributes that should NOT influence decisions:

- ☐ **Gender** (Male, Female, Non-binary)
- ☐ **Race/Ethnicity** (White, Black, Hispanic, Asian, Other)
- ☐ **Age** (Grouped: 18-25, 26-35, 36-50, 51-65, 65+)
- ☐ **Religion**
- ☐ **Disability Status**
- ☐ **Marital Status**

💡 **Tip:** Select all attributes protected by law in your jurisdiction (e.g., Title VII in US, GDPR in EU)

#### Select Target Column

Choose the outcome variable:
- **Binary:** Approved/Denied, Hired/Not Hired
- **Multi-class:** Low/Medium/High risk
- **Continuous:** Credit score, premium amount

#### Advanced Options (Optional)

<details>
<summary>Click to expand</summary>

**Fairness Metrics:**
- ☑️ Statistical Parity
- ☑️ Equal Opportunity
- ☑️ Predictive Parity
- ☐ Calibration

**Explainability:**
- ☑️ SHAP Values (recommended)
- ☐ LIME
- ☐ Feature Importance

**Sensitivity:**
- Threshold: 0.80 (default)
- Significance Level: 0.05
- Min Sample Size: 30 per group

</details>

### Step 4: Run Analysis

1. Review your configuration
2. Click **🚀 Run Analysis** button
3. Wait for processing (typically 10-30 seconds)
4. View real-time progress:
   - 📥 Loading data (2s)
   - 🔍 Detecting bias (8s)
   - 🧠 Generating explanations (12s)
   - 📊 Creating visualizations (3s)

**Processing Time Estimates:**

| Dataset Size | Estimated Time |
|-------------|---------------|
| < 1,000 rows | 5-10 seconds |
| 1,000-10,000 | 10-30 seconds |
| 10,000-100,000 | 30-90 seconds |
| 100,000+ | 1-3 minutes |

---

## 5. Understanding Results

### Results Overview

After analysis completes, you'll see:

```
┌─────────────────────────────────────────────────────┐
│  Analysis Results: Credit Scoring Model             │
│  Date: 2024-01-15 10:30 AM                         │
│  Status: ✅ Completed                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🎯 OVERALL FAIRNESS SCORE: 73/100                  │
│                                                     │
│  ⚠️ 2 Issues Found    ✅ 4 Tests Passed            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Fairness Score Interpretation

| Score | Meaning | Action |
|-------|---------|--------|
| **90-100** | ✅ Excellent - No bias detected | Monitor regularly |
| **75-89** | ✅ Good - Minor issues | Review and improve |
| **60-74** | ⚠️ Fair - Moderate bias | Action required |
| **< 60** | ❌ Poor - Significant bias | Immediate action needed |

### Bias Detection Results

#### Statistical Parity

**What it measures:** Are outcomes distributed equally across groups?

**Example:**
```
Approval Rates by Gender:
• Male:   72% (720 approved / 1,000 total)
• Female: 65% (650 approved / 1,000 total)

⚠️ BIAS DETECTED
Difference: 7 percentage points
Threshold: 5 percentage points
Status: FAIL
```

**What this means:** Males are approved 7% more often than females, exceeding the 5% fairness threshold.

**Recommended Action:**
1. Review features correlated with gender
2. Check if gender is a proxy feature
3. Consider fairness constraints in model training

#### Equal Opportunity

**What it measures:** Among qualified applicants, are outcomes equal across groups?

**Example:**
```
True Positive Rates (among qualified applicants):
• Male:   85% (850 correctly approved / 1,000 qualified)
• Female: 82% (820 correctly approved / 1,000 qualified)

✅ PASS
Difference: 3 percentage points
Threshold: 5 percentage points
Status: PASS
```

**What this means:** Both groups have similar chances of approval when qualified.

#### Predictive Parity

**What it measures:** Among those approved, are outcomes equally accurate across groups?

**Example:**
```
Precision (among approved applicants):
• Male:   90% (900 actually qualified / 1,000 approved)
• Female: 88% (880 actually qualified / 1,000 approved)

✅ PASS
Difference: 2 percentage points
Threshold: 5 percentage points
Status: PASS
```

### SHAP Explainability

**What are SHAP values?**
SHAP (SHapley Additive exPlanations) values show how much each feature contributed to each prediction.

**Example Individual Explanation:**

```
Prediction: APPROVED (Confidence: 92%)

Feature Contributions:
  Credit Score:     +15  ███████████████
  Income:           +8   ████████
  Employment Years: +5   █████
  Age:              +2   ██
  Gender:           -1   ▁ ⚠️
  
Total Impact: +29 → APPROVED
```

**Interpretation:**
- ✅ Credit score was the strongest positive factor (+15)
- ⚠️ Gender had a negative impact (-1), which may indicate bias

**Feature Importance Chart:**

```
Overall Feature Importance:
1. Credit Score       ████████████████████ 35%
2. Income            ███████████████ 25%
3. Employment Years  ██████████ 18%
4. Debt-to-Income   ████████ 12%
5. Age              ████ 7%
6. Gender           █ 3% ⚠️
```

### Visualizations

#### 1. **Approval Rate Distribution**

```
                    Approval Rates by Protected Attribute
100%│
    │     ███
 75%│     ███  ████
    │     ███  ████  ███
 50%│     ███  ████  ███  ████
    │     ███  ████  ███  ████
 25%│     ███  ████  ███  ████
    │     ███  ████  ███  ████
  0%└─────────────────────────────
       Male Female  18-25  26-35
       Gender         Age Group
```

#### 2. **False Positive/Negative Rates**

Shows error rates across groups to identify if certain groups are unfairly rejected or approved.

#### 3. **SHAP Summary Plot**

Displays the distribution of feature impacts across all predictions.

---

## 6. Advanced Features

### Custom Fairness Thresholds

Navigate to **⚙️ Settings** → **Fairness Configuration**

```
Statistical Parity Threshold: [0.05]  (5%)
Equal Opportunity Threshold:  [0.05]  (5%)
Predictive Parity Threshold:  [0.05]  (5%)

Minimum Group Size:          [30]    samples
Confidence Level:            [0.95]  (95%)
```

**Guidelines:**
- **Strict (2-3%):** Healthcare, criminal justice
- **Standard (5%):** Financial services, hiring
- **Relaxed (10%):** Marketing, recommendations

### Comparative Analysis

Compare multiple models side-by-side:

1. Click **Compare Models** in the Reports section
2. Select 2-5 analyses to compare
3. View metrics side-by-side
4. Identify best-performing model

**Comparison Table:**

| Metric | Model A | Model B | Winner |
|--------|---------|---------|--------|
| Fairness Score | 78 | 85 | B ✓ |
| Accuracy | 87% | 84% | A ✓ |
| Statistical Parity | PASS | PASS | Tie |
| Equal Opportunity | FAIL | PASS | B ✓ |

### Drift Detection

Monitor model performance over time:

1. Navigate to **📊 Dashboard** → **Drift Monitoring**
2. Select a model to track
3. Set baseline period (e.g., last 30 days)
4. Configure alerts for significant drift

**Drift Chart:**

```
         Statistical Parity Over Time
0.10│                              ⚠️
    │                           ●
0.08│                        ●
    │                     ●
0.06│                  ●
    │               ●
0.04│            ●
    │         ●
0.02│      ●
    │   ●
0.00└────────────────────────────────
    Jan  Feb  Mar  Apr  May  Jun
    
    ● Measured Value
    --- Threshold (0.05)
```

### Batch Processing

Process multiple datasets at once:

1. Click **Batch Analysis** in the Analyze section
2. Upload multiple CSV files (up to 10)
3. Apply same configuration to all
4. Download combined report

---

## 7. Reports & Export

### Viewing Reports

All completed analyses are saved in **📄 Reports**

**Report List View:**
- Filter by date, status, fairness score
- Search by model name
- Sort by any column

### Report Details

Each report contains:

1. **Executive Summary** (1 page)
   - Overall fairness score
   - Key findings
   - Recommendations

2. **Detailed Results** (5-10 pages)
   - All metrics and tests
   - Visualizations
   - Statistical significance

3. **Technical Appendix**
   - Raw data
   - Methodology
   - Configuration used

### Export Options

Click **Export** button to download reports:

| Format | Best For | Includes |
|--------|----------|----------|
| **PDF** | Executives, regulators | Summary + visuals |
| **Excel** | Analysts, further analysis | Raw data + charts |
| **JSON** | Developers, integration | Structured data |
| **HTML** | Web viewing, sharing | Interactive charts |

**Export Example (PDF):**
```
📄 Credit_Scoring_Analysis_2024-01-15.pdf
   • Executive Summary
   • Fairness Metrics
   • SHAP Explanations
   • Visualizations
   • Recommendations
   • Audit Trail
```

### Sharing Reports

1. Click **Share** button on any report
2. Choose sharing method:
   - 📧 **Email:** Send to specific recipients
   - 🔗 **Link:** Generate shareable URL (expires in 7 days)
   - 👥 **Team:** Share with your organization
3. Set permissions: View-only or Download

---

## 8. Troubleshooting

### Common Issues

#### ❌ "Upload Failed"

**Causes:**
- File too large (>50MB)
- Unsupported format
- Network connection issue

**Solutions:**
1. Check file size and format (CSV, JSON, Excel only)
2. Split large files into smaller chunks
3. Retry upload
4. Contact support if issue persists

#### ⚠️ "Analysis Taking Too Long"

**Normal Times:**
- Small datasets (<1K rows): 5-10 seconds
- Medium datasets (1K-10K): 10-30 seconds
- Large datasets (10K-100K): 30-90 seconds

**If Stuck:**
1. Check your internet connection
2. Refresh the page (analysis will resume)
3. If >5 minutes, cancel and retry

#### ⚠️ "Insufficient Data for Group"

**Error:** "Gender group 'Non-binary' has only 15 samples (minimum 30 required)"

**Solutions:**
1. Lower minimum group size in settings (not recommended)
2. Collect more data for underrepresented groups
3. Combine similar groups (e.g., age ranges)

#### ❌ "No Bias Detected but Scores Are Different"

**This is normal!** Not all differences indicate bias:
- Random variation
- Different qualifications between groups
- Small sample sizes

**How we determine bias:**
- Statistical significance testing (p < 0.05)
- Effect size thresholds
- Multiple metrics agreement

### Performance Tips

**Speed up Analysis:**
- ✅ Use smaller, representative samples (10K rows sufficient)
- ✅ Remove unnecessary columns
- ✅ Cache results (checkbox in settings)
- ❌ Don't upload raw data repeatedly (save datasets)

**Improve Accuracy:**
- ✅ Use larger datasets (1K+ rows per group)
- ✅ Ensure balanced classes
- ✅ Handle missing values properly
- ✅ Validate data quality first

### Getting Help

1. **In-App Help:** Click **?** icon (bottom-right)
2. **Documentation:** [Full docs](https://docs.ethixai.com)
3. **Community Forum:** [community.ethixai.com](https://community.ethixai.com)
4. **Email Support:** support@ethixai.com
5. **Live Chat:** Available 9 AM - 5 PM EST (paid plans)

---

## 9. FAQ

### General

**Q: What types of models does EthixAI support?**  
A: Classification models (binary and multi-class). Regression support coming soon.

**Q: Does EthixAI store my data?**  
A: Only metadata and results are stored. Raw data is deleted after analysis unless you opt to save it.

**Q: Is EthixAI GDPR/CCPA compliant?**  
A: Yes. We provide data export, deletion, and anonymization features.

**Q: Can I use EthixAI for model training?**  
A: Not directly. EthixAI analyzes existing models/predictions. Use our results to improve training.

### Technical

**Q: What fairness metrics do you support?**  
A: Statistical Parity, Equal Opportunity, Predictive Parity, Calibration, Equalized Odds.

**Q: How is the fairness score calculated?**  
A: Weighted average of all metrics, with configurable weights. Default: equal weight.

**Q: Can I integrate EthixAI via API?**  
A: Yes! See our [API Documentation](https://docs.ethixai.com/api).

**Q: What's the max dataset size?**  
A: 50MB upload limit (≈100K rows). Contact sales for enterprise limits.

**Q: Do you support streaming analysis?**  
A: Not yet. Batch analysis only. Real-time coming Q2 2026.

### Business

**Q: What's the pricing model?**  
A: Freemium. Free tier: 10 analyses/month. Paid plans start at $99/month.

**Q: Do you offer on-premise deployment?**  
A: Yes, for enterprise customers. Contact sales@ethixai.com.

**Q: Can I cancel anytime?**  
A: Yes, no long-term contracts. Cancel in settings.

**Q: Do you offer training/onboarding?**  
A: Yes! Paid plans include 1-hour onboarding session. Custom training available.

### Compliance

**Q: Can I use EthixAI reports for regulatory audits?**  
A: Yes. Our reports include audit trails and methodology documentation.

**Q: What regulations does EthixAI help with?**  
A: EEOC (US), GDPR Article 22 (EU), FCRA (US), Fair Lending (US), and more.

**Q: Are your methods peer-reviewed?**  
A: Yes. Based on published research from MIT, Stanford, Microsoft Research.

---

## Appendix

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New analysis |
| `Ctrl+U` | Upload dataset |
| `Ctrl+R` | View reports |
| `Ctrl+E` | Export current report |
| `Ctrl+?` | Help |
| `Esc` | Close modal |

### Glossary

- **Bias:** Systematic unfairness in model predictions across protected groups
- **Protected Attribute:** Characteristics protected by law (gender, race, age, etc.)
- **Statistical Parity:** Equal outcome rates across groups
- **Equal Opportunity:** Equal true positive rates for qualified individuals
- **SHAP:** Method for explaining individual predictions
- **Fairness Threshold:** Maximum allowed difference between groups
- **Type I Error:** False positive (incorrectly approved)
- **Type II Error:** False negative (incorrectly rejected)

### System Status

Check platform status: [status.ethixai.com](https://status.ethixai.com)

- 🟢 **Operational:** All systems normal
- 🟡 **Degraded:** Slower than usual
- 🔴 **Down:** Service unavailable

### Version History

| Version | Release Date | Key Features |
|---------|-------------|--------------|
| **1.0** | Day 25 | Initial production release |
| **0.9** | Day 20 | Beta testing |
| **0.5** | Day 10 | Alpha testing |

---

**Need More Help?**

📧 Email: support@ethixai.com  
💬 Chat: [chat.ethixai.com](https://chat.ethixai.com)  
📚 Docs: [docs.ethixai.com](https://docs.ethixai.com)  
🎥 Video Tutorials: [youtube.com/ethixai](https://youtube.com/ethixai)

---

**Thank you for using EthixAI!** 🎉

*Building a more ethical, transparent, and inclusive AI future.*
