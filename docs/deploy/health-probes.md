# Health Probes & Readiness Checks - EthixAI

**Version:** 1.0  
**Date:** 2025-11-16  
**Owner:** Platform Engineering  
**Applies to:** Backend, AI Core, Frontend (static health page)

---

## 1. Overview

**Health probes** are HTTP endpoints that orchestrators (Cloud Run, Kubernetes, load balancers) use to determine service health and readiness. EthixAI implements three probe types:

1. **Liveness Probe** (`/health/liveness`) — Process is alive and not deadlocked
2. **Readiness Probe** (`/health/readiness`) — Service is ready to accept traffic (DB connected, models loaded)
3. **Startup Probe** (`/health/startup`) — Initial startup health check (fail fast if critical init fails)

**Key Principles:**
- ✅ **Fail fast:** Liveness fails kill the container (orchestrator restarts it)
- ✅ **Graceful degradation:** Readiness fails remove from load balancer (temporary, not fatal)
- ✅ **No cascading failures:** Health checks must NOT call other services (only local checks)
- ✅ **Fast responses:** Return within 500ms to avoid timeout cascades

---

## 2. Endpoint Specifications

### 2.1 Liveness Probe (`/health/liveness`)

**Purpose:** Detect if process is alive and responsive. **Does NOT check external dependencies** (DB, external APIs).

**Success Criteria:**
- Process can handle HTTP requests
- No deadlocks or infinite loops
- Memory usage under critical threshold (< 90% of container limit)

**Response:**

```http
GET /health/liveness HTTP/1.1
Host: backend.ethixai.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "timestamp": "2025-11-16T10:23:45Z",
  "service": "ethixai-backend",
  "version": "v1.2.3"
}
```

**Failure Response (process deadlocked, memory exhausted):**

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "status": "error",
  "reason": "Memory usage critical: 95%",
  "timestamp": "2025-11-16T10:25:00Z"
}
```

**Implementation (Backend/Node.js):**

```javascript
// backend/src/health.js
const os = require('os');

function livenessCheck(req, res) {
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const usedMemory = memoryUsage.rss;
  const memoryPercent = (usedMemory / totalMemory) * 100;

  if (memoryPercent > 90) {
    return res.status(503).json({
      status: 'error',
      reason: `Memory usage critical: ${memoryPercent.toFixed(2)}%`,
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ethixai-backend',
    version: process.env.RELEASE_VERSION || 'unknown'
  });
}

module.exports = { livenessCheck };
```

---

### 2.2 Readiness Probe (`/health/readiness`)

**Purpose:** Determine if service is ready to accept traffic. **Checks external dependencies** (database, model loading status).

**Success Criteria:**
- Database connection pool has available connections
- AI Core: ML models loaded and ready for inference
- All critical background workers are running

**Response (Ready):**

```http
GET /health/readiness HTTP/1.1
Host: backend.ethixai.com

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "workers": "ok"
  },
  "timestamp": "2025-11-16T10:23:45Z"
}
```

**Response (Not Ready - Database Unavailable):**

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "status": "not_ready",
  "checks": {
    "database": "error - connection timeout",
    "redis": "ok",
    "workers": "ok"
  },
  "timestamp": "2025-11-16T10:25:00Z"
}
```

**Implementation (Backend/Node.js):**

```javascript
// backend/src/health.js
const mongoose = require('mongoose');

async function readinessCheck(req, res) {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
    workers: 'unknown'
  };

  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      checks.database = 'ok';
    } else {
      checks.database = 'error - not connected';
      return res.status(503).json({ status: 'not_ready', checks, timestamp: new Date().toISOString() });
    }

    // Check Redis connection (if using for caching/queues)
    // const redisPing = await redisClient.ping();
    // checks.redis = redisPing === 'PONG' ? 'ok' : 'error';

    checks.redis = 'ok'; // Placeholder if not using Redis yet
    checks.workers = 'ok'; // Check background job processor status

    res.status(200).json({
      status: 'ready',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    checks.database = `error - ${err.message}`;
    res.status(503).json({
      status: 'not_ready',
      checks,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = { livenessCheck, readinessCheck };
```

