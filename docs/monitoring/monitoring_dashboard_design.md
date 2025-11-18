# Monitoring Dashboard Design

**EthixAI Model Monitoring System**  
**Version**: 1.0  
**Last Updated**: November 18, 2025

## Overview

The Monitoring Dashboard provides real-time visibility into model health, drift metrics, fairness indicators, and incidents. Built with **Next.js** and deployed to **Vercel**, it consists of **4 primary pages** designed for different stakeholder needs.

---

## Design Principles

1. **Clarity**: Complex metrics presented in digestible visualizations
2. **Actionability**: Every alert has clear next steps
3. **Accessibility**: WCAG 2.1 AA compliant, screen reader friendly
4. **Performance**: Sub-2-second load times, lazy-loaded charts
5. **Mobile-Responsive**: Usable on tablets (not phone-optimized)

---

## Page 1: Drift Overview

**Route**: `/monitoring/drift`  
**Audience**: ML Engineers, Data Scientists  
**Purpose**: High-level view of all drift metrics

### Layout Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔍 Drift Overview                    [Model: All ▼] [Range: 7d ▼]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│ │ Aggregated Score │  │  Data Drift      │  │  Model Drift     │  │
│ │                  │  │                  │  │                  │  │
│ │      0.18        │  │      0.22        │  │      0.15        │  │
│ │    WARNING       │  │    WARNING       │  │      INFO        │  │
│ │                  │  │                  │  │                  │  │
│ │  [Gauge Chart]   │  │  [Gauge Chart]   │  │  [Gauge Chart]   │  │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Drift Trend (Last 30 Days)                                    │  │
│ │                                                               │  │
│ │  Score                                                        │  │
│ │   0.3 ┤                                    ●                  │  │
│ │   0.2 ┤         ●     ●           ●     ●     ●              │  │
│ │   0.1 ┤   ●  ●     ●     ●     ●     ●           ●  ●        │  │
│ │   0.0 └────────────────────────────────────────────────────> │  │
│ │        Mar 1    Mar 8    Mar 15    Mar 22    Mar 29   Date   │  │
│ │                                                               │  │
│ │  Legend: ─ Aggregated  ─ Data  ─ Fairness  ─ Model          │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Metric Details                          [Export CSV]          │  │
│ ├──────────────┬──────────┬──────────┬──────────┬─────────────┤  │
│ │ Metric       │ Current  │ Baseline │ Severity │ Last Check  │  │
│ ├──────────────┼──────────┼──────────┼──────────┼─────────────┤  │
│ │ PSI          │  0.18    │  0.05    │ ⚠️ WARN  │ 2 hours ago │  │
│ │ KL Div       │  0.14    │  0.03    │ ⚠️ WARN  │ 2 hours ago │  │
│ │ Wasserstein  │  0.12    │  0.08    │ ℹ️ INFO  │ 2 hours ago │  │
│ │ DP Drift     │  0.06    │  0.02    │ ⚠️ WARN  │ 2 hours ago │  │
│ │ EOD Drift    │  0.04    │  0.01    │ ℹ️ INFO  │ 2 hours ago │  │
│ │ Accuracy     │  0.87    │  0.92    │ ⚠️ WARN  │ 1 day ago   │  │
│ └──────────────┴──────────┴──────────┴──────────┴─────────────┘  │
│                                                                     │
│ ⚠️ 3 metrics in WARNING state   [View Recommendations →]          │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

#### 1. Gauge Charts (Score Cards)
- **Aggregated Score**: Weighted composite (0-1 scale)
  - Color: Green (<0.15), Yellow (0.15-0.29), Red (≥0.30)
  - Needle points to current value
  - Zones marked: INFO, WARNING, CRITICAL
  
- **Data Drift Score**: Max of PSI, KL, Wasserstein
- **Model Drift Score**: Max of accuracy drop, entropy change
- **Fairness Drift Score**: Max of DP, EOD, DI drift

**Library**: Recharts or Victory (React charting)

