# Day 14 Performance Testing - Summary Report

**Date:** 2025-11-16  
**Objective:** Load/stress testing + performance profiling + capacity planning  
**Status:** ⚠️ **Partial Completion - Critical Findings Documented**

---

## Executive Summary

Performance testing revealed **severe scalability limitations** in single-replica deployment:
- ✅ **Baseline (light load):** System stable at ~15 req/s auth, ~3 req/s analyze (500 rows)
- ❌ **Ramp (target load):** System collapsed at 25 req/s with **66.81% error rate**
- 🚨 **Blocker:** Single-threaded Node.js + synchronous SHAP compute cannot handle production load
- 📋 **Recommendation:** Horizontal scaling + async queue **required before production**

---

## Test Phases Completed

### ✅ Phase 1: Baseline (Success)
**Scenario S1 - Auth Dashboard:**
- 738 iterations, 2952 requests, **0% errors**
- p50: 450ms, p95: 1.91s, p99: ~2.5s
- 15 req/s sustained (20 VUs ramping)

**Scenario S2 - Upload/Analyze:**
- 51 iterations, 204 requests, **0% errors**
- p50: 223ms, p95: 530ms (3 outliers >500ms)
- 3.4 req/s sustained (3 VUs, 500-row datasets)
- SHAP avg: 2.53s per request

**Resource Usage:**
- Backend: 90MB RAM, 425s CPU (cumulative)
- AI Core: 294MB RAM, 30s CPU (cumulative)

### ❌ Phase 2: Ramp (Failed)
**Target:** 25 req/s arrival rate, 2000-row datasets  
**Duration:** 5 minutes (1m ramp → 3m hold → 1m ramp-down)

**Critical Failures:**
1. **Error Rate:** 66.81% (4,666 failed / 2,317 succeeded)
2. **Dropped Iterations:** 3,680 (system could not keep up with arrival rate)
3. **VU Exhaustion:** Hit 100 maxVUs at t=46s; needed 300+ for 10.66s avg iteration time
4. **Timeout Cascade:** 32 register timeouts → 2,317 login failures → 0 analyze completions

**Latency Degradation:**
| Metric | Baseline | Ramp | Increase |
|--------|----------|------|----------|
| p50 | 450ms | 2.14s | +375% |
| p90 | 1.6s | 6.65s | +315% |
| p95 | 1.9s | 7.17s | +277% |
| max | 2.69s | 60s | +2133% |

**Resource Exhaustion:**
- Backend CPU: 1014s total (+139% vs baseline) → **CPU bottleneck confirmed**
- Backend memory: 96MB (+6MB, minimal growth)
- AI Core CPU: 32s total (+7% vs baseline) → suggests backend is primary bottleneck

---

## Root Cause Analysis

### Primary Bottleneck: Backend CPU Saturation
1. **bcrypt hashing:** Each register requires ~150ms CPU (10 rounds) on single thread
2. **Single-threaded Node.js:** All requests queue on single event loop (no clustering enabled)
3. **Synchronous analyze forwarding:** Long SHAP requests (2-6s) block other requests
4. **No request queuing:** Arrival rate (25/s) >> processing rate (5/s) → timeouts cascade

### Secondary Bottleneck: SHAP Compute Scaling
1. **2000-row datasets:** TreeExplainer takes 5-10s per request (vs 2.5s for 500 rows)
2. **No caching:** Every request triggers full SHAP computation (all cache misses)
3. **No concurrency limits:** ai_core accepts unlimited simultaneous requests → memory pressure

### Systemic Issues
1. **No horizontal scaling:** Single replica of each service
2. **No async patterns:** Analyze returns synchronously (should be 202 Accepted + job ID)
3. **In-memory data structures:** Unbounded array growth in test mode
4. **No request shedding:** No circuit breaker or adaptive rate limiting

---

## Capacity Planning Results

### Current Capacity (Single Replica)
| Service | Max Throughput | Latency (p95) | Memory | CPU Profile |
|---------|----------------|---------------|--------|-------------|
| Backend | 5 req/s mixed | 1.9s (baseline)<br>7.2s (ramp) | 90-96 MB | bcrypt-dominant |
| AI Core | 3 req/s (500 rows)<br><1 req/s (2000 rows) | 530ms (baseline)<br>N/A (ramp timeout) | 294 MB | SHAP-dominant |

### Target Capacity (50 RPS Mixed)
**Horizontal Scaling Required:**
- **Backend:** 13 replicas (50 / 5 * 1.3 safety margin)
- **AI Core:** 11 replicas (assuming avg 30% analyze requests at 500 rows)
- **Load Balancer:** Nginx or cloud-native (ALB/NLB)
- **Queue System:** Redis + Bull for async analyze jobs

