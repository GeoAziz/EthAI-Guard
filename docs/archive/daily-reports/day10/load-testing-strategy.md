# Load Testing Strategy (Day 10)

Goal: Validate EthAI under realistic fintech traffic with confidence it meets latency and reliability expectations.

Scenarios (RPS = requests per second)
- Baseline: 1–5 rps for 10 minutes
  - Purpose: baseline latencies and correctness
- Moderate: 20–40 rps for 15 minutes
  - Purpose: check steady-state reliability at fintech scale
- Spike: 50–100 rps for 5 minutes
  - Purpose: observe autoscaling/recovery behavior
- Sustained: 10 rps for 60 minutes
  - Purpose: detect memory leaks and performance drift

Workflows to simulate
- Register → login → submit /analyze → fetch /reports/{id}
- Dashboard pulls: list reports, get metrics
- Token refresh: POST /auth/refresh every ~12 minutes per user

SLIs to measure
- Latency: P50/P90/P95/P99 for key routes (/auth/*, /analyze, /reports/*, /metrics)
- Error rate: % 4xx (validation/rate-limit), % 5xx (server faults)
- ai_core latency: time spent in model explain (prometheus histogram)
- Resource usage: CPU, memory per service
- MongoDB: query timings, connection errors
- Rate limiting: activation frequency
- Slow request logs: count and routes

Test data & setup
- Use a seeded dataset with consistent shapes
- Use 200–500 concurrent virtual users
- Estimated daily requests: 1500–5000 analyses
- Peak: 10–20 req/sec during high-traffic windows

Execution guidance (k6 or Locust)
- Do NOT run from a laptop; use a separate load injector VM
- Warm up 2–3 minutes before sampling stats
- Export Prometheus+service logs during tests
- Tag test runs with a unique run_id for correlation

Success criteria (initial)
- P95 API latency < 1.0s, P99 < 2.5s
- ai_core explain P95 < 800ms (for configured workload)
- Error rate < 0.5% during baseline/moderate; < 2% during spikes
- No sustained memory growth over 60 minutes

Artifacts to collect
- Prometheus snapshots (backend + ai_core)
- Docker stats samples
- MongoDB metrics or logs
- k6/Locust reports
- Annotated timeline of spikes and anomalies

Reporting template
- Run: <id/date>
- Scenario: baseline/moderate/spike/sustained
- RPS and concurrency: <value>
- Latency P50/P90/P95/P99: <values>
- Error rate: <value>
- ai_core explain histogram: <percentiles>
- Findings: <notes>
- Recommendations: <actions>