#### 2. Trend Line Chart
- **X-axis**: Date (last 30 days)
- **Y-axis**: Drift score (0-1)
- **Lines**: 4 traces (Aggregated, Data, Fairness, Model)
- **Interaction**: Hover tooltip shows exact values
- **Threshold Lines**: Dashed lines at 0.15 (WARNING) and 0.30 (CRITICAL)

**Data Source**: `GET /api/v1/monitoring/records?range=30d`

#### 3. Metric Details Table
- **Sortable** by severity, metric name, current value
- **Filterable** by severity (show only WARNING/CRITICAL)
- **Clickable Rows**: Expand to show feature-level breakdown
- **Export CSV**: Download all metrics for external analysis

**Row Expansion**:
```
│ ├─ PSI (expanded)                                                │
│ │  ├─ credit_score: 0.22 (WARN)                                 │
│ │  ├─ income: 0.18 (WARN)                                       │
│ │  └─ loan_amount: 0.08 (INFO)                                  │
```

### Filters
- **Model Selector**: Dropdown list of all models (default: "All models")
- **Time Range**: 24h, 7d, 30d, Custom
- **Severity Filter**: All, INFO, WARNING, CRITICAL

### Actions
- **Analyze Now**: Trigger on-demand drift analysis
- **View Recommendations**: Link to `/monitoring/recommendations` (future page)
- **Export Report**: Generate PDF summary

---

## Page 2: Fairness Monitor

**Route**: `/monitoring/fairness`  
**Audience**: Compliance Officers, ML Leads, Auditors  
**Purpose**: Track fairness metrics across protected groups

### Layout Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚖️ Fairness Monitor                  [Model: loan-v2.3 ▼] [7d ▼]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 🚨 CRITICAL: Demographic Parity drift exceeded threshold            │
│    Selection rate for female applicants is 14% lower than male.    │
│    [View Incident INC-2025-042 →]                [Acknowledge]     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Protected Attribute: [Gender ▼] [Age Group] [Race]                 │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Demographic Parity (Selection Rate by Group)                  │  │
│ │                                                               │  │
│ │  Selection Rate                                               │  │
│ │   0.6 ┤                                                        │  │
│ │   0.5 ┤  ████████████  Male: 0.54                             │  │
│ │   0.4 ┤  ████████  Female: 0.40  ← 14% gap (CRITICAL)         │  │
│ │   0.3 ┤                                                        │  │
│ │   0.2 ┤                                                        │  │
│ │   0.1 ┤                                                        │  │
│ │   0.0 └──────────────────────────────────────────────────────> │  │
│ │            Male         Female                                │  │
│ │                                                               │  │
│ │  Baseline:    Male: 0.52     Female: 0.48    Gap: 4%         │  │
│ │  Current:     Male: 0.54     Female: 0.40    Gap: 14% 🔴     │  │
│ │  Threshold:   10% (CRITICAL at >10%)                          │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Equal Opportunity (TPR by Group)                              │  │
│ │                                                               │  │
│ │  True Positive Rate                                           │  │
│ │   0.9 ┤  ████████████  Male: 0.88                             │  │
│ │   0.8 ┤  ██████████  Female: 0.82  ← 6% gap (WARNING)         │  │
│ │   0.7 ┤                                                        │  │
│ │   0.6 └──────────────────────────────────────────────────────> │  │
│ │            Male         Female                                │  │
│ │                                                               │  │
│ │  Baseline:    Male: 0.86     Female: 0.84    Gap: 2%         │  │
│ │  Current:     Male: 0.88     Female: 0.82    Gap: 6% ⚠️      │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Disparate Impact Ratio (80% Rule)                             │  │
│ │                                                               │  │
│ │   DI Ratio                                                    │  │
│ │   1.0 ┤                                                        │  │
│ │   0.9 ┤  ─────────────────────────────────                    │  │
│ │   0.8 ┤  ═══════════════  80% Rule Threshold                  │  │
│ │   0.7 ┤           ●  0.74  🔴 VIOLATION                        │  │
│ │   0.6 ┤                                                        │  │
│ │   0.5 └──────────────────────────────────────────────────────> │  │
│ │        Mar 1    Mar 8    Mar 15    Mar 22    Mar 29   Date   │  │
│ │                                                               │  │
│ │  Current: 0.74 (Female/Male selection rate)                   │  │
│ │  Status: 🔴 CRITICAL - Below 0.80 threshold                   │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Fairness Drift Trend (Last 30 Days)                           │  │
│ │                                                               │  │
│ │  Drift                                                        │  │
│ │   0.15┤                                    ●  0.14 (CRITICAL) │  │
│ │   0.10┤  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  CRITICAL threshold      │  │
│ │   0.05┤     ●     ●     ●     ●     ●  WARNING threshold      │  │
│ │   0.00└────────────────────────────────────────────────────────│  │
│ │        Mar 1    Mar 8    Mar 15    Mar 22    Mar 29   Date   │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ 📊 Compliance Summary:                                              │
│    ✅ Equal Opportunity: PASS (gap <10%)                            │
│    🔴 Demographic Parity: FAIL (gap >10%)                           │
│    🔴 Disparate Impact: FAIL (ratio <0.80)                          │
│    Status: NON-COMPLIANT - Immediate action required                │
│                                                                     │
│ [Download Compliance Report PDF] [View Response Runbook →]         │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

