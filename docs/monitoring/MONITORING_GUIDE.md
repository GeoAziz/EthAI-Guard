# EthixAI Monitoring & Observability Guide

## Overview

This guide covers the complete monitoring and observability setup for EthixAI, including logging, metrics collection, dashboards, and alerting.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Logging](#logging)
3. [Metrics](#metrics)
4. [Dashboards](#dashboards)
5. [Alerting](#alerting)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Architecture

### Monitoring Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     EthixAI Application                      │
├───────────────┬──────────────────┬─────────────────────────┤
│   Backend     │    AI Core       │      Frontend            │
│   (Express)   │    (FastAPI)     │      (Next.js)          │
│               │                  │                          │
│   Winston     │    Loguru        │    Console logs          │
│   Metrics     │    Prometheus    │                          │
└───────┬───────┴────────┬─────────┴──────────────────────────┘
        │                │
        │                │
        ▼                ▼
┌────────────────────────────────────────┐
│           Prometheus                    │
│   - Scrapes metrics every 15s          │
│   - Evaluates alert rules               │
│   - Stores time-series data             │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│            Grafana                      │
│   - Visualizes metrics                  │
│   - Displays dashboards                 │
│   - Sends alerts                        │
└────────────────────────────────────────┘
```

### Components

- **Winston**: Structured logging for Node.js backend
- **Loguru**: Elegant logging for Python AI core
- **Prometheus**: Time-series metrics collection and storage
- **Grafana**: Dashboard visualization and alerting
- **Prometheus Exporters**: System-level metrics (CPU, memory, disk)

---

## Logging

### Backend Logging (Winston)

#### Configuration

Located in: `/backend/src/utils/logger.js`

**Features**:
- Structured JSON logging
- Multiple transports (console, file, MongoDB)
- Environment-aware log levels
- Correlation IDs for request tracking
- Automatic log rotation

#### Log Levels

- `error`: Error conditions
- `warn`: Warning conditions
- `info`: Informational messages (default in production)
- `debug`: Debug messages (default in development)

#### Usage Examples

```javascript
const logger = require('./utils/logger');

// Basic logging
logger.info('User logged in', { userId: '12345' });
logger.error('Database connection failed', { error: err.message });

// Request logging
logger.logRequest(req, { additionalContext: 'value' });
logger.logResponse(req, res, duration);

// Business events
logger.logInference({
  modelType: 'credit_scoring',
  datasetSize: 1000,
  userId: req.user.id,
  correlationId: req.correlationId
});

logger.logBiasDetection({
  biasDetected: true,
  fairnessScore: 0.65,
  protectedAttribute: 'gender'
});

// Security events
logger.logSecurityEvent('failed_login_attempt', {
  ip: req.ip,
  email: req.body.email
});

// Audit trail
logger.logAudit('report_generated', {
  userId: req.user.id,
  reportId: reportId,
  format: 'pdf'
});
```

#### Log Files

- **Location**: `/backend/logs/`
- **Files**:
  - `combined.log`: All logs (10MB rotation, 10 files retained)
  - `error.log`: Errors only (10MB rotation, 5 files retained)
- **MongoDB**: Optional logging to database (if `ENABLE_MONGODB_LOGGING=true`)

### AI Core Logging (Loguru)

#### Configuration

Located in: `/ai_core/utils/logging_config.py`

**Features**:
- Automatic rotation and compression
- Structured logging with context
- Separate audit trail
- Color-coded console output
- JSON export format

#### Usage Examples

```python
from utils.logging_config import ai_logger

# Inference logging
ai_logger.log_inference_request(
    model_type='credit_scoring',
    dataset_size=1000,
    protected_attributes=['gender', 'age'],
    correlation_id=correlation_id
)

ai_logger.log_inference_response(
    model_type='credit_scoring',
    duration_ms=150.5,
    fairness_score=0.85,
    bias_detected=False,
    correlation_id=correlation_id
)

# Bias detection
ai_logger.log_bias_detection(
    protected_attribute='gender',
    metric='demographic_parity',
    value=0.08,
    threshold=0.10,
    bias_detected=False
)

# Performance tracking
ai_logger.log_shap_computation(
    duration_ms=2500,
    num_samples=1000,
    num_features=15
)

# Errors with context
try:
    result = complex_operation()
except Exception as e:
    ai_logger.log_error(e, context={
        'operation': 'model_inference',
        'model_type': 'credit_scoring'
    })
```

#### Log Files

- **Location**: `/ai_core/logs/`
- **Files**:
  - `ai_core.log`: All logs (10MB rotation, 30 days)
  - `error.log`: Errors only (5MB rotation, 60 days)
  - `ai_core.json`: JSON format (20MB rotation, 30 days)
  - `audit.log`: Compliance events (10MB rotation, 90 days)

---

## Metrics

### Backend Metrics

#### Available Metrics

**HTTP Metrics**:
- `ethixai_backend_http_request_duration_ms`: Request duration histogram
- `ethixai_backend_http_requests_total`: Total request counter
- `ethixai_backend_http_requests_in_progress`: Current active requests
- `ethixai_backend_http_errors_total`: Error counter

**Business Metrics**:
- `ethixai_backend_inference_requests_total`: Inference requests
- `ethixai_backend_bias_detections_total`: Bias detections
- `ethixai_backend_fairness_score`: Current fairness scores
- `ethixai_backend_dataset_size`: Dataset size histogram

**Authentication Metrics**:
- `ethixai_backend_auth_attempts_total`: Auth attempts
- `ethixai_backend_active_sessions`: Active sessions
- `ethixai_backend_token_refresh_total`: Token refreshes

**Database Metrics**:
- `ethixai_backend_db_query_duration_ms`: Query duration
- `ethixai_backend_db_connections`: Active connections
- `ethixai_backend_db_errors_total`: Database errors

**Cache Metrics**:
- `ethixai_backend_cache_hits_total`: Cache hits
- `ethixai_backend_cache_misses_total`: Cache misses
- `ethixai_backend_cache_size`: Cache size

#### Usage

```javascript
const metrics = require('./utils/metrics');

// Automatic HTTP tracking (via middleware)
app.use(metrics.metricsMiddleware);

// Manual metric recording
metrics.recordInferenceRequest('credit_scoring', userId, 'success');
metrics.recordBiasDetection('gender', 'high');
metrics.updateFairnessScore('credit_scoring', 'gender', 0.85);
metrics.recordDatasetSize('credit_scoring', 1000);
```

#### Endpoint

Access metrics at: `http://localhost:5000/metrics`

### AI Core Metrics

#### Available Metrics

**Inference Metrics**:
- `ethixai_aicore_inference_requests_total`: Total inference requests
- `ethixai_aicore_inference_duration_seconds`: Inference duration
- `ethixai_aicore_inference_errors_total`: Inference errors
- `ethixai_aicore_dataset_size`: Dataset sizes processed

**Bias Detection Metrics**:
- `ethixai_aicore_bias_detections_total`: Bias detections
- `ethixai_aicore_fairness_score`: Fairness scores
- `ethixai_aicore_bias_metrics_computed_total`: Metrics computed

**SHAP Metrics**:
- `ethixai_aicore_shap_computation_duration_seconds`: SHAP duration
- `ethixai_aicore_shap_samples_processed_total`: Samples processed
- `ethixai_aicore_shap_features_analyzed`: Features analyzed

**Model Cache Metrics**:
- `ethixai_aicore_model_cache_hits_total`: Cache hits
- `ethixai_aicore_model_cache_misses_total`: Cache misses
- `ethixai_aicore_model_load_duration_seconds`: Model load time

**Performance Metrics**:
- `ethixai_aicore_memory_usage_bytes`: Memory usage
- `ethixai_aicore_cpu_usage_percent`: CPU usage
- `ethixai_aicore_active_requests`: Active requests

#### Usage

```python
from utils.metrics import (
    record_inference_request,
    record_bias_detection,
    track_inference_time,
    RequestTracker
)

# Decorator for automatic timing
@track_inference_time('credit_scoring')
def run_inference(data):
    # inference logic
    return result

# Manual recording
record_inference_request('credit_scoring', status='success')
record_bias_detection('gender', 'demographic_parity', 'medium')

# Context manager for request tracking
with RequestTracker():
    # process request
    pass
```

#### Endpoint

Access metrics at: `http://localhost:8000/metrics`

---

## Dashboards

### Accessing Grafana

- **URL**: `http://localhost:3001`
- **Default Credentials**:
  - Username: `admin`
  - Password: `admin` (change on first login)

### Dashboard 1: API Performance

**Metrics Displayed**:
- Request rate (req/s)
- Response time percentiles (P50, P95, P99)
- Error rate (%)
- Active requests
- Request distribution by endpoint

**Key Queries**:

```promql
# Request rate
rate(ethixai_backend_http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, 
  sum(rate(ethixai_backend_http_request_duration_ms_bucket[5m])) by (le)
)

# Error rate
sum(rate(ethixai_backend_http_errors_total[5m])) 
/ 
sum(rate(ethixai_backend_http_requests_total[5m]))
```

### Dashboard 2: AI Core Monitoring

**Metrics Displayed**:
- Inference rate (inferences/s)
- Inference latency (P50, P95, P99)
- SHAP computation time
- Model cache hit rate
- Bias detection count

**Key Queries**:

```promql
# Inference rate
rate(ethixai_aicore_inference_requests_total[5m])

# Inference P95
histogram_quantile(0.95,
  sum(rate(ethixai_aicore_inference_duration_seconds_bucket[5m])) by (le, model_type)
)

# Cache hit rate
sum(rate(ethixai_aicore_model_cache_hits_total[5m])) 
/ 
(
  sum(rate(ethixai_aicore_model_cache_hits_total[5m])) 
  + 
  sum(rate(ethixai_aicore_model_cache_misses_total[5m]))
)
```

### Dashboard 3: System Health

**Metrics Displayed**:
- CPU usage (%)
- Memory usage (%)
- Disk usage (%)
- Network I/O
- Container uptime

**Key Queries**:

```promql
# CPU usage
(1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100

# Memory usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100
```

### Dashboard 4: Model Bias Monitoring

**Metrics Displayed**:
- Bias alerts per hour
- Fairness score trends
- Bias distribution by protected attribute
- Bias severity breakdown
- Alert frequency heatmap

**Key Queries**:

```promql
# Bias alerts per hour
sum(increase(ethixai_aicore_bias_detections_total[1h])) by (protected_attribute)

# Fairness score
ethixai_aicore_fairness_score

# Critical bias count
sum(increase(ethixai_aicore_bias_detections_total{severity="critical"}[1h]))
```

---

## Alerting

### Alert Configuration

Alert rules are defined in `/prometheus/alerts/ethixai.yml`

### Alert Categories

1. **API Performance**
   - High error rate (>5%)
   - Slow responses (P95 >1s)
   - High latency (P99 >2s)

2. **AI Core Performance**
   - Slow inference (P95 >500ms)
   - High error rate (>5%)
   - Slow SHAP computation (P95 >5s)

3. **Bias Detection**
   - High bias detection rate (>10/hour)
   - Critical bias detected
   - Low fairness score (<0.6)

4. **System Resources**
   - High CPU usage (>80%)
   - High memory usage (>80%)
   - High disk usage (>80%)

5. **Database**
   - Slow queries (P95 >100ms)
   - High error rate

6. **Security**
   - High auth failure rate
   - Suspicious activity

### Notification Channels

Configure notification channels in Grafana:

1. **Email**:
   ```
   Settings → Alerting → Contact Points → Add Contact Point
   Type: Email
   Addresses: your-team@company.com
   ```

2. **Slack**:
   ```
   Type: Slack
   Webhook URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

3. **PagerDuty**:
   ```
   Type: PagerDuty
   Integration Key: YOUR_KEY
   ```

### Testing Alerts

```bash
# Trigger high error rate alert
for i in {1..100}; do
  curl -X POST http://localhost:5000/api/invalid-endpoint
done

# Trigger slow response alert
curl "http://localhost:5000/api/analyze?delay=2000"

# Check alert status
curl http://localhost:9090/api/v1/alerts
```

---

## Troubleshooting

### No Metrics Appearing

**Problem**: Grafana shows "No data"

**Solutions**:
1. Check Prometheus is scraping:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

2. Verify services expose `/metrics`:
   ```bash
   curl http://localhost:5000/metrics
   curl http://localhost:8000/metrics
   ```

3. Check service health:
   ```bash
   docker-compose ps
   docker-compose logs prometheus
   docker-compose logs grafana
   ```

### High Memory Usage

**Problem**: Prometheus consuming too much memory

**Solutions**:
1. Reduce retention period in `prometheus.yml`:
   ```yaml
   global:
     retention.time: 15d  # Default is 15d
   ```

2. Reduce scrape frequency:
   ```yaml
   scrape_interval: 30s  # Increase from 15s
   ```

3. Enable metric filtering

### Missing Logs

**Problem**: Logs not appearing in files

**Solutions**:
1. Check log directory exists:
   ```bash
   ls -la backend/logs/
   ls -la ai_core/logs/
   ```

2. Check log level configuration:
   ```bash
   echo $LOG_LEVEL
   echo $NODE_ENV
   ```

3. Verify permissions:
   ```bash
   chmod -R 755 backend/logs/
   chmod -R 755 ai_core/logs/
   ```

### Dashboard Not Loading

**Problem**: Grafana dashboard shows errors

**Solutions**:
1. Check Prometheus datasource:
   ```
   Grafana → Configuration → Data Sources → Prometheus
   Click "Test" button
   ```

2. Verify dashboard JSON syntax:
   ```bash
   cat grafana/dashboards/api-performance.json | jq .
   ```

3. Re-import dashboard:
   ```
   Dashboards → Import → Upload JSON
   ```

---

## Best Practices

### Logging

1. **Use Structured Logging**: Always log objects, not strings
   ```javascript
   // Good
   logger.info('User action', { userId, action, timestamp });
   
   // Bad
   logger.info(`User ${userId} performed ${action}`);
   ```

2. **Include Context**: Add correlation IDs for request tracking
   ```javascript
   logger.info('Event occurred', {
     correlationId: req.correlationId,
     userId: req.user.id
   });
   ```

3. **Log at Appropriate Levels**:
   - `error`: Failures requiring immediate attention
   - `warn`: Potential issues
   - `info`: Business events
   - `debug`: Development information

4. **Avoid Logging Sensitive Data**:
   ```javascript
   // Never log passwords, tokens, or PII
   logger.info('Login attempt', {
     email: maskEmail(email), // Mask PII
     // password: 'xxx' // NEVER log passwords
   });
   ```

### Metrics

1. **Use Labels Wisely**: Keep cardinality low
   ```javascript
   // Good
   counter.labels({ status: 'success' }).inc();
   
   // Bad (high cardinality)
   counter.labels({ userId: userId }).inc(); // Don't use unique IDs
   ```

2. **Choose Right Metric Types**:
   - **Counter**: Always increasing (requests, errors)
   - **Gauge**: Can go up or down (active users, queue depth)
   - **Histogram**: Distributions (latency, sizes)
   - **Summary**: Similar to histogram, client-side quantiles

3. **Set Appropriate Buckets**:
   ```javascript
   const histogram = new Histogram({
     buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10] // Tailored to expected values
   });
   ```

4. **Don't Over-Instrument**: Focus on actionable metrics

### Dashboards

1. **Organize by Audience**:
   - **Operations**: System health, errors
   - **Development**: API performance, cache hit rates
   - **Business**: User metrics, bias detections

2. **Use Consistent Color Schemes**:
   - Green: Good/Normal
   - Yellow: Warning
   - Red: Critical/Error

3. **Add Context**: Include descriptions and links to runbooks

4. **Test Alerts**: Trigger alerts in staging before production

### Performance

1. **Log Rotation**: Enable automatic rotation
2. **Metric Retention**: Set appropriate retention periods
3. **Sampling**: Sample high-volume logs if necessary
4. **Async Logging**: Use async transports for high throughput

---

## Monitoring Checklist

### Daily
- [ ] Check Grafana dashboards for anomalies
- [ ] Review error logs
- [ ] Verify all services are up
- [ ] Check alert status

### Weekly
- [ ] Review bias detection trends
- [ ] Analyze performance metrics
- [ ] Check log storage usage
- [ ] Review and clear acknowledged alerts

### Monthly
- [ ] Update alert thresholds based on trends
- [ ] Archive old logs
- [ ] Review and optimize slow queries
- [ ] Update documentation

---

## Quick Reference

### Important URLs

- Grafana: `http://localhost:3001`
- Prometheus: `http://localhost:9090`
- Backend Metrics: `http://localhost:5000/metrics`
- AI Core Metrics: `http://localhost:8000/metrics`

### Common Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f ai-core

# Restart monitoring stack
docker-compose restart prometheus grafana

# Check metrics endpoint
curl http://localhost:5000/metrics | grep ethixai

# Query Prometheus
curl "http://localhost:9090/api/v1/query?query=up"

# Check alert status
curl http://localhost:9090/api/v1/alerts | jq
```

### Log File Locations

```
backend/logs/
├── combined.log      # All logs
├── error.log         # Errors only

ai_core/logs/
├── ai_core.log       # All logs
├── error.log         # Errors only
├── ai_core.json      # JSON format
└── audit.log         # Compliance events
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review logs in `/logs` directories
3. Check Grafana alerts
4. Contact DevOps team

---

**Last Updated**: Day 27 - System Monitoring Implementation
**Version**: 1.0.0
