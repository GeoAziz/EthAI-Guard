# Production Deployment Plan - EthixAI

**Version:** 1.0  
**Date:** 2025-11-16  
**Status:** Active  
**Owner:** DevOps/SRE Team

---

## 1. Executive Summary

This document defines the production-ready architecture for EthixAI, a bias detection and fairness analysis platform. Based on Day 14 performance testing findings (66.81% error rate at 25 req/s single-replica deployment), this plan mandates **horizontal scaling, managed services, and zero-downtime deployment patterns** as prerequisites for production launch.

**Critical Requirements:**
- ✅ Horizontal autoscaling (backend: 3-13 replicas, ai_core: 6-11 replicas)
- ✅ Managed database with automated backups (MongoDB Atlas)
- ✅ Zero-downtime deployments (canary or blue/green)
- ✅ Secrets management via cloud provider (GCP Secret Manager / AWS Secrets Manager)
- ✅ TLS termination and WAF protection
- ✅ Centralized logging and metrics (Prometheus + Grafana + alerting)

---

## 2. Hosting Selection & Rationale

### Recommended Architecture: **Hybrid Cloud (Pragmatic MVP)**

**Components:**

| Service | Platform | Rationale |
|---------|----------|-----------|
| **Frontend** | Vercel | Static SPA, edge CDN, instant preview deploys, free tier → $20/mo pro |
| **Backend (system_api)** | GCP Cloud Run (or AWS Fargate) | Serverless containers, auto-scale 0→N, pay-per-use, built-in load balancing |
| **AI Core (ai_core)** | GCP Cloud Run (or AWS Fargate) | CPU-intensive SHAP workloads; independent scaling from backend |
| **Database** | MongoDB Atlas (M10+) | Managed, automated backups, point-in-time recovery, read replicas |
| **Object Storage** | GCS (or S3) | Report PDFs, model artifacts, SHAP cache; versioned with lifecycle rules |
| **Container Registry** | GitHub Container Registry (GHCR) | Integrated with GitHub Actions, free for public repos, supports OCI |
| **Secrets** | GCP Secret Manager | Encrypted at rest, IAM-controlled access, audit logs, version history |
| **Monitoring** | Prometheus (self-hosted) + Cloud Monitoring | Hybrid: custom metrics + cloud-native dashboards; Grafana for visualization |
| **Logging** | Cloud Logging (Stackdriver / CloudWatch) | Centralized JSON logs, query interface, retention policies |
| **Alerting** | PagerDuty + Slack | Critical alerts → PagerDuty on-call rotation; warnings → Slack #alerts |

### Why This Stack?

1. **Cost-Effective:** Serverless containers eliminate idle costs; free tiers cover dev/staging
2. **Scalability:** Cloud Run/Fargate autoscale 0→1000+ instances based on CPU/requests
3. **Operational Simplicity:** No Kubernetes complexity until scaling beyond 50+ microservices
4. **Compliance-Ready:** Managed services provide SOC2/HIPAA compliance paths (if needed)
5. **Fast Iteration:** Preview deploys per PR; instant rollbacks; integrated CI/CD

### Alternative Paths (Future Consideration)

| Option | When to Use | Tradeoffs |
|--------|-------------|-----------|
| **Railway/Render** | MVP demos, small teams | Simple setup but less control; migrate to cloud for production |
| **Kubernetes (GKE/EKS)** | >20 services, complex orchestration | Higher ops burden; use when serverless containers hit limits |
| **Self-Hosted (VMs)** | Regulatory constraints, cost optimization at scale | Full control but high ops overhead; not recommended for MVP |

---