#### 1. Alert Banner (Conditional)
- Only shown if CRITICAL fairness alert active
- Red background, white text, prominent
- Shows gap percentage and affected group
- **Actions**: View Incident, Acknowledge

#### 2. Protected Attribute Selector
- Tabs or dropdown: Gender, Age Group, Race
- Default: Gender (most commonly regulated)

#### 3. Demographic Parity Chart
- **Bar chart**: Selection rate per group
- **Baseline vs Current**: Side-by-side bars or overlay
- **Gap Indicator**: Arrow showing % difference
- **Color Coding**: Green (<5%), Yellow (5-10%), Red (>10%)

#### 4. Equal Opportunity Chart
- Similar to DP chart but shows TPR
- Requires ground truth labels (may show "N/A" if unavailable)

#### 5. Disparate Impact Ratio Chart
- **Line chart**: DI ratio over time
- **80% Rule Line**: Dashed horizontal line at 0.80
- **Zone Coloring**: Green (>0.90), Yellow (0.80-0.90), Red (<0.80)

#### 6. Fairness Drift Trend
- Shows how fairness drift changes over time
- Multi-line: DP drift, EOD drift
- Threshold lines at 0.05 (WARNING) and 0.10 (CRITICAL)

#### 7. Compliance Summary Card
- **Checklist Format**: ✅ or 🔴 per metric
- **Overall Status**: COMPLIANT / NON-COMPLIANT
- **Regulatory Context**: Mentions 80% rule, EU AI Act

### Actions
- **Download Compliance Report**: PDF with all metrics + historical data
- **View Response Runbook**: Link to `monitoring_policy.md#fairness-drift-response`
- **Acknowledge Alert**: Mark incident as acknowledged
- **Investigate**: Link to detailed incident page

### Data Sources
- `GET /api/v1/monitoring/fairness?model_id=...&range=7d`
- `GET /api/v1/monitoring/incidents?metric=fairness`

---

## Page 3: Model Health

**Route**: `/monitoring/health`  
**Audience**: ML Engineers, Product Managers  
**Purpose**: Track model performance and behavior

