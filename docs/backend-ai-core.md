## AI Core (FastAPI) — Backend Design

This service exposes endpoints to run fairness analysis and return reports.

Endpoints
- POST /ai_core/analyze — Accepts dataset payload and returns analysis id + summary metrics (demographic parity, equal opportunity, etc.).
- GET /ai_core/reports/{id} — Returns stored analysis report.

Implementation notes
- Currently uses stub helpers in `ai_core/utils` to simulate AIF360/SHAP outputs.
- Persistence (MongoDB) will be wired in Phase 2; for now endpoints return mock objects.
