# Baseline Load Test Summary

**Date:** 2025-11-16  
**Duration:** ~3m30s (auth_dashboard) + 1m (upload_analyze)  
**Services:** backend (port 5000), ai_core (port 8100), mongo, postgres

## Scenario 1: Auth Dashboard (S1)
- **VUs:** ramping 0→5→20→0 over 3m30s
- **Iterations:** 738 complete
- **Total Requests:** 2,952 (14.02 req/s)
- **Error Rate:** 0% (all checks passed)
- **HTTP Request Duration:**
  - p50 (median): 450.63 ms
  - p90: 1.6 s
  - p95: 1.91 s
  - p99: ~2.5s (estimated from max 2.69s)
  - avg: 669.19 ms
- **Health Latency:** avg 229ms, p95 612ms
- **Iteration Duration:** avg 2.92s, p95 5.05s

## Scenario 2: Upload/Analyze (S2)
- **VUs:** constant 3 for 1m
- **Iterations:** 51 complete
- **Total Requests:** 204 (3.39 req/s)
- **Error Rate:** 0% (all checks passed)
- **HTTP Request Duration:**
  - p50 (median): 223.43 ms
  - p90: 437.61 ms
  - p95: 530.40 ms
  - max: 41.33s (outlier - likely timeout/retry artifact)
  - avg: 820.61 ms
- **Analyze Endpoint:** median ~223ms suggests normal path; max 41s indicates potential SHAP computation spike or queue buildup
- **Iteration Duration:** avg 3.53s, p95 21.85s

## Key Observations
1. **Auth flow stable** under ramping load; no rate-limit 429 after bypass header implementation.
2. **Analyze latency** has extreme outlier (41s max); p95 ~530ms acceptable for 500-row dataset.
3. **Throughput:** auth ~14 req/s, analyze ~3.4 req/s under light load (3 VUs).
4. **Zero errors** in both scenarios post-fixes.

## Resource Metrics (Post-Baseline)
Captured from `/metrics` endpoints after baseline runs completed.

### Backend (system_api)
- **CPU:** 424.85 seconds total (cumulative since start)
- **Memory (Resident):** 91.5 MB (~87 MB RSS)
- **Heap Used:** 26 MB / 28 MB total
- **Request rate:** ~14 req/s (auth scenario peak)
- **Register p50:** ~560ms (from histogram buckets: majority in 0.25-1s range)
- **Login p50:** ~530ms (from histogram buckets: majority in 0.25-1s range)

### AI Core (ai_core)
- **CPU:** 29.77 seconds total (cumulative since start)
- **Memory (Resident):** 294 MB (~280 MB RSS)
- **Analyze Requests:** 51 total
- **Analyze Duration (ai_core_http_request_duration):**
  - p50: <250ms (47 of 51 requests < 250ms)
  - p90: <500ms (48 of 51 requests < 500ms)
  - 3 outliers > 500ms (max observed in k6: 41s)
  - Sum: 128.81s for 51 requests → avg 2.53s per request
- **SHAP Cache Misses:** All requests missed cache (unique random datasets)
- **Analyze rate:** ~3.4 req/s (analyze scenario, 3 VUs)

### Recommendations
- **Investigate 41s outlier** in analyze: likely SHAP cache miss + full TreeExplainer computation on 500-row dataset; 3 requests exceeded 500ms threshold.
- **Establish p99 targets:**
  - Auth flow: < 3s (currently p95 ~1.9s acceptable)
  - Analyze (500 rows): < 10s (currently p95 ~530ms excellent; outliers need async handling)
- **Baseline capacity:** 1 backend replica + 1 ai_core replica can handle:
  - ~15 req/s auth/dashboard traffic
  - ~3-4 req/s analyze requests (limited by SHAP compute; consider request queuing for higher concurrency)
- **Memory footprint:** Backend light (~90MB), ai_core moderate (~300MB with sklearn/shap loaded).
- **Next steps:** Run ramp scenario to identify breakpoint where latency degrades; profile SHAP-heavy phase for CPU bottlenecks.