### Layout Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏥 Model Health                      [Model: loan-v2.3 ▼] [7d ▼]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│ │ Prediction Volume│  │  Avg Confidence  │  │  Accuracy        │  │
│ │                  │  │                  │  │                  │  │
│ │   1,247 / day    │  │      0.82        │  │      0.87        │  │
│ │   ↑ 12% vs last  │  │   ↓ 0.05 vs last │  │  ↓ 5% vs last   │  │
│ │      week        │  │      week        │  │     week ⚠️     │  │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Prediction Distribution (Last 7 Days)                         │  │
│ │                                                               │  │
│ │  Frequency                                                    │  │
│ │   500 ┤     ████                                              │  │
│ │   400 ┤   ████████                                            │  │
│ │   300 ┤ ████████████                                          │  │
│ │   200 ┤ ████████████████                                      │  │
│ │   100 ┤ ████████████████████                                  │  │
│ │     0 └──────────────────────────────────────────────────────>│  │
│ │        Reject     Approve     Manual Review     Class        │  │
│ │                                                               │  │
│ │  Baseline: Reject 40%, Approve 55%, Manual 5%                 │  │
│ │  Current:  Reject 48%, Approve 47%, Manual 5%  ⚠️ Shifted    │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Confidence Distribution                                       │  │
│ │                                                               │  │
│ │  Frequency                                                    │  │
│ │   400 ┤                 ████████                              │  │
│ │   300 ┤             ████████████████                          │  │
│ │   200 ┤         ████████████████████████                      │  │
│ │   100 ┤     ████████████████████████████████                  │  │
│ │     0 └──────────────────────────────────────────────────────>│  │
│ │        0.0   0.2   0.4   0.6   0.8   1.0    Confidence       │  │
│ │                                                               │  │
│ │  Mean: 0.82  Median: 0.85  Std: 0.12                          │  │
│ │  Change: ↓ 0.05 vs baseline (model less confident)            │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Output Entropy Trend                                          │  │
│ │                                                               │  │
│ │  Entropy                                                      │  │
│ │   1.0 ┤                                                        │  │
│ │   0.8 ┤     ●───●───●───●───●───●───●───●───●  Stable        │  │
│ │   0.6 ┤                                                        │  │
│ │   0.4 └──────────────────────────────────────────────────────>│  │
│ │        Mar 1    Mar 8    Mar 15    Mar 22    Mar 29   Date   │  │
│ │                                                               │  │
│ │  Interpretation: Low entropy = Overconfident predictions      │  │
│ │                  High entropy = Uncertain predictions         │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Accuracy Metrics (When Ground Truth Available)                │  │
│ ├───────────────┬──────────┬──────────┬──────────┬─────────────┤  │
│ │ Metric        │ Current  │ Baseline │ Change   │ Status      │  │
│ ├───────────────┼──────────┼──────────┼──────────┼─────────────┤  │
│ │ Overall Acc   │  0.87    │  0.92    │  -5%     │ ⚠️ WARNING  │  │
│ │ Precision     │  0.84    │  0.88    │  -4%     │ ⚠️ WARNING  │  │
│ │ Recall        │  0.89    │  0.91    │  -2%     │ ℹ️ INFO     │  │
│ │ F1 Score      │  0.86    │  0.89    │  -3%     │ ℹ️ INFO     │  │
│ │ FPR           │  0.08    │  0.05    │  +3%     │ ⚠️ WARNING  │  │
│ └───────────────┴──────────┴──────────┴──────────┴─────────────┘  │
│                                                                     │
│ 📊 Note: Accuracy metrics computed on 247 labeled samples from     │
│    last 7 days (20% label availability)                             │
│                                                                     │
│ [View Per-Class Metrics →] [Download Model Card PDF]               │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

#### 1. Summary Cards
- **Prediction Volume**: Daily average + trend arrow
- **Avg Confidence**: Mean prediction confidence + change
- **Accuracy**: Current vs baseline + change indicator

#### 2. Prediction Distribution
- **Histogram**: Frequency of each predicted class
- **Baseline Overlay**: Dashed outline showing baseline distribution
- **Shift Detection**: Highlight if distribution shifted >20%

#### 3. Confidence Distribution
- **Histogram**: Bins of confidence scores (0.0-1.0)
- **Statistics**: Mean, median, std deviation
- **Interpretation**: Low variance = overconfident, high variance = uncertain

#### 4. Output Entropy Trend
- **Line chart**: Entropy over time
- **Zones**: Low (<0.5 overconfident), Normal (0.5-0.8), High (>0.8 uncertain)

#### 5. Accuracy Metrics Table
- Only shown if ground truth labels available
- Shows all standard ML metrics
- Color-coded change indicators
- Note about label availability % (e.g., "20% of predictions have labels")