## 3. Production Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS (HTTPS)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Cloud Load Balancer │  (TLS termination, WAF, rate limiting)
              │   + API Gateway       │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
  ┌────────────┐  ┌────────────┐  ┌────────────┐
  │  Frontend  │  │  Backend   │  │  AI Core   │
  │  (Vercel)  │  │ (Cloud Run)│  │(Cloud Run) │
  │   Static   │  │  3-13 pods │  │ 6-11 pods  │
  │    SPA     │  │            │  │            │
  └────────────┘  └─────┬──────┘  └─────┬──────┘
                        │               │
                        │ MongoDB URI   │ (SHAP compute)
                        ▼               ▼
                  ┌──────────────────────────┐
                  │   MongoDB Atlas (M10+)   │
                  │  - Primary + 2 replicas  │
                  │  - Auto backups (daily)  │
                  │  - Point-in-time recovery│
                  └──────────────────────────┘
                        │
                        │ (Backup snapshots)
                        ▼
                  ┌──────────────────────────┐
                  │  Object Storage (GCS/S3) │
                  │  - Report PDFs           │
                  │  - Model artifacts       │
                  │  - SHAP baseline cache   │
                  └──────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │               OBSERVABILITY LAYER                      │
  ├────────────────────────────────────────────────────────┤
  │  Prometheus (metrics) → Grafana (dashboards)          │
  │  Cloud Logging (structured JSON) → Query console      │
  │  Alertmanager → PagerDuty (critical) + Slack (warn)  │
  └────────────────────────────────────────────────────────┘
```

---

## 4. Service Configuration

### 4.1 Frontend (Next.js SPA)

**Platform:** Vercel  
**Build Command:** `npm run build`  
**Output:** Static export or SSR (if using Next.js API routes)  
**Environment Variables:**
- `NEXT_PUBLIC_API_URL` = `https://api.ethixai.com` (backend load balancer URL)

**Deployment:**
- Automatic preview deploys per PR
- Production deploy on merge to `main`
- Instant rollback via Vercel dashboard

**CDN:** Vercel Edge Network (global edge caching)

---

### 4.2 Backend (Node.js Express)

**Platform:** GCP Cloud Run (or AWS Fargate)  
**Container Image:** `ghcr.io/geoaziz/ethixai-backend:sha-<commit>`  
**Port:** 5000 (internal); exposed via load balancer on 443  
**Concurrency:** 80 requests per container (Cloud Run default)  
**Autoscaling:**
- Min instances: 3 (avoid cold starts)
- Max instances: 13 (per Day 14 capacity plan for 50 RPS)
- Scale trigger: CPU > 60% for 60s OR custom metric `http_request_duration_seconds{quantile="0.95"} > 2s`

**Resources:**
- CPU: 1 vCPU per container
- Memory: 512 MB per container (can increase to 1 GB if heap pressure observed)

**Health Checks:**
- Liveness: `GET /health/liveness` (expect 200)
- Readiness: `GET /health/readiness` (checks MongoDB connectivity)
- Startup probe: 30s timeout for initial DB connection

**Environment Variables (from Secret Manager):**
- `NODE_ENV=production`
- `PORT=5000`
- `SECRET_KEY` (JWT HMAC secret)
- `REFRESH_SECRET` (refresh token secret)
- `MONGO_URI` (MongoDB Atlas connection string)
- `AI_CORE_URL=http://ai-core-service:8100` (internal Cloud Run service URL)
- `LOG_LEVEL=info`
- `SENTRY_DSN` (error tracking)
- `RELEASE_VERSION` (injected by CI)

---

### 4.3 AI Core (FastAPI Python)

**Platform:** GCP Cloud Run (or AWS Fargate)  
**Container Image:** `ghcr.io/geoaziz/ethixai-ai-core:sha-<commit>`  
**Port:** 8100 (internal)  
**Concurrency:** 10 requests per container (SHAP compute is CPU-bound)  
**Autoscaling:**
- Min instances: 6 (per Day 14 capacity plan)
- Max instances: 11 (for 50 RPS analyze load at 500 rows)
- Scale trigger: CPU > 70% for 60s OR custom metric `ai_core_analysis_seconds{quantile="0.95"} > 8s`

