# Model explainability & fairness (Overview)

This document explains the key outputs produced by the demo and how to interpret them.

SHAP explanations

- SHAP (SHapley Additive exPlanations) is used to quantify each feature's contribution to model predictions for individual examples and for the dataset as a whole.
- The frontend shows a SHAP feature importance visualization. If the ai_core service cannot produce an interactive plot (missing plotting libs), it returns a PNG base64 fallback which the UI displays.
- Interpretation (plain language): features with large positive SHAP values increase the predicted probability for the positive class; large negative values reduce it. We show aggregate importances and per-feature distributions.

Fairness summaries

- The system computes simple group fairness checks (e.g., by a protected attribute like gender or race): group-wise acceptance rates, parity gaps, and visual bar charts.
- We display a short compliance status (Compliant / Needs attention) based on configurable thresholds; judges should treat this as an illustrative demo, not a certified compliance test.

Limitations

- This demo trains quick models for demonstration. For production, use full datasets, cross-validation, hyperparameter tuning, and robust fairness evaluation.
- SHAP can be computationally heavy for large models/datasets; the ai_core service uses lightweight models for fast interactive demos.
