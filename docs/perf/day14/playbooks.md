# Failure & Mitigation Playbooks (Day 14)

## High Error Rate (>0.5% sustained)
1. Check Prometheus: spikes in 5xx vs 4xx? Identify dominant route label.
2. Inspect backend logs filtered by route + status.
3. If ai_core failures: scale ai_core replicas (kubectl scale / docker compose up --scale).
4. If auth failures: check DB connectivity / rate limiter thresholds.
5. Mitigation: introduce temporary throttling (/analyze) to protect system.
6. Open incident: create GitHub issue + notify #ops channel.

## DB Latency Spike
1. Enable Mongo profiler or Postgres slow query log.
2. Identify query patterns; confirm indexes.
3. Add transient cache (SimpleCache / Redis) for hot report endpoints.
4. If write contention: queue non-critical writes.

## Memory Pressure / Leak
1. Capture heap snapshot (node --inspect, py-spy dump).
2. Compare object counts baseline vs current.
3. Restart pods with rolling strategy to relieve pressure.
4. Reduce cache TTLs; flush SHAP caches.

## SHAP Storm (Explainability Surge)
1. Detect surge via `ai_core_analyze_seconds` histogram shift.
2. Switch heavy explain to async queue (return pending status).
3. Increase ai_core replicas temporarily.
4. Reduce background dataset size for TreeExplainer.

## Rate Limiter Hotspot (429 Burst)
1. Verify legitimate traffic vs runaway test.
2. Temporarily raise RATE_MAX or apply bypass for trusted internal tests.
3. Long term: implement adaptive rate limiting (token bucket per key).

## Network Saturation
1. Check host network I/O metrics.
2. Enable gzip/deflate for large JSON responses.
3. Batch small requests or implement GraphQL aggregation.

## Autoscaling Failure
1. Verify metrics source (Prometheus adapter functional).
2. Manually scale replicas to maintain SLA.
3. Investigate HPA logs / scaling events.

## Incident Closure Checklist
- SLA restored (latency/error thresholds within limits)
- Root cause documented
- Preventative action ticket created
