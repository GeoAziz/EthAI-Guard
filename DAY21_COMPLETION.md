# Day 21 — Incident Handling, Safe Retraining Workflow, Forensics, Promotion Pipeline

This day introduces a production-grade governance flow:

- Incident Response Playbook (docs/incidents/incident_playbook.md)
- Retrain API and Worker (trigger, prepare, train, validate)
- Evidence Export endpoint (bundle decisions, snapshots, metadata)
- Manual Promotion controls (gated, logged, reversible)
- Frontend pages to operate retrain and promotion
- Tests for retrain lifecycle, evidence export, and promotion gating

## What was added

- Backend
  - Routes
    - POST /v1/models/:id/trigger-retrain
    - GET /v1/retrain/:requestId
    - GET /v1/models/:id/versions
    - POST /v1/models/:id/promote
    - POST /v1/alerts/:id/export
  - Storage: backend/src/storage/models.js with in-memory and Mongo-backed persistence for
    - RetrainRequest, ModelVersion, AuditLog
  - Job: backend/src/jobs/retrain.js
    - Prepares small dataset, simulates training, calls AI Core validation, updates status and artifacts
- AI Core
  - Validation endpoint already wired (Day 19). Used here for automated checks.
- Frontend
  - /models: list versions
  - /models/{id}/retrain: trigger retrain job
  - /models/{id}/promote: manual promotion with confirmation
- Docs
  - docs/incidents/incident_playbook.md
  - Enriched with retrain workflow and evidence export usage
- Tests
  - backend/tests/test_retrain_workflow.test.js
  - backend/tests/test_evidence_export.test.js
  - backend/tests/test_promotion_flow.test.js
  - backend/tests/test_evidence_export_content.test.js (verifies drift/fairness sections exist)

## How to run (local)

- Backend
  - PORT=3001 node src/server.js
- Frontend
  - NEXT_PUBLIC_BACKEND_URL=http://localhost:3001 npm run dev
- AI Core
  - uvicorn ai_core.main:app --port 8100

## Notes

- Evidence export uses optional `archiver`. If unavailable, a JSON bundle is produced; tar.gz is best-effort.
- Evidence export bundle now includes drift_snapshot and fairness_metrics placeholders plus CI metadata.
- Retraining/training are intentionally light for governance demonstration; validation reuses Day 19 engine.
- All key events are written to the AuditLog storage.

### Stability fixes made during implementation

- Validation router no longer mounts with global Firebase auth, avoiding 500s when Firebase is not configured in tests.
- Analyze route now lazily requires axios to play nice with Jest mocks and includes a safe stub fallback in non-production.

## Checklist

- [x] Playbook
- [x] Retrain API & worker
- [x] Evidence export
- [x] Manual promotion
- [x] Frontend pages
- [x] Tests
- [x] All backend tests passing locally (7/7)
