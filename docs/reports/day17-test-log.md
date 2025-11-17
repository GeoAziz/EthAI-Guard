# Day 17 Test Log — Evaluation Pipeline Manual Checks

## Summary
Manual validation of /v1/evaluate endpoint & UI conceptual behaviors using crafted payloads.

## Test Matrix
| Case | Payload Highlights | Expected | Result |
|------|--------------------|----------|--------|
| 1 | Minimal valid (no sensitive attr) | fairness_flag=false, medium/low risk | ✅ |
| 2 | Fairness imbalance (8 identical sensitive values) | fairness_flag=true, risk bump + reason | ✅ |
| 3 | Extreme output (>90 normalized) | bias_flag=true, risk bump | ✅ |
| 4 | Missing metadata (omit decision_timestamp) | compliance_flag=true | ✅ |
| 5 | Combined (fairness + bias + compliance) | high risk with 3 reasons | ✅ |
| 6 | Validation fail (no user_id) | 400 validation_failed | ✅ |
| 7 | Large feature vector (200 numbers) | performance < 20ms | ✅ |

## Payload Examples
### Fairness Imbalance
```
{
  "user_id": "u1",
  "model_id": "m1",
  "input_features": { "feature_a": [1,2,3], "sensitive": ["X","X","X","X","X","X","X","X"] },
  "context": { "sensitive_attribute": "sensitive" }
}
```

### Combined High Risk
```
{
  "user_id": "uHR",
  "model_id": "modelHIGH",
  "input_features": { "feature_a": [9999,9999,9999], "sensitive": ["A","A","A","A","A","A","A","A"] },
  "context": { "sensitive_attribute": "sensitive" }
}
```

## Timing Observations
| Feature Count | Latency (approx ms) |
|---------------|---------------------|
| 5 | 4 |
| 50 | 7 |
| 200 | 14 |

## Log Sample
```
{"route":"/v1/evaluate","user_id":"uHR","model_id":"modelHIGH","risk_score":100,"risk_level":"high"}
```

## Notes
- Determinism confirmed: repeating same payload yields identical normalized_output & risk reasons.
- Sensitive attribute missing -> fairness check gracefully returns ratio=null.
- Missing metadata fields aggregated in compliance.missing_fields.

## Follow-Ups
- Add automated performance test to ensure latency budget maintained.
- Persist evaluation audit trail (future requirement).

**Status:** All manual tests passed.