**Implementation (AI Core/Python):**

```python
# ai_core/health.py
from fastapi import APIRouter, Response
from pymongo import MongoClient
import os

router = APIRouter()

# Global flag set after model loading
models_loaded = False
mongo_client = None

@router.get("/health/liveness")
def liveness():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@router.get("/health/readiness")
def readiness(response: Response):
    checks = {
        "models": "unknown",
        "database": "unknown"
    }
    
    # Check if ML models loaded
    if not models_loaded:
        checks["models"] = "error - models not loaded"
        response.status_code = 503
        return {"status": "not_ready", "checks": checks}
    
    checks["models"] = "ok"
    
    # Check MongoDB connection
    try:
        mongo_client.admin.command('ping')
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error - {str(e)}"
        response.status_code = 503
        return {"status": "not_ready", "checks": checks}
    
    return {"status": "ready", "checks": checks}

def set_models_loaded():
    """Called after model initialization completes"""
    global models_loaded
    models_loaded = True
```

---

### 2.3 Startup Probe (`/health/startup`)

**Purpose:** Allow slow-starting services (e.g., AI Core loading 500MB models) to initialize without being killed prematurely.

**Behavior:**
- Used **only during container startup**
- Liveness/readiness probes delayed until startup succeeds
- Longer timeout (e.g., 60s) to accommodate model loading

**Response (Still Starting):**

```http
GET /health/startup HTTP/1.1
Host: ai-core.ethixai.com

HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "status": "starting",
  "progress": "Loading SHAP explainer models...",
  "timestamp": "2025-11-16T10:20:30Z"
}
```

**Response (Startup Complete):**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "started",
  "timestamp": "2025-11-16T10:21:15Z",
  "startup_duration_seconds": 45
}
```

**Implementation (AI Core):**

```python
import time
startup_time = None
startup_complete = False