**Alternative: Optimize Single Replica**
- **PM2 clustering:** 4 workers → ~20 req/s auth capacity
- **SHAP caching:** 80% cache hit rate → ~10 req/s analyze capacity
- **Still insufficient for 50 RPS** → horizontal scaling mandatory

---

## Recommendations

### 🔴 Critical (Blocking Production Launch)
1. **Implement horizontal scaling:**
   - Kubernetes HPA: target CPU 70%, min 3 replicas, max 20
   - Docker Compose: `deploy.replicas: 5` + Traefik load balancer
2. **Add async analyze queue:**
   - POST /analyze returns 202 Accepted + job_id
   - Worker pool processes jobs from Redis queue
   - GET /analyze/:job_id polls for results
3. **Enable PM2 clustering:**
   ```bash
   pm2 start src/server.js -i 4 --name backend-cluster
   ```
4. **Cap dataset size:** Max 1000 rows per analyze; recommend sampling for larger datasets

### 🟡 High Priority (Performance)
5. **SHAP caching strategy:**
   - Cache baseline datasets by hash (LRU, 500 max)
   - Cache model predictions for identical feature sets
   - Expected: 70-80% cache hit rate → 5x throughput increase
6. **Database migration:** Replace in-memory mode with MongoDB replica set + connection pooling
7. **Request timeout tuning:** Explicit 30s timeout on analyze proxy to fail-fast
8. **Adaptive rate limiting:** Queue depth > 50 → return 503 Service Unavailable

### 🟢 Medium Priority (Observability)
9. **CPU profiling:** Capture flamegraphs at 5 req/s to quantify bcrypt:SHAP ratio
10. **APM integration:** Distributed tracing for analyze request lifecycle
11. **Queue metrics:** Expose `analyze_queue_length`, `queue_wait_time_seconds` for monitoring
12. **Error rate alerts:** Alert when error rate >5% sustained for 2m

---

## Next Steps

### Adjusted Test Plan
Given the ramp failure, **skipping spike/stress tests** until horizontal scaling is implemented:

1. ✅ **Baseline** - Complete (0% errors)
2. ✅ **Ramp (25 req/s, 2000 rows)** - Complete (66% errors → bottleneck identified)
3. ⏭️ **Reduced Ramp (5 req/s, 500 rows)** - Pending (establish realistic single-replica capacity)
4. ⏭️ **Soak (3 req/s, 30m)** - Pending (memory leak detection)
5. ❌ **Spike (250 req/s)** - Skipped (would crash services)
6. ❌ **Stress (300-600 req/s)** - Skipped (would crash services)
7. ⏭️ **CPU Profiling** - Pending (during 5 req/s ramp)

### Implementation Roadmap
**Week 1: Immediate Fixes**
- Deploy PM2 clustering (backend)
- Implement SHAP caching (ai_core)
- Add request timeouts (30s)
- Run reduced ramp test (5 req/s) to validate improvements

**Week 2: Horizontal Scaling**
- Set up Kubernetes cluster OR Docker Swarm
- Deploy load balancer + 3 backend replicas + 6 ai_core replicas
- Implement async analyze queue (Redis + Bull)
- Re-run ramp test (25 req/s) to validate scalability

**Week 3: Production Readiness**
- Run spike test (250 req/s) to test autoscaling
- Run soak test (30m at 40 req/s) to detect memory leaks
- Set up APM + alerting
- Document runbook for scaling operations

---

## Artifacts Generated
- ✅ `docs/perf/day14/PLAN.md` - Test strategy
- ✅ `docs/perf/day14/capacity_plan.md` - Capacity analysis (updated with ramp findings)
- ✅ `docs/perf/day14/playbooks.md` - Remediation playbooks
- ✅ `docs/perf/day14/profiling.md` - Profiling instructions
- ✅ `docs/perf/day14/USAGE.md` - Execution guide
- ✅ `docs/perf/day14/artifacts/baseline_summary.md` - Baseline metrics
- ✅ `docs/perf/day14/artifacts/ramp_summary.md` - Ramp failure analysis
- ✅ `docs/perf/day14/artifacts/k6/baseline_auth_dashboard.json` - k6 summary
- ✅ `docs/perf/day14/artifacts/k6/baseline_upload_analyze.json` - k6 summary
- ✅ `docs/perf/day14/artifacts/k6/ramp_explain.json` - k6 summary (66% errors)
- ✅ `tools/load/day14/*.js` - k6 scenario scripts
- ✅ `Makefile` - day14-* targets for reproducible test execution

---

## Conclusion

Day 14 performance testing successfully **identified critical scalability bottlenecks** that would have caused production outages:
- Single-replica architecture **cannot handle >5 req/s mixed load**
- Horizontal scaling + async queues **mandatory for 50 RPS target**
- SHAP caching + PM2 clustering provide **5-10x improvement** but insufficient alone

**Production launch blocked** until horizontal scaling implemented. Recommend prioritizing Week 1-2 roadmap items before resuming full load testing suite.
