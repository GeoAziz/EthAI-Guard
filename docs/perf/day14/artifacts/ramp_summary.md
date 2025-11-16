# Ramp Phase Test Summary - CRITICAL FINDINGS

**Date:** 2025-11-16  
**Target:** 25 req/s (ramping-arrival-rate)  
**Duration:** 5m (1m ramp to 25 → 3m hold → 1m ramp down)  
**Dataset:** 2000 rows per analyze request (SHAP-heavy)  
**Status:** ❌ **FAILED - System Overwhelmed**

## Critical Issues Identified

### 1. **Insufficient VU Pool**
- **Warning at t=46s:** "Insufficient VUs, reached 100 active VUs and cannot initialize more"
- **Root cause:** Each iteration takes avg 10.66s (register + login + analyze 2000 rows)
- **Impact:** k6 could not maintain 25 req/s arrival rate with maxVUs=100
- **Dropped iterations:** 3,680 (12.27/s) - over 60% of target load never executed

### 2. **Request Timeouts & Failures**
- **Error rate:** 66.81% (4,666 failed / 2,317 succeeded)
- **Primary failure:** "request timeout" on `/auth/register` (default 60s timeout exceeded)
- **Check failures:**
  - register: 98% pass (32 timeouts)
  - login: 0% pass (all 2,317 failed - cascade from register timeout)
  - analyze: 0% pass (never reached due to auth failures)

### 3. **Extreme Latency Degradation**
- **HTTP Request Duration:**
  - p50: 2.14s (vs baseline 450ms = **375% increase**)
  - p90: 6.65s (vs baseline 1.6s = **315% increase**)
  - p95: 7.17s (vs baseline 1.9s = **277% increase**)
  - max: **60s** (timeout threshold)
  - avg: 3.49s
- **For successful requests (expected_response:true):**
  - p50: 6s
  - p90: 7.35s
  - p95: 7.66s
  - avg: 6.13s (register/login taking 6s+ under load)

### 4. **Throughput Breakdown**
- **Achieved:** 7.83 iterations/s (vs target 25 = **31% of target**)
- **HTTP requests:** 23.28 req/s total (includes register/login/analyze per iteration)
- **VUs required:** Hit 100 max (insufficient for workload)
- **Iteration duration:** avg 10.66s, p95 12.4s (should be <5s for 25 req/s with proper capacity)

## Resource Exhaustion Hypothesis
1. **Backend bottleneck:** bcrypt hashing (register) + JWT signing under high concurrency → CPU saturation
2. **AI Core SHAP compute:** 2000-row datasets with TreeExplainer → long-running requests block Node.js event loop if forwarding is synchronous
3. **In-memory data structures:** `_users`, `_datasets`, `_reports` arrays grow unbounded → GC pressure
4. **Single-threaded Node.js:** No clustering/PM2 → all requests queue on single event loop

## Comparison to Baseline

| Metric | Baseline (3 VUs, 500 rows) | Ramp (25 req/s, 2000 rows) | Delta |
|--------|---------------------------|---------------------------|-------|
| Error rate | 0% | 66.81% | +66.81% |
| p50 latency | 450ms | 2.14s | +375% |
| p95 latency | 1.9s | 7.17s | +277% |
| Iterations/s | 0.85 | 7.83 | +820% (but 69% failed) |
| VUs needed | 3 | 100+ (insufficient) | 33x+ |

## Immediate Actions Required

### Short-term (Enable Ramp Success)
1. **Reduce row count:** 2000→500 rows to match baseline SHAP compute time
2. **Increase VU pool:** maxVUs=100→300 to handle 10s iteration duration at 25 req/s
3. **Add request timeout:** Explicit 30s timeout in k6 HTTP calls to fail-fast
4. **Separate auth from analyze:** Run auth-only ramp first to isolate bcrypt bottleneck

### Medium-term (Production Readiness)
1. **Backend clustering:** PM2 with 4 workers or Kubernetes HPA (3-5 replicas)
2. **Async analyze queue:** Decouple analyze requests (return 202 Accepted + job ID) to prevent blocking
3. **SHAP caching:** Implement baseline dataset cache + model hash cache to avoid repeated computation
4. **Rate limiting refinement:** Adaptive rate limits based on system load (CPU/memory thresholds)

### Long-term (Scalability)
1. **Horizontal scaling:** Load balancer + multiple backend/ai_core replicas
2. **Background workers:** Celery/Bull queue for analyze tasks with Redis broker
3. **Database migration:** Replace in-memory with MongoDB + connection pooling (not test mode)
4. **APM instrumentation:** Trace analyze request lifecycle to identify exact bottleneck

## Recommendations for Next Tests
- **Skip full 25 req/s ramp** until above fixes implemented
- **Run reduced ramp:** 5 req/s with 500 rows to establish realistic capacity
- **Profile during load:** Capture CPU flamegraphs at 10 req/s to confirm bcrypt vs SHAP bottleneck
- **Test mixed scenario:** Lower analyze rate (2 req/s) + higher auth rate (10 req/s) to isolate components
