# Incident Response Playbook

This playbook defines how EthixAI responds to incidents across data drift, fairness degradation, data quality issues, and model performance anomalies. It is designed for auditability and operational clarity.

## Incident Types

- Input Drift: Feature distribution changes (gender, age, income, loan type, etc.)
- Output Drift: Model produces different classes/decisions than normal.
- Fairness Drift: Degradation in fairness metrics (e.g., Equal Opportunity parity drops from 0.94 → 0.72).
- Data Quality Issues: Missing fields, corrupted values, unexpected spikes.
- Performance Anomalies: Latency spikes, memory spikes, model errors.

## Severity Levels

- Low: Slight deviation, no customer harm → Log only
- Medium: Noticeable drift, potential harm → Investigate + evidence collection
- High: Strong drift/fairness drop/model mistakes → Disable inference + notify
- Critical: Clear bias or harmful decision pattern → Disable immediately + begin retrain

## Immediate Response Steps

1. Acknowledge the Alert
   - Mark the alert as acknowledged in the system.
2. Stabilize the System (High/Critical)
   - Disable inference for affected model.
   - Switch to fallback model or rule-based decisioning.
   - Enable throttling on requests.
3. Collect Evidence
   - Use POST /v1/alerts/{id}/export to bundle:
     - Last 10k decisions
   - Drift snapshot and fairness metrics (placeholders included if sources unavailable)
     - Model metadata (version, SHA)
     - Logs from ai_core & backend
     - Recent CI runs metadata
     - Validation comparison vs previous model
4. Create an Investigation Case
   - Auto-create a GitHub issue with: Alert ID, severity, snapshots, evidence link.
5. Start Retrain Process
   - POST /v1/models/{id}/trigger-retrain with reason + notes + baseline snapshot.
   - Monitor status via GET /v1/retrain/{requestId} until `validated_pass` or `failed`.
   - Evidence bundle is automatically updated as evaluations accrue.
6. Post-Incident Review
   - Root cause, fix, affected users, prevention steps, documentation.
   - Tag issue with Incident-YYYY-MM.

## Roles & Responsibilities

- On-call: Acknowledge and stabilize.
- ML Engineer: Data prep, training, validation.
- Product Owner: Approve promotion/rollback.
- Compliance: Review fairness and audit artifacts.

## Thresholds (Defaults)

- PSI ≥ 0.25 → critical
- KL ≥ 0.3 → critical
- Equal Opportunity diff ≥ 0.2 → critical
- Disparate Impact < 0.8 → critical
- Data quality null increase ≥ 0.15 → critical

## Communication

- Slack: #ethixai-incidents
- Email: compliance@ethixai.local
- Pager escalation: On-call rotation

## Audit

- All actions are logged to AuditLog with timestamp, actor, reason, and references.
- Evidence exports include SHA256 hashes for integrity.

## Retrain Workflow (How-to)

- Trigger retrain
   - API: POST /v1/models/{modelId}/trigger-retrain with payload: { reason, notes, baseline_snapshot? }
   - UI: Frontend at /models/{modelId}/retrain
- Track progress
   - API: GET /v1/retrain/{requestId}
- Automated validation
   - The worker calls AI Core validation and updates status to validated_pass/failed
- Promotion controls
   - API: POST /v1/models/{modelId}/promote with { version, requestId? }
   - UI: /models/{modelId}/promote (requires typing PROMOTE to confirm)
   - Gate: promotion via requestId requires that request status is validated_pass

## Evidence Export (How-to)

- API: POST /v1/alerts/{alertId}/export
- Output: JSON bundle at tmp/evidence/<alertId>-<timestamp>/case_bundle.json, with best-effort tar.gz
- Contents:
   - drift_snapshot: PSI/KL/Wasserstein placeholders, window bounds
   - fairness_metrics: parity/opportunity diffs, group bins (placeholders)
   - evaluations: recent evaluation documents (in-memory fallback in test)
   - model + ci metadata: ids, refs, SHAs when available
   - logs: reserved for future enrichment
