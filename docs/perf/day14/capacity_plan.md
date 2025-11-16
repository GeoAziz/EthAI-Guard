# Capacity Plan (Day 14 Draft)

| Service    | Current Config | Observed Stable Throughput | Target Throughput | Estimated Replicas | CPU / Replica | RAM / Replica | Notes |
|------------|----------------|----------------------------|-------------------|--------------------|---------------|---------------|-------|
| backend    | 1 container    | TBD                        | 50 RPS mixed      | TBD                | TBD           | TBD           | Node express; consider clustering/PM2 |
| ai_core    | 1 container    | TBD                        | 50 analyze RPS    | TBD                | TBD           | TBD           | SHAP heavy; scale horizontally |
| mongo      | single         | TBD                        | 200 read RPS      | TBD                | n/a           | n/a           | Evaluate index usage |
| postgres   | single         | TBD                        | low write volume  | 1                  | n/a           | n/a           | Mostly auth/session |
| frontend   | 1 container    | TBD                        | static asset reqs | 1–2                | low           | low           | CDN recommended |

## Autoscaling Rules (Draft)
- backend: scale out when CPU > 70% for 3m OR p95 latency > 1s
- ai_core: scale out when average `ai_core_analyze_seconds` > 8s OR queue length (future) > 10
- mongo: add read replica when read ops > threshold or p99 query > 50ms

## Sizing Methodology
1. Derive per-request CPU cost from flamegraphs at target load.
2. Multiply by desired peak RPS → total CPU cores needed.
3. Add 30% headroom for spikes.

## Pending Data
Populate after baseline & ramp:
- Per-service CPU utilization at target
- Memory working set after 1h soak
- p95 latencies by scenario

## Actions Post-Data Collection
- Adjust replica counts
- Refine autoscaling triggers
- Evaluate SHAP optimization (background size, caching)
