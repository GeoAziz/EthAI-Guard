# EthixAI Stress Test Plan - Day 24

**Date:** November 18, 2025  
**Version:** 1.0  
**Role:** Performance Engineers + Reliability Architects  
**Objective:** Validate EthixAI system stability, performance, and reliability under heavy load

---

## 1. Executive Summary

This document outlines the comprehensive stress testing strategy for EthixAI's production system. We will simulate real-world usage patterns, identify performance bottlenecks, validate error handling, and ensure observability infrastructure captures all critical metrics.

### Goals

1. **Establish Performance Baseline:** Measure latency (p50/p95/p99) and throughput under normal load
2. **Identify Breaking Points:** Determine maximum concurrent users before system degradation
3. **Validate Resilience:** Test error handling during failures (timeouts, DB delays, network issues)
4. **Verify Observability:** Ensure Prometheus metrics and audit logs remain complete under load
5. **Document Bottlenecks:** Identify optimization opportunities for Day 25

---

## 2. System Under Test (SUT)

### Architecture Components

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│   AI Core   │
│ (Next.js)   │     │  (Express)  │     │  (FastAPI)  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                     │
                           ▼                     ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  MongoDB    │     │ Prometheus  │
                    │   Atlas     │     │   Metrics   │
                    └─────────────┘     └─────────────┘