**Resources:**
- CPU: 2 vCPU per container (SHAP TreeExplainer benefits from multi-threading)
- Memory: 1 GB per container (sklearn + shap models)

**Health Checks:**
- Liveness: `GET /health/liveness` (expect 200)
- Readiness: `GET /health/readiness` (checks model loaded, DB connectivity)
- Startup probe: 60s timeout for model initialization

**Environment Variables:**
- `MONGO_URI` (MongoDB Atlas connection string)
- `AI_CORE_URL=http://ai-core-service:8100` (self-reference for internal health checks)
- `LOG_LEVEL=info`
- `SENTRY_DSN`
- `RELEASE_VERSION`

---

### 4.4 MongoDB Atlas

**Cluster Tier:** M10 (2 GB RAM, 10 GB storage, 0.2 vCPU)  
**Topology:** 3-node replica set (1 primary + 2 secondaries)  
**Region:** US-East-1 (or closest to Cloud Run region for latency)  
**Backup:**
- Automated snapshots: Daily at 02:00 UTC
- Retention: 30 days (configurable up to 90 days)
- Point-in-time recovery: Enabled (1-hour granularity)

**Connection:**
- Use connection string with `retryWrites=true&w=majority`
- Connection pool: 100 max connections (scale with replicas)
- TLS: Enforced via connection string

**Monitoring:**
- Atlas alerts for CPU > 80%, disk > 80%, slow queries > 100ms
- Integrate with Prometheus via MongoDB exporter (optional)

---

### 4.5 Object Storage (GCS)

**Bucket:** `ethixai-production-artifacts`  
**Region:** `us-east1` (same as Cloud Run)  
**Lifecycle Rules:**
- Delete objects > 365 days old (report PDFs)
- Transition to Nearline storage after 90 days (model artifacts)

**Access Control:**
- IAM: Backend/AI Core service accounts have `storage.objectCreator` role
- Public access: Denied (use signed URLs for report downloads)

**Encryption:** Server-side encryption (SSE) with Google-managed keys

---

## 5. Networking & Security

### 5.1 VPC & Private Connectivity

- **Cloud Run:** Use VPC connector for private communication between backend ↔ ai_core
- **MongoDB Atlas:** Whitelist Cloud Run egress IPs OR use VPC peering (recommended for production)
- **Internal Traffic:** All service-to-service calls over private IPs (no public internet)

### 5.2 TLS & Certificates

- **Frontend (Vercel):** Automatic Let's Encrypt certificate; HTTPS enforced
- **Backend/AI Core:** Cloud Run provides TLS termination; custom domain via Cloud Load Balancer with managed SSL cert
- **HSTS:** Enabled with 1-year max-age; include subdomains

### 5.3 API Gateway & Rate Limiting

- **Cloud Endpoints (GCP) or API Gateway (AWS):**
  - Rate limiting: 100 req/min per IP for public endpoints
  - Authenticated endpoints: 500 req/min per user (based on JWT `sub` claim)
  - Burst allowance: 200 requests

### 5.4 Web Application Firewall (WAF)

- **Google Cloud Armor (GCP) or AWS WAF:**
  - Enable OWASP Core Rule Set (CRS)
  - Block: SQL injection, XSS, path traversal patterns
  - Geo-blocking: (Optional) restrict to specific regions if needed

### 5.5 IAM & Service Accounts

- **Principle of Least Privilege:**
  - Backend service account: `roles/secretmanager.secretAccessor`, `roles/storage.objectCreator`
  - AI Core service account: `roles/secretmanager.secretAccessor`, `roles/storage.objectViewer`
  - CI/CD service account: `roles/run.admin`, `roles/storage.admin`, `roles/artifactregistry.writer`

- **Workload Identity (GCP) or IRSA (AWS):** Bind Kubernetes service accounts to cloud IAM roles (if using K8s)