### Actions
- **View Per-Class Metrics**: Expand to show per-class precision/recall
- **Download Model Card**: PDF with all metrics + SHAP explanations
- **Compare Versions**: Select two model versions to compare side-by-side

### Data Sources
- `GET /api/v1/monitoring/health?model_id=...&range=7d`
- `GET /api/v1/monitoring/predictions?model_id=...&range=7d` (summary stats)

---

## Page 4: Incident Timeline

**Route**: `/monitoring/incidents`  
**Audience**: All stakeholders (filtered by role)  
**Purpose**: Track all monitoring incidents and their resolution

### Layout Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📋 Incident Timeline                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Filters: [Severity: All ▼] [Status: Open ▼] [Model: All ▼]         │
│          [Date Range: Last 30 days ▼]                 [Export CSV]  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ 🔴 CRITICAL │ INC-2025-043 │ Open │ Mar 29, 14:35              │  │
│ │                                                               │  │
│ │ Fairness Drift: Demographic Parity exceeded 0.10              │  │
│ │ Model: loan-approval-v2.3                                     │  │
│ │ Affected: Female applicants (selection rate 14% lower)        │  │
│ │                                                               │  │
│ │ [View Details] [Acknowledge] [Assign to: ML Lead ▼]          │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ ⚠️ WARNING │ INC-2025-042 │ Investigating │ Mar 29, 12:20      │  │
│ │                                                               │  │
│ │ Data Drift: PSI exceeded 0.15 for credit_score feature       │  │
│ │ Model: loan-approval-v2.3                                     │  │
│ │ Assigned to: @engineer_jane                                   │  │
│ │                                                               │  │
│ │ Timeline:                                                     │  │
│ │  12:20 - Incident created (automated)                         │  │
│ │  12:35 - Acknowledged by @engineer_jane                       │  │
│ │  13:10 - Root cause identified: upstream API schema change   │  │
│ │  [Current status: Investigating]                              │  │
│ │                                                               │  │
│ │ [View Details] [Add Comment] [Mark Resolved]                 │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ ⚠️ WARNING │ INC-2025-041 │ Resolved │ Mar 28, 09:15           │  │
│ │                                                               │  │
│ │ Model Drift: Accuracy dropped 6% vs baseline                  │  │
│ │ Model: loan-approval-v2.2 (previous version)                  │  │
│ │                                                               │  │
│ │ Resolution: Retrained model with last 30 days data.           │  │
│ │ Deployed v2.3 on Mar 29, 08:00.                               │  │
│ │ Resolved by: @engineer_john                                   │  │
│ │                                                               │  │
│ │ [View Details] [View Post-Mortem]                             │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ ℹ️ INFO │ INC-2025-040 │ Accepted Risk │ Mar 27, 16:00         │  │
│ │                                                               │  │
│ │ Data Drift: PSI = 0.12 (seasonal applicant profile change)   │  │
│ │ Model: loan-approval-v2.2                                     │  │
│ │                                                               │  │
│ │ Decision: Accepted as expected seasonal drift during tax      │  │
│ │ season. Baseline will be updated Apr 15.                      │  │
│ │ Approved by: @compliance_officer                              │  │
│ │                                                               │  │
│ │ [View Details]                                                │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ Showing 4 of 247 incidents. [Load More ↓] [Jump to Page: 1 ▼]     │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

#### 1. Filter Bar
- **Severity**: All, INFO, WARNING, CRITICAL
- **Status**: All, Open, Investigating, Resolved, Accepted Risk
- **Model**: Dropdown list of all models
- **Date Range**: Preset ranges or custom picker
- **Export CSV**: Download filtered incidents

#### 2. Incident Cards (Collapsed View)
- **Severity Badge**: Color-coded (🔴 red, ⚠️ yellow, ℹ️ blue)
- **Incident ID**: Clickable to expand
- **Status**: Open, Investigating, Resolved, Accepted Risk
- **Timestamp**: Created date/time
- **Summary**: One-line description
- **Model**: Affected model ID
- **Quick Actions**: View Details, Acknowledge, Assign