@router.get("/health/startup")
def startup(response: Response):
    if not startup_complete:
        response.status_code = 503
        return {
            "status": "starting",
            "progress": "Loading ML models and dependencies...",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    duration = time.time() - startup_time if startup_time else 0
    return {
        "status": "started",
        "startup_duration_seconds": int(duration),
        "timestamp": datetime.utcnow().isoformat()
    }

# Called after model loading
def mark_startup_complete():
    global startup_complete, startup_time
    startup_complete = True
    startup_time = time.time()
```

---

## 3. Cloud Run Configuration

### 3.1 Backend Service (Node.js)

**Cloud Run service YAML:**

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ethixai-backend
  namespace: production
spec:
  template:
    spec:
      containers:
      - image: ghcr.io/geoaziz/ethixai-backend:sha-abc123
        ports:
        - containerPort: 3001
        
        # Startup probe (allows 60s for initialization)
        startupProbe:
          httpGet:
            path: /health/startup
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 12  # 60s total (12 * 5s)
        
        # Liveness probe (restart if fails)
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3  # Restart after 30s of failures
        
        # Readiness probe (remove from load balancer if fails)
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2  # Remove from LB after 10s of failures
          successThreshold: 1  # Add back after 1 success
```

---

### 3.2 AI Core Service (Python/FastAPI)

**Cloud Run service YAML:**

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ethixai-ai-core
  namespace: production
spec:
  template:
    spec:
      containers:
      - image: ghcr.io/geoaziz/ethixai-ai-core:sha-def456
        ports:
        - containerPort: 8100
        
        # Startup probe (allows 120s for model loading)
        startupProbe:
          httpGet:
            path: /health/startup
            port: 8100
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 12  # 120s total (12 * 10s)
        
        # Liveness probe
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 8100
          initialDelaySeconds: 15
          periodSeconds: 15
          timeoutSeconds: 5
          failureThreshold: 3  # Restart after 45s of failures
        
        # Readiness probe (checks DB + models loaded)
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 8100
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 2
```

---

## 4. Kubernetes Configuration (Alternative)

**If deploying to GKE/EKS instead of Cloud Run:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ethixai-backend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/geoaziz/ethixai-backend:sha-abc123
        ports:
        - containerPort: 3001
        
        startupProbe:
          httpGet:
            path: /health/startup
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 12
        
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 2
        
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

---

## 5. Load Balancer Health Checks

### 5.1 GCP Load Balancer (Cloud Run Frontend)

**Health check configuration:**

```bash
gcloud compute health-checks create http backend-health-check \
  --request-path="/health/readiness" \
  --port=3001 \
  --check-interval=10s \
  --timeout=5s \
  --unhealthy-threshold=2 \
  --healthy-threshold=1
```

**Backend service with health check:**

```bash
gcloud compute backend-services create ethixai-backend-service \
  --protocol=HTTP \
  --health-checks=backend-health-check \
  --global
```

---

### 5.2 AWS Application Load Balancer (ALB)

**Target group health check:**

```bash
aws elbv2 create-target-group \
  --name ethixai-backend-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-abc123 \
  --health-check-protocol HTTP \
  --health-check-path "/health/readiness" \
  --health-check-interval-seconds 10 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 2
```

---

## 6. Monitoring & Alerting

### 6.1 Prometheus Metrics

**Instrument health check endpoints with Prometheus counters:**

```javascript
// backend/src/health.js
const promClient = require('prom-client');

const healthCheckCounter = new promClient.Counter({
  name: 'health_check_total',
  help: 'Total health check requests',
  labelNames: ['endpoint', 'status']
});

function livenessCheck(req, res) {
  // ... health check logic
  const status = isHealthy ? 'ok' : 'error';
  healthCheckCounter.inc({ endpoint: 'liveness', status });
  // ... return response
}
```

**Query health check failure rate:**

```promql
rate(health_check_total{status="error"}[5m]) > 0
```

---

### 6.2 Alerting Rules

**Alert if readiness checks fail repeatedly:**

```yaml
# grafana/alerting_rules.yml
groups:
- name: health_checks
  interval: 30s
  rules:
  - alert: ServiceNotReady
    expr: rate(health_check_total{endpoint="readiness", status="error"}[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "{{ $labels.service }} failing readiness checks"
      description: "Service {{ $labels.service }} has failed readiness checks for 2 minutes"
  
  - alert: ServiceNotAlive
    expr: rate(health_check_total{endpoint="liveness", status="error"}[1m]) > 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "{{ $labels.service }} failing liveness checks (will restart)"
      description: "Service {{ $labels.service }} is not responding to liveness probes"
```

---

## 7. Testing Health Probes

### 7.1 Manual Testing

**Test liveness probe:**

```bash
curl -i http://localhost:3001/health/liveness
# Expected: HTTP/1.1 200 OK

# Simulate memory pressure (will fail liveness)
stress --vm 1 --vm-bytes 900M --timeout 10s &
curl -i http://localhost:3001/health/liveness
# Expected: HTTP/1.1 503 Service Unavailable
```

**Test readiness probe (disconnect database):**

```bash
# Stop MongoDB temporarily
docker stop day15-mongo-1

curl -i http://localhost:3001/health/readiness
# Expected: HTTP/1.1 503 Service Unavailable
# Response: {"status":"not_ready","checks":{"database":"error - connection timeout"}}

# Restart MongoDB
docker start day15-mongo-1

# Wait for reconnection
sleep 5
curl -i http://localhost:3001/health/readiness
# Expected: HTTP/1.1 200 OK
```

---

### 7.2 Automated Testing (Integration Tests)

**Test readiness probe in CI:**

```javascript
// backend/tests/test_health_probes.js
const request = require('supertest');
const app = require('../src/server');

describe('Health Probes', () => {
  it('liveness probe returns 200 when service healthy', async () => {
    const res = await request(app).get('/health/liveness');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('readiness probe returns 503 when database unavailable', async () => {
    // Disconnect MongoDB
    await mongoose.connection.close();
    
    const res = await request(app).get('/health/readiness');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.checks.database).toContain('error');
    
    // Reconnect for cleanup
    await mongoose.connect(process.env.MONGO_URL);
  });
});
```

---

## 8. Troubleshooting

### 8.1 Readiness Probe Failing (Service Unavailable)

**Symptoms:**
- Cloud Run shows "Service not ready" in logs
- Load balancer marks backend as unhealthy
- User traffic returns 503 errors

**Diagnosis:**

```bash
# Check health endpoint manually
curl -i https://backend.ethixai.com/health/readiness

# Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ethixai-backend" \
  --limit=50 \
  --format=json | jq '.[] | select(.httpRequest.requestUrl | contains("/health/readiness"))'
```

**Common Causes:**
1. Database connection pool exhausted → Increase `maxPoolSize` in Mongoose config
2. MongoDB replica set primary election → Wait 30-60s for automatic recovery
3. Model loading failed (AI Core) → Check `/var/log/ai_core.log` for TensorFlow errors

---

### 8.2 Liveness Probe Failing (Container Restarts)

**Symptoms:**
- Cloud Run shows "Container unhealthy" in events
- Service restarts every 30-60 seconds
- Metrics show sawtooth pattern (memory drops at restart)

**Diagnosis:**

```bash
# Check restart count
gcloud run revisions describe ethixai-backend-00042-abc \
  --region=us-east1 \
  --format="value(status.conditions)"

# Check memory usage before restart
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/container/memory/utilizations"' \
  --interval-start-time="2025-11-16T10:00:00Z" \
  --interval-end-time="2025-11-16T11:00:00Z"
```

**Common Causes:**
1. Memory leak → Profile with `node --heap-prof` or `py-spy`
2. Deadlock in request handler → Review stack traces in Sentry
3. Blocking I/O on liveness endpoint → Ensure health check is async

---

## 9. Best Practices

1. **Never call external services from liveness probe** (only check process health)
2. **Keep readiness checks fast** (< 500ms response time; use connection pool, not new connections)
3. **Set appropriate thresholds:**
   - Liveness: `failureThreshold=3`, `periodSeconds=10` → restart after 30s
   - Readiness: `failureThreshold=2`, `periodSeconds=5` → remove from LB after 10s
4. **Use startup probes for slow-starting services** (AI Core model loading takes 30-60s)
5. **Monitor health check failure rates** (alert if readiness fails >10% of requests)
6. **Test in staging:** Simulate DB disconnects, memory pressure, slow model loading

---

## 10. Implementation Checklist

- [ ] Backend `/health/liveness` endpoint implemented (checks memory usage)
- [ ] Backend `/health/readiness` endpoint implemented (checks MongoDB connection)
- [ ] AI Core `/health/startup` endpoint implemented (checks model loading status)
- [ ] AI Core `/health/readiness` endpoint implemented (checks DB + models ready)
- [ ] Cloud Run service YAML includes all three probes (startup, liveness, readiness)
- [ ] Load balancer health checks configured (`/health/readiness` path)
- [ ] Prometheus metrics added for health check success/failure rates
- [ ] Alerting rules configured for readiness failures >10% over 5 minutes
- [ ] Integration tests validate health probe behavior (DB disconnect, memory pressure)
- [ ] Staging environment tested with simulated failures (DB down, OOM, model load error)

---

## References

- [Cloud Run Health Checks](https://cloud.google.com/run/docs/configuring/healthchecks)
- [Kubernetes Probe Configuration](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [GCP Load Balancer Health Checks](https://cloud.google.com/load-balancing/docs/health-checks)
- [AWS ALB Target Health](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-16 | Platform Engineering | Initial health probe specification |

