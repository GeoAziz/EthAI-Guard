# EthixAI — Product Spec (One Page)

Purpose
-------
EthixAI is an ethical AI governance engine for financial institutions. It provides bias detection, per-decision explainability, compliance scoring aligned with CBK and global standards, data anonymization, and audit report generation to build trust and support regulatory review.

Target users
------------
- Banks, SACCOs, Microfinance Institutions
- MSMEs impacted by automated decisions
- AI Developers and Data Scientists
- Regulators and Compliance Officers

Core features (MVP)
--------------------
- FairLens Engine: bias detection and fairness metrics using AIF360 and custom statistical checks.
- ExplainBoard: per-decision explainability using SHAP/LIME, with visualizations for features and contributions.
- Ethics Compliance Check: rule-based scoring mapped to CBK guidelines and EU AI Act principles.
- Data Privacy Guard: preprocessing/anonymization pipeline to remove direct identifiers and mask sensitive attributes.
- AI Audit Generator: exportable audit reports (JSON/PDF) with decision logs, fairness summaries, and remediation notes.

Success metrics
---------------
- Demonstrable reduction in subgroup disparity metrics (e.g., difference in acceptance rates) on demo dataset.
- Ability to produce per-decision SHAP explanations within 500ms for a single prediction (on demo hardware).
- Generate a compliance score (0–100) for a model and produce an audit report automatically.
- Successful CBK-style pitch document completed and submitted.

Acceptance criteria
-------------------
- End-to-end demo: upload or connect a model, run fairness checks, show a decision in ExplainBoard, and export an audit report.
- Dashboard UI with at least 3 visualizations (feature importances, fairness metrics, compliance score timeline).
- Unit tests covering core backend endpoints and fairness calculations (basic coverage).

Constraints & Assumptions
------------------------
- MVP uses synthetic or public demo datasets (no real customer PII).
- Focus on model-agnostic explainability (works with scikit-learn style predict/predict_proba).
- Hosted demo will run on Render or Hugging Face Space for public showcasing.

Timeline (Hackathon 5 weeks)
---------------------------
- Week 1: Ideation, data prep, product spec (this doc), repo setup.
- Week 2–3: Build fairness engine, explainability endpoints, basic tests.
- Week 3–4: Dashboard UI, demo integration, visualizations.
- Week 4–5: Testing, CI/CD, deployment, CBK submission package.

Owners (initial)
----------------
- Team Lead: Hassan AbdulAziz — backend, AI design, demos.
- Frontend: TBD — dashboard UI and UX.
- Data Engineer: TBD — dataset curation and anonymization.
- Ethics Advisor: TBD — compliance mapping and review.

Deliverables for Day 1
---------------------
- This product spec (saved in `docs/product_spec.md`).
- `README.md` stub at project root.

Next steps
----------
1. Run Day 1 kickoff meeting (30–45 min) to confirm Greenfield vs Brownfield and assign owners.
2. Create GitHub repo `EthixAI` and invite team collaborators.
3. Scaffold backend and frontend skeletons and add minimal CI.
