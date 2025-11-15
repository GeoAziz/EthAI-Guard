# Observability (Prometheus + structured logs)

This document lists the main metrics and log fields exposed by the demo for Day‑8.

Metrics (Prometheus names)
- http_requests_total{method,route,status} — counter of HTTP requests handled by the backend.
- http_request_duration_seconds_bucket / _sum / _count — request latency histogram buckets for the backend.
- ai_core_analysis_seconds_count / _sum — duration metric for time spent in ai_core analyze (observed by backend and ai_core).
- ai_core_requests_total{status} — ai_core analyze request counter (success/error).
- ai_core_errors_total — ai_core error counter.
- Default process metrics from client (CPU/memory) via collectDefaultMetrics.

Log schema
- All produced logs are JSON objects (one per line) with at least these fields when available:
  - timestamp: ISO8601 timestamp
  - level: log level (INFO/ERROR/etc)
  - request_id: UUID shared between frontend→backend→ai_core for correlation
  - user_id: authenticated user id when available
  - route: requested route
  - status: HTTP status code for responses
  - duration: request or analysis duration in seconds
  - analysis_id: when an analysis is created or completed
  - message or msg: free-form message text

Example log (backend):

```json
{"timestamp":"2025-11-15T07:00:00Z","level":"INFO","request_id":"6b8f...","user_id":"1","route":"/analyze","status":200,"duration":2.34,"analysis_id":"691807a4...","msg":"analyze_completed"}
```

How to use
- Scrape `/metrics` from the backend or ai_core to collect Prometheus metrics.
- Use `request_id` to correlate logs across services (backend and ai_core).
- The CI `chaos-smoke` job scrapes these endpoints after the scenario and archives metrics and logs for debugging.