```

### Critical Endpoints

| Endpoint | Method | Purpose | Expected Latency |
|----------|--------|---------|------------------|
| `/api/analyze` | POST | Fairness analysis | < 2s (p95) |
| `/api/explain` | POST | SHAP explainability | < 5s (p95) |
| `/api/reports` | GET | Fetch analysis reports | < 500ms (p95) |
| `/api/model-cards` | GET | Model Cards list | < 300ms (p95) |
| `/api/audit/logs` | GET | Audit logs query | < 1s (p95) |

### Infrastructure Specifications

- **Backend:** Node.js 18, Express 4.18, 512MB RAM, 1 vCPU (Render Free)
- **AI Core:** Python 3.11, FastAPI 0.104, 1GB RAM, 2 vCPU (Render Standard)
- **MongoDB:** Atlas M0 (512 MB storage, shared vCPU)
- **Frontend:** Vercel Edge (serverless, auto-scaling)

---

## 3. Test Scenarios

### Scenario 1: Baseline Performance Test

**Objective:** Establish normal operational metrics

**Configuration:**
- **Concurrent Users:** 10
- **Duration:** 5 minutes
- **Request Rate:** 1 req/sec per user (10 req/sec total)
- **Payload Size:** 100 records per request

**Success Criteria:**
- ✅ p95 latency < 2s for `/api/analyze`
- ✅ Error rate < 1%
- ✅ CPU usage < 70%
- ✅ Memory usage stable (no leaks)

**Expected Results:**
- ~3,000 total requests (10 users × 60 sec × 5 min)
- Avg latency: ~1.2s
- Throughput: ~10 req/sec

---

### Scenario 2: Stress Test - 50 Concurrent Users

**Objective:** Identify system behavior under moderate stress

**Configuration:**
- **Concurrent Users:** 50
- **Duration:** 10 minutes
- **Request Rate:** 1 req/sec per user (50 req/sec total)
- **Payload Size:** 100 records per request

**Success Criteria:**
- ✅ p95 latency < 5s (degraded but acceptable)
- ✅ Error rate < 5%
- ✅ CPU usage < 90%
- ✅ No request timeouts

**Expected Results:**
- ~30,000 total requests
- Avg latency: ~2-3s (2.5x baseline)
- Potential bottleneck: AI Core SHAP generation

---

### Scenario 3: Stress Test - 100 Concurrent Users

**Objective:** Push system to breaking point

**Configuration:**
- **Concurrent Users:** 100
- **Duration:** 5 minutes
- **Request Rate:** 1 req/sec per user (100 req/sec total)
- **Payload Size:** 100 records per request

**Success Criteria:**
- ⚠️ System remains responsive (even if degraded)
- ⚠️ Error rate < 15%
- ⚠️ No complete system failure (503s allowed)
- ✅ Audit logs remain complete

**Expected Results:**
- ~30,000 total requests
- Avg latency: ~5-10s (severe degradation)
- High probability of: Connection pool exhaustion, MongoDB throttling, AI Core timeouts

---

### Scenario 4: Batch Processing - Large Payloads

**Objective:** Test system with large single requests

**Configuration:**
- **Concurrent Users:** 5
- **Duration:** 10 minutes
- **Request Rate:** 0.1 req/sec per user (1 req/2sec total)
- **Payload Size:** 500, 1000, 5000 records (varying)

**Success Criteria:**
- ✅ 500 records: p95 < 10s
- ⚠️ 1000 records: p95 < 20s
- ⚠️ 5000 records: May timeout, but no crashes

**Expected Results:**
- ~300 total requests
- SHAP generation bottleneck (O(n) complexity)
- Memory spikes on AI Core

---

### Scenario 5: Spike Test - Sudden Load Burst

**Objective:** Test auto-scaling and burst handling

**Configuration:**
- **Phase 1:** 5 users for 2 minutes (warmup)
- **Phase 2:** Spike to 100 users for 1 minute (burst)
- **Phase 3:** Drop to 10 users for 2 minutes (cooldown)

**Success Criteria:**
- ✅ No system crashes during spike
- ⚠️ Temporary latency spike acceptable (< 30s)
- ✅ System recovers within 1 minute after burst

**Expected Results:**
- ~6,000 total requests
- Clear latency spike during Phase 2
- MongoDB connection pool may saturate

---

### Scenario 6: Endurance Test (Soak Test)

**Objective:** Detect memory leaks and gradual degradation

**Configuration:**
- **Concurrent Users:** 20
- **Duration:** 30 minutes
- **Request Rate:** 0.5 req/sec per user (10 req/sec total)
- **Payload Size:** 100 records per request

**Success Criteria:**
- ✅ Memory usage stable (< 5% increase over 30 min)
- ✅ No connection leaks
- ✅ Latency remains consistent (no gradual increase)
- ✅ No database connection pool exhaustion

**Expected Results:**
- ~18,000 total requests
- Stable latency throughout test
- Potential issues: Unclosed DB connections, memory leaks in SHAP library

---

### Scenario 7: Failure Injection - Chaos Engineering

**Objective:** Validate error handling and resilience

**Configuration:**
- **Concurrent Users:** 20
- **Duration:** 10 minutes
- **Failure Types:**
  - AI Core timeout (10% of requests)
  - MongoDB latency spike (+2s, 5% of requests)
  - Network errors (connection refused, 3% of requests)
  - Memory pressure (AI Core OOM simulation)

**Success Criteria:**
- ✅ No cascading failures (errors isolated)
- ✅ Error responses include X-Request-Id for tracing
- ✅ Retry logic works correctly (backend → AI Core)
- ✅ Audit logs capture all failures

**Expected Results:**
- ~12,000 total requests
- ~18% error rate (by design)
- Errors handled gracefully with 500/503 status codes
- All errors logged with request IDs

---

## 4. Metrics to Capture

### Latency Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **p50 (Median)** | 50th percentile latency | < 1s |
| **p95** | 95th percentile latency | < 2s |
| **p99** | 99th percentile latency | < 5s |
| **p99.9** | Worst-case latency | < 10s |
| **Max** | Maximum observed latency | < 30s |

### Throughput Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Requests/sec** | Total requests per second | 10-50 req/sec |
| **Success Rate** | % of successful requests | > 95% |
| **Error Rate** | % of failed requests | < 5% |
| **Timeout Rate** | % of timed-out requests | < 2% |

### Resource Utilization

| Component | Metric | Warning Threshold | Critical Threshold |
|-----------|--------|-------------------|-------------------|
| **Backend** | CPU Usage | > 70% | > 90% |
| **Backend** | Memory Usage | > 400 MB | > 480 MB |
| **AI Core** | CPU Usage | > 80% | > 95% |
| **AI Core** | Memory Usage | > 800 MB | > 950 MB |
| **MongoDB** | Connection Pool | > 80% | > 95% |
| **MongoDB** | Disk I/O | > 70% | > 90% |

### Application Metrics (Prometheus)

```promql
# Request rate
rate(http_requests_total[5m])

# Latency histogram
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# AI Core processing time
histogram_quantile(0.95, rate(shap_generation_duration_seconds_bucket[5m]))

# Database query latency
histogram_quantile(0.95, rate(mongodb_query_duration_seconds_bucket[5m]))
```

---

## 5. Test Execution Plan

### Phase 1: Preparation (30 minutes)

```bash
# 1. Ensure all services are running
docker-compose up -d
docker-compose ps  # Verify all services healthy

