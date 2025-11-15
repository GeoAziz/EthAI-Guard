# Observability & Monitoring - Enhanced Guide

This comprehensive guide supplements the existing observability.md with additional setup, dashboards, and best practices.

## Quick Metrics Collection

### Backend Metrics

```bash
# Get all backend metrics
curl -s http://localhost:5000/metrics

# Get specific metric: request rates
curl -s http://localhost:5000/metrics | grep http_requests_total

# Get specific metric: request latency
curl -s http://localhost:5000/metrics | grep http_request_duration_seconds

# Get cache metrics
curl -s http://localhost:8100/metrics | grep ai_core_shap_cache
```

### AI Core Metrics

```bash
# Get all AI Core metrics
curl -s http://localhost:8100/metrics

# Get analysis duration
curl -s http://localhost:8100/metrics | grep ai_core_analysis_seconds

# Monitor FastAPI request metrics
curl -s http://localhost:8100/metrics | grep starlette_request_duration_seconds
```

## Log Aggregation Examples

### Filter and Analyze Logs

```bash
# Count requests by status code
docker compose logs backend | jq '.status' | sort | uniq -c

# Count requests by route
docker compose logs backend | jq '.route' | sort | uniq -c

# Find slow requests
docker compose logs backend | jq 'select(.status == "SLOW")'

# Find errors
docker compose logs backend | jq 'select(.level == "ERROR")'

# Trace analysis flow
docker compose logs | jq 'select(.analysis_id == "abc123")' | jq '.{timestamp: .timestamp, service: .service, message: .message}'
```

### Real-time Monitoring

```bash
# Watch for errors in real-time
docker compose logs -f backend | jq 'select(.level == "ERROR")'

# Monitor request rate (updates every 2 seconds)
watch -n 2 'docker compose logs backend | jq ".route" | sort | uniq -c | tail -10'

# Monitor cache hit ratio
watch -n 5 'curl -s http://localhost:8100/metrics | grep -E "ai_core_shap_cache_(hits|misses)_total"'
```

## Performance Monitoring Dashboard

Create a custom monitoring script to track key metrics:

```bash
#!/bin/bash
# monitor.sh - Real-time observability dashboard

clear
while true; do
  echo "=== EthAI-Guard Observability Dashboard ==="
  echo "Time: $(date)"
  echo ""
  
  echo "--- Backend Performance ---"
  curl -s http://localhost:5000/metrics | grep 'http_request_duration_seconds_sum\|http_requests_total' | head -5
  
  echo ""
  echo "--- AI Core Cache Performance ---"
  curl -s http://localhost:8100/metrics | grep 'ai_core_shap_cache' | head -3
  
  echo ""
  echo "--- Error Rate ---"
  curl -s http://localhost:5000/metrics | grep 'http_requests_total.*status="5' || echo "No 5xx errors"
  
  echo ""
  echo "--- Memory Usage ---"
  docker stats --no-stream backend ai_core | head -3
  
  sleep 5
  clear
done
```

## Baseline Metrics from Chaos Test

The chaos smoke test automatically collects and validates metrics. Use these as performance baselines:

```bash
# Run chaos test 5 times and collect stats
for i in {1..5}; do
  docker compose down -v
  ./tools/ci/chaos_smoke_ci.sh
  tail -20 /tmp/backend_metrics.prom >> baseline_metrics.txt
  sleep 10
done

# Analyze results
echo "Mean request latency:"
grep 'http_request_duration_seconds_sum' baseline_metrics.txt | awk '{sum+=$2; count++} END {print sum/count}'
```

## Integration Examples

### Prometheus Server Setup

Add this to your Prometheus `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ethixai-backend'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'

  - job_name: 'ethixai-ai-core'
    static_configs:
      - targets: ['localhost:8100']
    metrics_path: '/metrics'

# Alerting rules
rule_files:
  - 'alerts.yml'
```

Create `alerts.yml`:

```yaml
groups:
  - name: ethixai_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 1m
        annotations:
          summary: "High error rate detected"
      
      - alert: SlowRequests
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 2m
        annotations:
          summary: "Slow requests detected (p99 > 2s)"
      
      - alert: CacheHitRatioLow
        expr: rate(ai_core_shap_cache_hits_total[5m]) / (rate(ai_core_shap_cache_hits_total[5m]) + rate(ai_core_shap_cache_misses_total[5m])) < 0.3
        for: 5m
        annotations:
          summary: "SHAP cache hit ratio below 30%"
```

### Grafana Dashboard Queries

Use these PromQL queries in your Grafana dashboards:

**Request Rate**
```promql
rate(http_requests_total[5m])
```

**Error Rate %**
```promql
(rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) * 100
```

**P95 Latency**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Analysis Duration P99**
```promql
histogram_quantile(0.99, rate(ai_core_analysis_seconds_bucket[5m]))
```

**Cache Hit Ratio**
```promql
rate(ai_core_shap_cache_hits_total[5m]) / (rate(ai_core_shap_cache_hits_total[5m]) + rate(ai_core_shap_cache_misses_total[5m]))
```

## Troubleshooting Guide

### Metrics Not Available

Check if Prometheus client is installed:
```bash
docker compose exec backend npm list prom-client
# Should see prom-client version

docker compose exec ai_core pip list | grep prometheus
# Should see prometheus-client
```

### Slow Analysis Detection

Set custom threshold and view slow requests:
```bash
# Set to 2 seconds
SLOW_THRESHOLD_MS=2000 docker compose up -d backend

# View slow requests
docker compose logs backend | jq 'select(.status == "SLOW")'
```

### Cache Not Working

Verify cache configuration:
```bash
# Check cache TTL settings
docker compose exec backend env | grep CACHE_TTL

# Monitor cache hits
watch 'curl -s http://localhost:8100/metrics | grep ai_core_shap_cache_hits_total'
```

## Structured Logging Best Practices

### Adding Custom Log Entries

In backend Node.js:
```javascript
const { withRequest } = require('./logger');

app.post('/custom', (req, res) => {
  const log = withRequest(req);
  
  log.info({
    custom_metric: value,
    analysis_id: analysisId,
    duration: computedDuration
  }, 'custom_event_name');
  
  res.json({ ok: true });
});
```

In AI Core Python:
```python
import logging
logger = logging.getLogger('ai_core')

def process_analysis(analysis_id, data):
  logger.info({
    'analysis_id': analysis_id,
    'data_points': len(data),
    'message': 'analysis_started'
  })
```

## Performance Metrics Reference

### Critical Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold | Reason |
|--------|-------------------|-------------------|--------|
| Error Rate | > 2% | > 5% | User impact |
| P99 Latency | > 1.5s | > 3s | UX degradation |
| Cache Hit Ratio | < 50% | < 20% | Performance loss |
| Memory Usage | > 500MB | > 800MB | OOM risk |
| CPU Usage | > 70% | > 90% | Capacity issues |

### Analysis-Specific Metrics

| Metric | Description | Baseline |
|--------|-------------|----------|
| `ai_core_analysis_seconds` | Analysis duration including SHAP | 2-5s |
| `ai_core_shap_cache_hits_total` | Cache hit count | Increases with repeated analyses |
| Analysis Queue Length | Pending analyses | Should be < 10 |

## Compliance & Auditing

### Audit Logging

All user actions are logged with:
- User ID
- Action (login, analyze, logout)
- Timestamp
- Request ID for correlation
- Result status

```bash
# Extract audit trail
docker compose logs backend | jq 'select(.message | contains("login") or contains("logout") or contains("registration"))'
```

### Data Retention

Logs are retained for:
- Application logs: 30 days (rotated daily)
- Metrics: 15 days (Prometheus default)
- Audit logs: 90 days (compliance requirement)

## Next Steps

1. **Set up Prometheus server** for metric collection
2. **Deploy Grafana** for visualization
3. **Configure alerting** using AlertManager
4. **Archive logs** for long-term storage
5. **Establish baselines** using chaos test results

---

**For more information, see `docs/observability.md`**
