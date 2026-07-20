# EthixAI Stress Testing - Observability Dashboard

**Date:** November 18, 2025  
**Purpose:** Monitor system performance during stress testing  
**Tools:** Prometheus + Grafana

---

## Dashboard Overview

This document describes the observability dashboard for monitoring EthixAI during stress testing. The dashboard provides real-time visibility into latency, throughput, error rates, and resource utilization.

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                    EthixAI Stress Test Dashboard                │
│                         November 18, 2025                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Request Rate    │  │  Error Rate      │  │  Latency (p95)   │
│                  │  │                  │  │                  │
│  45.2 req/sec    │  │     2.3%         │  │    1,850 ms      │
│      ▲ 12%       │  │     ▼ 0.5%       │  │     ▲ 23%        │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Request Rate Over Time                      │
│  req/sec                                                         │
│    60┤                                                           │
│    50┤         ╭────────╮                                        │
│    40┤      ╭──╯        ╰──╮                                     │
│    30┤   ╭──╯               ╰───╮                                │
│    20┤╭──╯                      ╰──╮                             │
│    10┤╯                            ╰─────                        │
│     0└─────────────────────────────────────────────────────────►│
│      0m    5m    10m   15m   20m   25m   30m       time         │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────┐  ┌───────────────────────┐
│    Latency Histogram (Last 5m)     │  │   Status Code Dist.   │
│                                    │  │                       │
│  Count                             │  │  200: █████████ 87%   │
│   800┤   ███                       │  │  201: ██ 5%           │
│   600┤   ███                       │  │  429: ██ 4%           │
│   400┤   ███  ██                   │  │  500: █ 2%            │
│   200┤   ███  ██  █  █             │  │  503: █ 2%            │
│     0└────────────────────────────►│  │                       │
│      <1s 1-2s 2-5s >5s   latency   │  └───────────────────────┘
└────────────────────────────────────┘

┌────────────────────────────────────┐  ┌───────────────────────┐
│      CPU Usage (Backend)           │  │   Memory Usage        │
│  %                                 │  │                       │
│  100┤                              │  │  Backend: 420 MB      │
│   80┤        ╭──────╮              │  │  AI Core: 780 MB      │
│   60┤     ╭──╯      ╰─╮            │  │                       │
│   40┤  ╭──╯           ╰──╮         │  │  ┌────────────────┐  │
│   20┤──╯                 ╰───      │  │  │████████░░░░░░░░│  │
│    0└────────────────────────────►│  │  └────────────────┘  │
│     0m   10m   20m   30m    time   │  │   80% capacity        │
└────────────────────────────────────┘  └───────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Active Connections (MongoDB)                   │
│  connections                                                     │
│    100┤                                                          │
│     80┤                      ╭──────╮                            │
│     60┤                 ╭────╯      ╰───╮                        │
│     40┤            ╭────╯                ╰────╮                  │
│     20┤      ╭─────╯                          ╰────              │
│      0└─────────────────────────────────────────────────────────►│
│       0m    5m    10m   15m   20m   25m   30m       time        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Metrics

### 1. Request Rate (req/sec)

**PromQL Query:**
```promql
sum(rate(http_requests_total[5m]))
```

**Purpose:** Monitor throughput over time  
**Alert Threshold:** > 100 req/sec (approaching capacity)  
**Interpretation:**
- Baseline: 10-20 req/sec
- Stress: 50-100 req/sec
- Spike: > 100 req/sec (temporary)

---

### 2. Error Rate (%)

**PromQL Query:**
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) / 
sum(rate(http_requests_total[5m])) * 100
```

**Purpose:** Track failed requests  
**Alert Threshold:** > 5% (degraded), > 15% (critical)  
**Interpretation:**
- < 1%: Excellent
- 1-5%: Acceptable under load
- > 5%: System struggling
- > 15%: System failing

---

### 3. Latency Percentiles (ms)

**PromQL Queries:**

**p50 (Median):**
```promql
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m])) * 1000
```

**p95:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) * 1000
```

**p99:**
```promql
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) * 1000
```

**Alert Thresholds:**
- p95 > 5000ms (5s): Warning
- p95 > 10000ms (10s): Critical
- p99 > 30000ms (30s): Severe

**Interpretation:**
- Baseline p95: < 2000ms
- Stress p95: 2000-5000ms
- Breaking point: > 10000ms

---

### 4. CPU Usage (%)

**PromQL Queries:**

**Backend:**
```promql
rate(process_cpu_seconds_total{job="backend"}[5m]) * 100
```

**AI Core:**
```promql
rate(process_cpu_seconds_total{job="ai_core"}[5m]) * 100
```

**Alert Thresholds:**
- > 70%: Warning (approaching capacity)
- > 90%: Critical (CPU-bound)

**Interpretation:**
- AI Core expected to be CPU-intensive (SHAP generation)
- Backend should stay < 50% under normal load

---

### 5. Memory Usage (MB)

**PromQL Queries:**

**Backend:**
```promql
process_resident_memory_bytes{job="backend"} / 1024 / 1024
```

**AI Core:**
```promql
process_resident_memory_bytes{job="ai_core"} / 1024 / 1024
```