---

## 6. Autoscaling Configuration

### Backend Autoscaling (Cloud Run Example)

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ethixai-backend
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "3"
        autoscaling.knative.dev/maxScale: "13"
        autoscaling.knative.dev/target: "80"  # 80 concurrent requests per pod
    spec:
      containers:
      - image: ghcr.io/geoaziz/ethixai-backend:sha-abc123
        resources:
          limits:
            cpu: "1000m"
            memory: "512Mi"
```

### AI Core Autoscaling

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ethixai-ai-core
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "6"
        autoscaling.knative.dev/maxScale: "11"
        autoscaling.knative.dev/target: "10"  # 10 concurrent requests per pod (CPU-bound)
    spec:
      containers:
      - image: ghcr.io/geoaziz/ethixai-ai-core:sha-abc123
        resources:
          limits:
            cpu: "2000m"
            memory: "1Gi"
```

---

## 7. Cost Estimates

**Monthly Production Costs (50 RPS mixed load, 24/7 uptime):**

| Service | Configuration | Estimated Cost (USD/month) |
|---------|---------------|---------------------------|
| **Frontend (Vercel Pro)** | Static hosting + edge CDN | $20 |
| **Backend (Cloud Run)** | 3-13 instances, 1 vCPU, 512 MB | $80-$250 (scales with traffic) |
| **AI Core (Cloud Run)** | 6-11 instances, 2 vCPU, 1 GB | $200-$400 (CPU-intensive) |
| **MongoDB Atlas (M10)** | 3-node replica set, 10 GB storage | $57 (0.08/hr × 3 nodes × 730 hrs) |
| **Object Storage (GCS)** | 100 GB, 10K requests/day | $5-$10 |
| **Cloud Load Balancer** | Forwarding rules + data processed | $20-$50 |
| **Secrets Manager** | 10 secrets, 1K accesses/day | $1 |
| **Logging & Monitoring** | 10 GB logs/month, custom metrics | $20-$50 |
| **PagerDuty (Team Plan)** | On-call scheduling | $25/user (optional) |
| **Domain & DNS** | ethixai.com + managed DNS | $12/year (~$1/month) |

**Total MVP Production:** **$423-$836/month**

**Scaling Costs:**
- At 100 RPS: Double backend/ai_core instances → ~$800-$1,400/month
- At 200 RPS: Quadruple instances → ~$1,500-$2,500/month

**Cost Optimization Strategies:**
1. Use Cloud Run's scale-to-zero for non-production environments
2. Enable committed use discounts (GCP) or savings plans (AWS) for 1-year term → 30% savings
3. Archive old logs to Nearline/Glacier after 30 days → 50% storage cost reduction
4. Use spot instances for non-critical workloads (not recommended for production API)

---

## 8. Deployment Environments

| Environment | Purpose | Configuration | CI Trigger |
|-------------|---------|---------------|------------|
| **Development** | Local dev, unit tests | Docker Compose, in-memory DB | N/A (local only) |
| **Staging** | Integration tests, smoke tests | Cloud Run (min 1 replica), MongoDB Atlas M0 (free tier) | On push to `main` |
| **Production** | Live user traffic | Cloud Run (min 3-6 replicas), MongoDB Atlas M10+ | On tag `v*.*.*` (semantic versioning) |

**Deployment Flow:**
```
Developer → PR → CI Tests → Merge to main → Deploy Staging → Smoke Tests
                                ↓
                          (On git tag v1.2.3)
                                ↓
                     Deploy Canary (10% traffic) → Monitor 15 min
                                ↓
                     (If healthy) Promote to 100% → Production
```

---

## 9. Rollout Strategy: Canary Deployment

**Why Canary?**
- Gradual traffic shift (10% → 50% → 100%) minimizes blast radius
- Metrics-based promotion ensures stability before full rollout
- Instant rollback if error rate or latency spikes