# 2. Verify connectivity
curl http://localhost:5000/health  # Backend
curl http://localhost:8100/health  # AI Core
curl http://localhost:3000/        # Frontend

# 3. Clear logs and metrics (fresh start)
rm -rf logs/*.log
docker-compose restart prometheus

# 4. Set up monitoring
open http://localhost:9090  # Prometheus UI
# Import Grafana dashboard (if available)
```

### Phase 2: Baseline Test (10 minutes)

```bash
# Run Scenario 1: Baseline Performance
artillery run tools/stress/artillery_baseline.yml

# Collect metrics
curl http://localhost:5000/metrics > results/metrics_baseline_backend.txt
curl http://localhost:8100/metrics > results/metrics_baseline_aicore.txt

# Analyze results
node tools/stress/analyze_artillery_report.js report.json
```

### Phase 3: Stress Tests (30 minutes)

```bash
# Scenario 2: 50 users
artillery run tools/stress/artillery_stress_50.yml

# Scenario 3: 100 users
artillery run tools/stress/artillery_stress_100.yml

# Collect metrics after each test
curl http://localhost:5000/metrics > results/metrics_stress_50_backend.txt
curl http://localhost:8100/metrics > results/metrics_stress_100_aicore.txt
```

### Phase 4: Batch Processing (20 minutes)

```bash
# Scenario 4: Large payloads
python tools/stress/batch_processing_test.py

# Monitor memory usage
docker stats --no-stream > results/docker_stats_batch.txt
```

### Phase 5: Spike & Endurance (45 minutes)

```bash
# Scenario 5: Spike test
artillery run tools/stress/artillery_spike.yml

# Scenario 6: Endurance test (30 min)
artillery run tools/stress/artillery_endurance.yml

# Monitor for memory leaks
watch -n 10 'curl -s http://localhost:5000/metrics | grep process_resident_memory_bytes'
```

### Phase 6: Failure Injection (20 minutes)

```bash
# Scenario 7: Chaos engineering
python tools/stress/chaos_engineering_test.py

# Verify error handling
grep "X-Request-Id" logs/backend.log | grep "500\|503" | wc -l
```

### Phase 7: Analysis & Documentation (60 minutes)

```bash
# Export all metrics
curl http://localhost:9090/api/v1/query_range \
  -d 'query=rate(http_requests_total[5m])' \
  -d 'start=2025-11-18T00:00:00Z' \
  -d 'end=2025-11-18T23:59:59Z' \
  -d 'step=60s' > results/prometheus_requests.json

# Archive logs
tar -czvf results/day24_logs_metrics.tgz logs/ results/

# Generate report
python tools/stress/generate_stress_test_report.py
```

---

## 6. Success Criteria Summary

### Must-Have (Critical)

- ✅ **No System Crashes:** System remains responsive under all scenarios
- ✅ **Audit Logs Complete:** All requests logged with X-Request-Id
- ✅ **Error Handling Works:** 500/503 errors returned gracefully (no silent failures)
- ✅ **Observability Intact:** Prometheus metrics continue to be exported

### Should-Have (Important)

- ✅ **Baseline Performance Met:** p95 < 2s under 10 concurrent users
- ✅ **Error Rate Acceptable:** < 5% errors under normal load (< 50 users)
- ✅ **No Memory Leaks:** Memory usage stable over 30-minute endurance test
- ✅ **Breaking Point Identified:** Know maximum concurrent users before failure

### Nice-to-Have (Desirable)

- ⚠️ **Auto-scaling Validated:** System scales gracefully during spike tests
- ⚠️ **Sub-second Latency:** p95 < 1s under baseline load
- ⚠️ **Large Batch Support:** 5000-record batches complete without timeout

---

## 7. Risk Assessment

### High-Risk Scenarios

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **AI Core Timeout** | High | High | Implement request queue, circuit breaker |
| **MongoDB Connection Pool Exhaustion** | Medium | Critical | Increase pool size, add connection monitoring |
| **Memory Leak (SHAP)** | Medium | High | Profile memory, implement periodic restarts |
| **Network Partitioning** | Low | Critical | Add health checks, retry logic |

### Monitoring Alerts

Set up alerts for:
- ⚠️ Error rate > 10% for 5 minutes
- ⚠️ p95 latency > 10s for 5 minutes
- ⚠️ CPU usage > 90% for 10 minutes
- ⚠️ Memory usage > 95%
- 🚨 Service down (no health check response)

---

## 8. Expected Bottlenecks

Based on architecture analysis, we predict:

1. **AI Core SHAP Generation (Most Likely)**
   - SHAP is CPU-intensive and synchronous
   - Expected bottleneck at 30-50 concurrent users
   - Mitigation: Add request queue, background workers

2. **MongoDB Connection Pool (Likely)**
   - Free tier has limited connections (~100)
   - May saturate at 50+ concurrent users
   - Mitigation: Connection pooling, query optimization

3. **Backend Memory (Possible)**
   - Node.js default heap: 512 MB
   - Large payloads may cause GC pressure
   - Mitigation: Increase heap size, streaming responses

4. **Network I/O (Unlikely)**
   - Backend → AI Core communication
   - Free tier network limits
   - Mitigation: Local Docker Compose setup for testing

---

## 9. Tools & Infrastructure

### Load Testing Tools

1. **Artillery** (Primary)
   - YAML-based configuration
   - Built-in reporting
   - HTTP/WebSocket support
   - Install: `npm install -g artillery`

2. **Python AsyncIO Script** (Custom)
   - Fine-grained control
   - Real-time metrics
   - Flexible payload generation

3. **Locust** (Alternative)
   - Web UI for monitoring
   - Python-based scenarios
   - Install: `pip install locust`

### Monitoring Tools

1. **Prometheus** (Metrics)
   - Already integrated (Day 22)
   - Query metrics via PromQL
   - Accessible at `http://localhost:9090`

2. **Grafana** (Visualization)
   - Optional (can use Prometheus UI)
   - Pre-built EthixAI dashboard

3. **Docker Stats** (Resource Monitoring)
   - Real-time container metrics
   - Command: `docker stats`

### Analysis Tools

1. **Node.js Script** (Artillery Report Parser)
   - Parse JSON reports
   - Generate summary statistics
   - Export to CSV/Markdown

2. **Python Script** (Prometheus Data Analyzer)
   - Query Prometheus API
   - Generate latency histograms
   - Identify outliers

---

## 10. Deliverables

1. **stress_test_plan.md** (This document)
2. **stress_test_results.md** - Metrics, charts, observations
3. **stress_test_dashboard.md** - Grafana/Prometheus dashboard mockups
4. **Artillery Configs:**
   - `tools/stress/artillery_baseline.yml`
   - `tools/stress/artillery_stress_50.yml`
   - `tools/stress/artillery_stress_100.yml`
   - `tools/stress/artillery_spike.yml`
   - `tools/stress/artillery_endurance.yml`
5. **Python Scripts:**
   - `tools/stress/stress_test.py` (Custom load generator)
   - `tools/stress/batch_processing_test.py`
   - `tools/stress/chaos_engineering_test.py`
   - `tools/stress/generate_stress_test_report.py`
6. **Test Data:**
   - `tools/stress/data/payload_100.json`
   - `tools/stress/data/payload_500.json`
   - `tools/stress/data/payload_1000.json`
   - `tools/stress/data/payload_5000.json`
7. **Results Archive:**
   - `results/day24_logs_metrics.tgz` (logs, metrics, reports)

---

## 11. Timeline

| Time | Activity | Duration |
|------|----------|----------|
| 00:00 - 00:30 | Setup & verification | 30 min |
| 00:30 - 00:40 | Baseline test | 10 min |
| 00:40 - 01:10 | Stress tests (50, 100 users) | 30 min |
| 01:10 - 01:30 | Batch processing tests | 20 min |
| 01:30 - 02:15 | Spike & endurance tests | 45 min |
| 02:15 - 02:35 | Failure injection tests | 20 min |
| 02:35 - 03:35 | Analysis & report generation | 60 min |
| **Total** | | **~3.5 hours** |

---

## 12. Next Steps (Day 25)

Based on identified bottlenecks, Day 25 will focus on:

1. **Performance Optimization**
   - Optimize SHAP generation (caching, batching)
   - Implement request queuing for AI Core
   - Add database query caching

2. **Scalability Improvements**
   - Horizontal scaling strategy (multiple AI Core instances)
   - Load balancing configuration
   - Connection pool tuning

3. **Resilience Enhancements**
   - Circuit breaker pattern
   - Retry logic with exponential backoff
   - Graceful degradation mechanisms

---

**Document Status:** ✅ Ready for Execution  
**Approved By:** Performance Engineering Team  
**Last Updated:** November 18, 2025
