# API Specification — /v1/evaluate

## Endpoint
`POST /v1/evaluate`

Evaluates a decision payload through deterministic simulation, ethical rule checks, risk scoring, and explanation packaging.

## Request Body
```
{
  "user_id": "string (1-128)",
  "model_id": "string (1-128)",
  "input_features": { "feature_name": value | [values] | object },
  "context": { "sensitive_attribute": "string", ... },
  "decision_timestamp": "ISO8601" (optional)
}
```

### Field Details
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| user_id | string | yes | Actor initiating evaluation |
| model_id | string | yes | Identifier for pseudo-model seed |
| input_features | object | yes | Key/value pairs; arrays allowed |
| context | object | no | Additional metadata (fairness config) |
| decision_timestamp | string | no | Default: server time at evaluation |

### Example Request
```
POST /v1/evaluate
Content-Type: application/json
{
  "user_id": "user123",
  "model_id": "modelA",
  "input_features": {
    "amount": 2500,
    "duration": 36,
    "sensitive": ["groupA","groupA","groupB"]
  },
  "context": { "sensitive_attribute": "sensitive" }
}
```

## Successful Response (200)
```
{
  "request_id": "uuid",
  "timestamp": "2025-11-17T10:44:31.123Z",
  "user_id": "user123",
  "model_id": "modelA",
  "input_features": { ... },
  "simulation": {
    "raw_output": 472,
    "normalized_output": 47,
    "feature_count": 4,
    "feature_vector_preview": [2500,36,3,1]
  },
  "rules": {
    "fairness": { "fairness_flag": false, "reason": "distribution_ok", "ratio": 0.667, "threshold": 0.7 },
    "bias": { "bias_flag": false, "reason": "normal_range", "output": 47, "threshold": 90 },
    "compliance": { "compliance_flag": false, "missing_fields": [], "required_count": 3 }
  },
  "risk": { "score": 47, "level": "medium", "reasons": [] },
  "explanation": {
    "summary": "Risk level: MEDIUM (score=47).",
    "details": ["No specific risk amplifiers triggered; baseline simulation output considered acceptable."],
    "recommended_action": "Monitor this decision; consider sampling for fairness audit."
  }
}
```

## Error Responses
| HTTP | error | Description |
|------|-------|-------------|
| 400 | validation_failed | Missing or invalid fields; includes details array |
| 500 | evaluation_failed | Internal unexpected failure |

### Validation Error Example
```
400
{
  "error": "validation_failed",
  "details": [
    { "msg": "Invalid value", "param": "user_id", "location": "body" }
  ]
}
```

## Risk Levels
| Level | Score Range | Action Guidance |
|-------|-------------|-----------------|
| low | 0–33 | Log only |
| medium | 34–66 | Monitor / periodic sampling |
| high | 67–100 | Immediate review / potential override |

## Metrics
| Name | Type | Labels | Description |
|------|------|--------|-------------|
| evaluations_total | Counter | none | Total evaluations processed |
| evaluations_high_risk_total | Counter | none | Count of high risk evaluations |

## Logging
Each successful evaluation emits:
```
{"route":"/v1/evaluate","user_id":"user123","model_id":"modelA","risk_score":47,"risk_level":"medium"}
```

## Determinism Guarantee
Given identical (model_id, ordered feature set) input, normalized_output remains stable. Risk variations depend solely on rule triggers.

## Extensibility
| Concern | Strategy |
|---------|----------|
| Additional rules | Add new functions to rules/engine.js and include in runRules |
| Configurable thresholds | Externalize constants to env or config file |
| Model integration | Swap simulation with real inference call |
| Audit persistence | Append DB write after packaging response |

---
**Status:** Implemented Day 17
