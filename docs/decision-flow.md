# Decision Flow: End-to-End AI Decision Evaluation Pipeline (E2E-DEEP)

## Overview
The E2E-DEEP pipeline processes a user-triggered model decision through simulation, ethical rule assessment, risk scoring, and explanation packaging. It enables deterministic behavior on constrained compute while preserving an extensible architecture for future real ML integration.

## Stages
1. Input Ingestion
2. Simulation (Pseudo-Model)
3. Ethical Rules Evaluation
4. Risk Scoring
5. Explanation Generation
6. Decision Packaging & Response

## 1. Input Ingestion
Incoming POST `/v1/evaluate` request body:
```
{
  "user_id": "string",
  "model_id": "string",
  "input_features": { "feature_name": value|[values], ... },
  "context": { "sensitive_attribute": "sensitive", ... },
  "decision_timestamp": "ISO8601" (optional)
}
```
Validation ensures core identifiers and feature object presence.

## 2. Simulation Engine
A deterministic pseudo-model converts ordered feature values + model_id into a stable numeric output:
- Feature flattening (sorted keys, array expansion)
- Weighted sum + hash-based perturbation
- Raw range 0–999 mapped to normalized 0–100

Purpose: reproducible evaluations without heavy inference dependencies.

## 3. Ethical Rules Evaluation
Rules applied:
| Rule | Inputs | Logic | Output |
|------|--------|-------|--------|
| Fairness | sensitive attribute values | Imbalance if max group ratio > 0.7 | fairness_flag + ratio |
| Bias | simulation normalized output | Extreme if > 90 | bias_flag |
| Compliance | metadata presence | Missing required fields user_id, model_id, decision_timestamp | compliance_flag |

## 4. Risk Scoring
Base = normalized simulation output. Adjustments:
- +15 if fairness imbalance
- +20 if extreme output bias suspected
- +10 if compliance missing fields
Capped at 100. Levels: low (0–33), medium (34–66), high (67–100).

## 5. Explanation Generation
Produces:
```
{
  summary: "Risk level: HIGH (score=87).",
  details: ["Fairness imbalance: ratio=0.82 exceeded threshold 0.7", ...],
  recommended_action: "Immediate review required; consider manual override or secondary model audit."
}
```

## 6. Decision Packaging
Final response merges every layer:
```
{
  request_id,
  timestamp,
  user_id,
  model_id,
  input_features,
  simulation: { raw_output, normalized_output, feature_count },
  rules: { fairness, bias, compliance },
  risk: { score, level, reasons },
  explanation: { summary, details, recommended_action }
}
```

## Extensibility Roadmap
| Future Feature | Extension Point |
|----------------|-----------------|
| Real ML inference | Replace simulation/engine.js with model loader |
| Advanced fairness metrics | Extend rules/engine.js fairness evaluation |
| Dynamic thresholds | External config or DB-driven rule parameters |
| Multilingual explanations | i18n layer around explanation generator |
| Persistent audit logs | Insert DB write in route after packaging |

## Error Handling
- 400: validation_failed → details array
- 500: evaluation_failed → internal error
All errors JSON structured: `{ error, message?, details? }`.

## Observability
Prometheus counters:
- `evaluations_total`
- `evaluations_high_risk_total`
Log line example:
```
{"route":"/v1/evaluate","user_id":"user123","model_id":"modelABC","risk_score":42,"risk_level":"medium"}
```

## Security Considerations
- No PII persisted; evaluation ephemeral.
- Deterministic output avoids re-identification concerns.
- Validation rejects malformed inputs early.

## Performance Characteristics (Baseline)
- Typical evaluation < 5ms (in-memory operations only).
- High feature counts (1k+) scale linearly (vector flatten cost).

## Testing Strategy (Day17 slice)
- Unit tests: route validation, normal case, high-risk scenario.
- Manual: varied sensitive distributions, missing metadata.

## Glossary
| Term | Meaning |
|------|---------|
| Simulation | Deterministic approximation of model output |
| Fairness Imbalance | One sensitive group dominates (>70%) |
| Extreme Output | Normalized output >90 indicates potential bias |
| Compliance Missing | Required metadata absent |
| Risk Reasons | Factors increasing risk score beyond baseline |

---
**Status:** Implemented Day 17
