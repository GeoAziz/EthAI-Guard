# Model Drift & Monitoring Hooks (Day 10)

Objective: Detect drift before it impacts fairness or accuracy.

Drift types
- Population drift: input feature distribution shifts vs. training
- Concept drift: relationship between features and target changes
- Fairness drift: group-wise performance metrics change over time

Signals & metrics
- KL divergence / PSI for feature distributions (weekly windows)
- Prediction score distribution changes (per group)
- Fairness metrics (weekly rolling):
  - Demographic Parity (DP) difference
  - Equalized Odds (EO) difference
  - Disparate Impact (DI) ratio
  - FPR gap

Thresholds (initial)
- Drift > 0.15 → warning
- Drift > 0.25 → retraining review

Data hooks
- Persist anonymized feature histograms (buckets) per week
- Store model metadata (version, hash, training date)
- Tag reports with cohort keys (e.g., geography, product) for segmentation

Process
- Weekly batch job computes drift metrics; publish to Prometheus/Grafana
- Alert on thresholds; create tickets automatically when exceeded
- Keep history for 12 months for trend analysis

Governance
- Maintain a drift register documenting causes, actions, and outcomes
- Align thresholds with risk/compliance stakeholders