#### 3. Incident Cards (Expanded View)
- **Metrics**: Exact metric values that triggered alert
- **Affected Groups**: If fairness incident, which protected groups
- **Timeline**: Chronological list of all actions taken
- **Root Cause**: If identified, documented here
- **Resolution**: How incident was resolved
- **Assignee**: Who is investigating
- **Comments**: Internal discussion thread

#### 4. Incident Detail Modal (Click "View Details")
```
┌─────────────────────────────────────────────────────────────────┐
│ Incident Details: INC-2025-042                      [X Close]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Overview:                                                       │
│   Severity: WARNING                                             │
│   Status: Investigating                                         │
│   Created: Mar 29, 12:20 UTC                                    │
│   Model: loan-approval-v2.3                                     │
│   Assigned: @engineer_jane                                      │
│                                                                 │
│ Triggered Metrics:                                              │
│   • PSI (credit_score): 0.18 (threshold: 0.10)                  │
│   • KL Divergence (income): 0.14 (threshold: 0.10)              │
│                                                                 │
│ Timeline:                                                       │
│   12:20 - Incident created by Drift Analyzer                    │
│   12:35 - Acknowledged by @engineer_jane                        │
│   13:10 - Comment: "Upstream API changed schema, investigating" │
│   13:45 - Comment: "Contacted data team, fix ETA 2 hours"      │
│                                                                 │
│ Related Data:                                                   │
│   • Monitoring Record: MON-2025-1234                            │
│   • Alert: ALT-2025-042                                         │
│   • Drift Snapshot: SNAP-2025-03-22                             │
│                                                                 │
│ Response Actions:                                               │
│   [Add Comment] [Change Status] [Reassign] [Mark Resolved]     │
│   [Download Evidence Bundle] [View Runbook]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Actions
- **Acknowledge**: Mark incident as acknowledged (required within 15 min for CRITICAL)
- **Assign**: Assign to team member
- **Add Comment**: Internal discussion
- **Change Status**: Open → Investigating → Resolved / Accepted Risk
- **Mark Resolved**: Close incident with resolution notes
- **Download Evidence Bundle**: Export all related data (metrics, logs, alerts)
- **View Runbook**: Link to response procedure in `monitoring_policy.md`

### Data Sources
- `GET /api/v1/monitoring/incidents?status=open&severity=CRITICAL`
- `GET /api/v1/monitoring/incidents/:incident_id` (detail view)
- `POST /api/v1/monitoring/incidents/:incident_id/comments` (add comment)

---

## Global UI Elements

### Navigation Bar
```
┌─────────────────────────────────────────────────────────────────────┐
│ EthixAI                                              [@user_name ▼] │
├─────────────────────────────────────────────────────────────────────┤
│ Dashboard │ Reports │ Monitoring ▼ │ Settings │ Help                │
│                      ├─ Drift Overview                               │
│                      ├─ Fairness Monitor                             │
│                      ├─ Model Health                                 │
│                      └─ Incident Timeline                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Alert Banner (Global, shown on all pages if CRITICAL alert active)
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🚨 2 CRITICAL incidents require immediate attention                  │
│    [View All Incidents →]                            [Dismiss x]    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Responsive Design

### Desktop (1920x1080)
- Full layout as shown in wireframes
- 3-column layout for gauge charts
- Wide charts utilize full screen width

### Tablet (768x1024)
- 2-column layout for gauge charts
- Charts shrink proportionally
- Table rows remain full-width
- Navigation collapses to hamburger menu

### Mobile (Not Optimized)
- Read-only view
- Critical alerts shown prominently
- "View on desktop for full features" message

---

## Accessibility

### WCAG 2.1 AA Compliance

| Criterion | Implementation |
|-----------|----------------|
| **Color Contrast** | All text >4.5:1 ratio, UI elements >3:1 |
| **Keyboard Navigation** | All actions accessible via Tab/Enter/Escape |
| **Screen Reader Support** | ARIA labels on all charts, semantic HTML |
| **Focus Indicators** | Visible focus outlines (2px blue border) |
| **Text Resize** | Support up to 200% zoom without breaking layout |