**Alert Thresholds:**
- Backend > 480 MB (95% of 512 MB limit)
- AI Core > 950 MB (95% of 1 GB limit)

**Interpretation:**
- Gradual increase: Potential memory leak
- Sudden spikes: Large payload processing
- Stable: Healthy

---

### 6. MongoDB Connections

**PromQL Query:**
```promql
mongodb_connections{state="current"}
```

**Alert Threshold:** > 80 connections (approaching M0 limit of ~100)  
**Interpretation:**
- Connection pool exhaustion indicates need for connection reuse optimization

---

### 7. SHAP Generation Time (ms)

**PromQL Query:**
```promql
histogram_quantile(0.95, rate(shap_generation_duration_seconds_bucket[5m])) * 1000
```

**Alert Threshold:** > 3000ms (3s)  
**Interpretation:**
- SHAP generation is the primary bottleneck
- Scales linearly with dataset size

---

## Alert Rules

### Critical Alerts

```yaml
groups:
  - name: stress_test_critical
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.15
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 15% for 5 minutes"
          description: "System is failing under load"
      
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "p95 latency above 10 seconds"
          description: "System severely degraded"
      
      - alert: MemoryExhaustion
        expr: process_resident_memory_bytes{job="backend"} > 500000000
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Backend memory above 500 MB"
          description: "Potential OOM crash imminent"
```

### Warning Alerts

```yaml
groups:
  - name: stress_test_warning
    interval: 30s
    rules:
      - alert: ElevatedErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Error rate above 5%"
      
      - alert: HighCPU
        expr: rate(process_cpu_seconds_total[5m]) > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CPU usage above 90% for 10 minutes"
      
      - alert: ConnectionPoolSaturation
        expr: mongodb_connections{state="current"} > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB connections above 80"
```

---

## Grafana Dashboard JSON

### Dashboard Configuration

```json
{
  "dashboard": {
    "title": "EthixAI Stress Test Dashboard",
    "tags": ["stress-test", "performance", "day24"],
    "timezone": "browser",
    "refresh": "10s",
    "time": {
      "from": "now-30m",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "type": "stat",
        "title": "Request Rate",
        "targets": [{
          "expr": "sum(rate(http_requests_total[5m]))",
          "legendFormat": "req/sec"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 50, "color": "yellow" },
                { "value": 100, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "type": "graph",
        "title": "Latency Percentiles",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m])) * 1000",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) * 1000",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) * 1000",
            "legendFormat": "p99"
          }
        ],
        "yaxes": [
          { "format": "ms", "label": "Latency" }
        ]
      }
    ]
  }
}
```

---

## Usage Instructions

### 1. Access Prometheus

```bash
# Open Prometheus UI
open http://localhost:9090

# Example queries
sum(rate(http_requests_total[5m]))
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### 2. Access Grafana (Optional)

```bash
# If Grafana is installed
open http://localhost:3000

# Default credentials
# Username: admin
# Password: admin
```

### 3. Export Metrics

```bash
# Instant metrics
python tools/stress/collect_metrics.py --mode instant --output metrics_now.json

# Range metrics (last 30 minutes)
python tools/stress/collect_metrics.py \
  --mode range \
  --start "2025-11-18T10:00:00" \
  --end "2025-11-18T10:30:00" \
  --output metrics_range.csv
```

---

## Interpretation Guide

### Healthy System Indicators

✅ **Request rate stable** (10-50 req/sec)  
✅ **Error rate < 1%**  
✅ **p95 latency < 2000ms**  
✅ **CPU usage < 70%**  
✅ **Memory usage stable** (no gradual increase)  
✅ **MongoDB connections < 50**

### Warning Signs

⚠️ **Error rate 1-5%** (acceptable under stress)  
⚠️ **p95 latency 2000-5000ms** (degraded but functioning)  
⚠️ **CPU usage 70-90%** (approaching capacity)  
⚠️ **Memory usage increasing** (potential leak)

### Critical Issues

❌ **Error rate > 15%** (system failing)  
❌ **p95 latency > 10000ms** (severe degradation)  
❌ **CPU usage > 90%** (CPU-bound, queuing requests)  
❌ **Memory usage > 95%** (OOM imminent)  
❌ **MongoDB connections > 80** (pool exhausted)

---

## Recommended Dashboard Views

### During Baseline Test (10 users)
- Focus on: Latency p50/p95, Error rate
- Expected: < 2s p95, < 1% error rate

### During Stress Test (50-100 users)
- Focus on: Request rate, Error rate, CPU usage
- Expected: 50-100 req/sec, 2-5% error rate, 70-90% CPU

### During Endurance Test (30 min)
- Focus on: Memory usage over time, Connection pool
- Watch for: Gradual memory increase (leak), Connection accumulation

### During Chaos Test
- Focus on: Error rate, Status code distribution
- Expected: 15-25% error rate (by design)

---

## Next Steps

1. Set up Grafana dashboard using JSON configuration above
2. Configure alerting rules in Prometheus
3. Export metrics after each test for offline analysis
4. Generate comparison charts (baseline vs. stress vs. spike)

---

**Document Status:** ✅ Ready for Use  
**Last Updated:** November 18, 2025