**Canary Configuration (Cloud Run Traffic Splitting):**

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ethixai-backend
spec:
  traffic:
  - revisionName: ethixai-backend-canary  # New version
    percent: 10
  - revisionName: ethixai-backend-stable  # Current version
    percent: 90
    tag: stable
```

**Promotion Criteria (automated via CI + monitoring):**
1. **Error Rate:** HTTP 5xx < 0.5% for 15 minutes
2. **Latency:** P95 latency < 2s for backend, < 8s for ai_core
3. **CPU/Memory:** No container restarts due to OOM
4. **Smoke Tests:** All critical API paths return 200

**If any criterion fails:** Automatically rollback to 100% stable revision.

---

## 10. Blue/Green Alternative (Future)

**When to use:** When instant rollback is critical (e.g., financial transactions, compliance-sensitive).

**How it works:**
1. Deploy new version (green) alongside current (blue)
2. Run smoke tests against green environment
3. Switch DNS/load balancer to green
4. Keep blue environment warm for 24 hours (instant rollback)
5. Decommission blue after validation period

**Tradeoff:** Requires 2x resources during cutover (double cost for 1-2 days).

---

## 11. Observability & Monitoring

### Metrics to Track

**Backend:**
- `http_requests_total` (counter, labels: method, route, status)
- `http_request_duration_seconds` (histogram, P50/P95/P99)
- `nodejs_heap_size_used_bytes` (gauge)
- `process_cpu_seconds_total` (counter)

**AI Core:**
- `ai_core_analysis_seconds` (histogram, P50/P95/P99)
- `ai_core_errors_total` (counter)
- `ai_core_shap_cache_hits_total` / `ai_core_shap_cache_misses_total` (counters)

**MongoDB:**
- Connection pool size, slow queries, replication lag (via Atlas monitoring)

### Dashboards (Grafana)

1. **Service Health:** HTTP status codes, error rates, request rates
2. **Latency Overview:** P50/P95/P99 for all endpoints
3. **Resource Utilization:** CPU, memory, disk I/O per service
4. **Business Metrics:** Analyze requests/hour, report generation rate, user registrations

### Alerting Rules (Prometheus Alertmanager)

```yaml
groups:
- name: production_critical
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High 5xx error rate on {{ $labels.service }}"
      
  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "P95 latency > 2s on {{ $labels.service }}"
```

---

## 12. Acceptance Criteria

**Production readiness checklist:**

- [ ] All services deploy successfully to staging via CI
- [ ] Smoke tests pass on staging (health checks + synthetic analyze request)
- [ ] Secrets stored in Secret Manager; no plaintext secrets in repo
- [ ] TLS enforced on all public endpoints (HTTPS only)
- [ ] MongoDB Atlas backups enabled with 30-day retention
- [ ] Autoscaling configured with min/max replicas
- [ ] Canary deployment tested in staging (traffic split working)
- [ ] Rollback procedure documented and tested
- [ ] Monitoring dashboards created in Grafana
- [ ] Critical alerts configured (error rate, latency, DB connections)
- [ ] Cost estimates reviewed and approved by product team
- [ ] DR runbook created and recovery tested in sandbox

---

## 13. Next Steps (Post-Day 15)

1. **Week 1:** Execute first production deployment following this plan
2. **Week 2:** Run Day 14 load tests against production to validate autoscaling
3. **Week 3:** Optimize SHAP caching to achieve 80% cache hit rate
4. **Month 2:** Implement async analyze queue (Bull + Redis) for >50 RPS
5. **Quarter 2:** Evaluate migration to Kubernetes if service count exceeds 10

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-16 | DevOps Team | Initial production plan based on Day 14 findings |

---

**Approval:**
- [ ] DevOps Lead: _________________ Date: _______
- [ ] Security Lead: ________________ Date: _______
- [ ] Product Lead: _________________ Date: _______