### ARIA Labels Examples
```html
<div role="region" aria-label="Drift Overview Gauge Charts">
  <div role="img" aria-label="Aggregated drift score: 0.18, WARNING severity">
    <!-- Gauge chart -->
  </div>
</div>

<table aria-label="Metric Details">
  <thead>
    <tr>
      <th scope="col">Metric</th>
      <th scope="col">Current Value</th>
      ...
    </tr>
  </thead>
</table>
```

---

## Performance Optimization

### Load Time Targets
- **Initial Page Load**: < 2 seconds
- **Chart Rendering**: < 500ms
- **Filter/Sort**: < 100ms (client-side)
- **API Calls**: < 300ms (backend)

### Optimization Techniques
1. **Lazy Loading**: Charts rendered only when in viewport
2. **Data Pagination**: Load 20 incidents at a time, infinite scroll
3. **Caching**: API responses cached for 30 seconds in browser
4. **Code Splitting**: Each page is separate Webpack chunk
5. **Image Optimization**: SVG icons, no raster images

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **UI Library** | Shadcn UI (Radix + Tailwind CSS) |
| **Charts** | Recharts (responsive, accessible) |
| **State Management** | React Query (server state), Zustand (client state) |
| **Forms** | React Hook Form + Zod validation |
| **Authentication** | Firebase Auth (existing) |
| **Deployment** | Vercel (free tier) |

---

## API Integration

### Dashboard API Endpoints

```typescript
// frontend/src/lib/api/monitoring.ts

export async function getDriftOverview(
  modelId?: string,
  range: '24h' | '7d' | '30d' = '7d'
) {
  const response = await fetch(
    `/api/v1/monitoring/records?model_id=${modelId || 'all'}&range=${range}`
  );
  return response.json();
}

export async function getFairnessMetrics(
  modelId: string,
  protectedAttr: 'gender' | 'age_group' | 'race',
  range: '7d' | '30d' = '7d'
) {
  const response = await fetch(
    `/api/v1/monitoring/fairness?model_id=${modelId}&attr=${protectedAttr}&range=${range}`
  );
  return response.json();
}

export async function getModelHealth(modelId: string, range: '7d' | '30d' = '7d') {
  const response = await fetch(
    `/api/v1/monitoring/health?model_id=${modelId}&range=${range}`
  );
  return response.json();
}

export async function getIncidents(filters: {
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  status?: 'open' | 'investigating' | 'resolved' | 'accepted_risk';
  modelId?: string;
  dateRange?: { start: Date; end: Date };
}) {
  const params = new URLSearchParams();
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.status) params.append('status', filters.status);
  if (filters.modelId) params.append('model_id', filters.modelId);
  // ... date range handling
  
  const response = await fetch(`/api/v1/monitoring/incidents?${params}`);
  return response.json();
}

export async function acknowledgeIncident(incidentId: string, notes: string) {
  const response = await fetch(`/api/v1/alerts/${incidentId}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acknowledged_by: userId, notes })
  });
  return response.json();
}
```

---

## Future Enhancements (Day 25+)

- [ ] Real-time updates via WebSockets (live drift metrics)
- [ ] Embedded SHAP force plots in Model Health page
- [ ] Comparison mode: side-by-side model version comparison
- [ ] Custom dashboards: Users can configure their own widget layout
- [ ] Mobile app (React Native) for on-call incident management
- [ ] Slack app: View dashboards directly in Slack
- [ ] AI-powered root cause analysis (LLM suggests likely causes)

---

## References

- **Data Schemas**: `monitoring_schemas.md`
- **API Spec**: `docs/api-spec.yaml` (to be updated)
- **Metrics**: `drift_metrics_spec.md`
- **Policy**: `monitoring_policy.md`

---

**Next**: See `monitoring_data_flow.md` for end-to-end data flows and sequence diagrams.
