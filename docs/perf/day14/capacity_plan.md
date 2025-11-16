# Capacity Plan (Day 14 Draft)

| Service    | Current Config | Observed Stable Throughput | Target Throughput | Estimated Replicas | CPU / Replica | RAM / Replica | Notes |
|------------|----------------|----------------------------|-------------------|--------------------|---------------|---------------|-------|
| backend    | 1 container    | ~15 req/s auth flow        | 50 RPS mixed      | 3-4                | ~0.2 cores    | 90-120 MB     | Node express; p95 latency ~1.9s; consider PM2 clustering |
| ai_core    | 1 container    | ~3.4 req/s analyze (500 rows) | 20 analyze RPS | 6-8                | ~0.5 cores    | 300-350 MB    | SHAP heavy (avg 2.5s/req); outliers 40s+; scale horizontally + queue |
| mongo      | single         | minimal (in-memory test mode) | 200 read RPS   | 1-2                | low           | 512 MB        | Baseline uses in-memory; evaluate replica set under real load |
| postgres   | single         | minimal (auth only)        | low write volume  | 1                  | low           | 256 MB        | Mostly auth/session; single instance sufficient |
| frontend   | 1 container    | not tested (static)        | static asset reqs | 1–2                | low           | 100 MB        | CDN recommended for production |

## Autoscaling Rules (Baseline-Informed)
- **backend:** scale out when CPU > 70% for 3m OR p95 latency > 2s (baseline p95: 1.9s)
- **ai_core:** scale out when:
  - Average `ai_core_http_request_duration` > 5s for 2m (baseline avg: 2.5s)
  - OR pending analyze requests > 10 (implement queue depth metric)
  - OR p99 latency > 15s
- **mongo:** add read replica when read ops > 150 RPS sustained OR p99 query > 100ms
- **Horizontal scaling targets:**
  - backend: maintain p95 < 2s under peak load (scale from 1→3 replicas at 40 RPS)
  - ai_core: maintain p95 < 8s for 500-row datasets (scale from 1→6 replicas at 15 analyze RPS)

## Sizing Methodology (Revised After Ramp Failure)
1. **Single-replica limits confirmed:**
   - Backend: ~15 req/s auth flow (baseline), <5 req/s mixed with analyze (ramp)
   - AI Core: ~3-4 req/s analyze (500 rows baseline), <1 req/s (2000 rows ramp)
2. **Horizontal scaling formula:** `replicas = (target_rps / single_replica_capacity) * 1.3`
   - Example: 25 analyze RPS → (25 / 3) * 1.3 = **11 ai_core replicas**
   - Example: 50 mixed RPS → (50 / 5) * 1.3 = **13 backend replicas**
3. **Async queue model recommended:** Decouple analyze requests to prevent cascading failures
4. **CPU profiling needed:** Identify bcrypt vs SHAP bottleneck ratio before final sizing

## Baseline Data (Completed)
✅ **Auth Dashboard (S1):** 738 iterations, 2952 requests, 0% errors, p95 latency 1.91s  
✅ **Upload/Analyze (S2):** 51 iterations, 204 requests, 0% errors, p95 latency 530ms (3 outliers >500ms)  
✅ **Backend metrics:** 90MB RAM, cumulative 425s CPU  
✅ **AI Core metrics:** 294MB RAM, cumulative 30s CPU, avg 2.53s per analyze request  

## Ramp Phase Data (Completed - FAILED)
❌ **25 req/s target with 2000-row datasets FAILED**  
- **Error rate:** 66.81% (4,666 failed / 2,317 succeeded)
- **Dropped iterations:** 3,680 (system could not keep up)
- **Latency degradation:** p95 7.17s (vs baseline 1.9s = 277% increase)
- **VUs exhausted:** 100 max insufficient (needed 300+ for 10.66s avg iteration time)
- **Backend CPU post-test:** 1014s total (vs 425s post-baseline = **139% increase**)
- **Backend memory:** 96MB (5MB increase, minimal growth)
- **AI Core CPU:** 32s total (vs 30s post-baseline = **7% increase**, suggests backend bottleneck)
- **Root cause:** bcrypt hashing + 2000-row SHAP compute overwhelmed single-replica services

## Pending Data (Adjusted Approach)
- ⚠️ **Skipping mixed/spike/stress at 25+ req/s** until horizontal scaling implemented
- Run **reduced ramp (5 req/s, 500 rows)** to establish realistic single-replica capacity
- Capture CPU flamegraphs during 5 req/s load to confirm bcrypt vs SHAP bottleneck
- Test **auth-only scenario** (10 req/s) vs **analyze-only** (2 req/s) to isolate components
- Memory growth during 30m soak test (at sustainable 3 req/s rate)

## Immediate Actions (Post-Ramp Failure)
### Critical (Blocking Production)
1. **Implement horizontal scaling:** Kubernetes HPA or Docker Compose replicas (backend: 3-5, ai_core: 6-8)
2. **Add async analyze queue:** Use Bull/Redis or Celery to prevent blocking event loop
3. **Enable PM2 clustering:** Run backend with `pm2 start --instances 4` for multi-core utilization
4. **Reduce default row limits:** Cap analyze requests at 1000 rows; recommend sampling for >5000 rows

### High Priority (Performance)
5. **SHAP caching strategy:** Cache baseline datasets + model hashes to avoid repeated computation
6. **Database migration:** Replace in-memory mode with MongoDB + connection pooling for production
7. **Request timeout tuning:** Set explicit 30s timeout on analyze proxy to fail-fast
8. **Rate limiter adjustments:** Implement adaptive limits based on queue depth/CPU thresholds

### Medium Priority (Observability)
9. **APM integration:** Add Datadog/New Relic traces for analyze request lifecycle
10. **Queue depth metrics:** Expose `analyze_queue_length` metric for autoscaling triggers
11. **Error rate alerts:** Alert when error rate >5% sustained for 2m
12. **CPU flamegraphs:** Profile at 5 req/s to confirm bcrypt:SHAP ratio
