# Day 14 — Load, Stress & Performance Profiling Plan

## Goals
Prove performance envelope, identify bottlenecks, derive scaling/capacity recommendations, and author mitigation playbooks.

## Scenarios
- S1 Auth + Dashboard: register/login, list reports
- S2 Upload & Analyze: dataset upload + /analyze + poll /report/:id
- S3 Explainability-heavy: repeated /analyze with larger payload (triggers SHAP path)
- S4 Report Retrieval: concurrent /report/:id and /reports/:userId
- S5 Mixed: weighted 10% S1 / 50% S2 / 25% S3 / 15% S4

## Phases
1. Baseline (1–5 RPS) – latency percentiles, resource usage snapshot
2. Ramp-Up (1 → target RPS) – throughput vs latency, error rate
3. Spike (×2–5 sudden surge) – resilience, recovery window
4. Stress to Failure – push until error thresholds; capture break point
5. Soak (1–3h moderate load) – memory growth, connection stability

## Targets (Initial)
- P50 < 300ms, P95 < 1s, P99 < 2.5s (API)
- ai_core analyze P95 < 12s current (optimize later), explain path target P95 < 800ms (if TreeExplainer available)
- Error rate < 0.5% (4xx+5xx) sustained load
- Throughput: 50 RPS sustained mixed → scale plan to 200 RPS, spike to 500 RPS

## Metrics to Collect
- Prometheus: http_requests_total, http_request_duration_seconds, ai_core_analyze_seconds, ai_core_errors_total, process_{cpu_seconds_total,resident_memory_bytes}
- Host: CPU%, RSS, network I/O, disk I/O
- DB: ops/sec, connection pool saturation, slow query log
- Logs: correlated by X-Request-Id, analysisId
- Profiling: CPU flamegraph, heap snapshot during peak

## Tooling
- k6 scripts for scenarios, run orchestrator script for phases
- Locust optional for adaptive scaling tests
- Profilers: py-spy (ai_core), node --inspect / 0x (backend)

## Artifacts
Store all outputs under `docs/perf/day14/artifacts/`:
- k6 JSON results
- Prometheus snapshot exports
- Flamegraphs (svg)
- Capacity plan (capacity_plan.md)
- Playbooks (playbooks.md)

## Acceptance Criteria
PASS if sustained 50 RPS mixed with P95 <1s and error <0.5% for 15m and no memory leak in 1h soak.
FAIL otherwise or lacking remediation actions.

## Next Steps
1. Implement k6 scripts
2. Create orchestrator
3. Run baseline, capture metrics
4. Iterate ramp→spike→stress
5. Profile hotspots at stress threshold
6. Produce capacity_plan.md + playbooks.md
