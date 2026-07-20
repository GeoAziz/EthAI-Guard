# EthixAI Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS (HTTPS)                                  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 15)                               │
│  Port: 3000                                                                  │
│                                                                              │
│  ├─ Authentication Pages (Login, Register, Forgot Password)                 │
│  ├─ Analyst Dashboard (Bias Analysis, Model Comparison)                     │
│  ├─ Reviewer Dashboard (Approvals, Compliance Sign-offs)                    │
│  ├─ Admin Dashboard (Users, Policies, Audit Logs, Federated Learning)      │
│  ├─ Model Management (Versions, Retraining, Promotion)                      │
│  └─ Real-time Monitoring (WebSocket updates)                                │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ REST API + WebSocket
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Backend (Node.js 20 + Express)                           │
│  Port: 5000                                                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Authentication Layer                                                │    │
│  │ ├─ Firebase Auth (Primary) / JWT (Fallback)                        │    │
│  │ ├─ POST /api/auth/register      → User registration                │    │
│  │ ├─ POST /api/auth/login         → JWT + Refresh Token rotation     │    │
│  │ ├─ POST /api/auth/refresh       → Token refresh                    │    │
│  │ ├─ POST /api/auth/logout        → Session revocation               │    │
│  │ ├─ GET  /api/auth/devices       → Active sessions list             │    │
│  │ └─ DELETE /api/auth/devices/:id → Revoke device session            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Enterprise SSO (Optional)                                          │    │
│  │ ├─ SAML 2.0 Authentication                                         │    │
│  │ ├─ OIDC/OpenID Connect                                            │    │
│  │ └─ LDAP Integration                                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Core API Endpoints                                                  │    │
│  │ ├─ POST /api/analyze            → Forward to AI Core               │    │
│  │ ├─ GET  /api/reports            → Compliance reports               │    │
│  │ ├─ POST /api/v1/evaluate        → Model evaluation + risk scoring  │    │
│  │ └─ GET  /api/drift/:modelId     → Drift detection results          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Model Management                                                    │    │
│  │ ├─ POST /api/v1/models/:id/trigger-retrain → Start retraining      │    │
│  │ ├─ POST /api/v1/retrain/:id/complete       → CI callback           │    │
│  │ ├─ GET  /api/v1/models/:id/versions        → List versions         │    │
│  │ └─ POST /api/v1/models/:id/versions/:v/promote → Promote model     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Governance & Compliance                                             │    │
│  │ ├─ POST /api/governance/approval-workflows    → Create workflow    │    │
│  │ ├─ GET  /api/governance/approval-workflows    → List workflows     │    │
│  │ ├─ POST /api/governance/.../approvals/:id     → Submit decision    │    │
│  │ ├─ POST /api/governance/compliance-signoffs   → Request sign-off   │    │
│  │ └─ POST /api/governance/audit-callbacks       → Audit callbacks    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Policies & Audit                                                    │    │
│  │ ├─ CRUD /api/policies             → Policy management              │    │
│  │ ├─ GET  /api/audit/logs           → Query audit logs               │    │
│  │ └─ GET  /api/audit/logs/:id/trail → Model audit trail              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Multi-Tenancy                                                       │    │
│  │ ├─ Tenant isolation via AsyncLocalStorage                          │    │
│  │ ├─ Mongoose plugin for automatic tenant scoping                    │    │
│  │ └─ CRUD /api/tenants                → Tenant management            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Infrastructure                                                      │    │
│  │ ├─ Circuit Breaker (AI Core dependency)                            │    │
│  │ ├─ Distributed Tracing (OpenTelemetry)                             │    │
│  │ ├─ In-memory Cache (SimpleCache LRU)                               │    │
│  │ ├─ Rate Limiting (express-rate-limit)                              │    │
│  │ └─ Structured Logging (Pino)                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Observability:                                                              │
│  ├─ GET /metrics             → Prometheus metrics                           │
│  ├─ GET /health              → Service health check                         │
│  └─ WebSocket /ws            → Real-time updates                            │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   AI Core (FastAPI)  │  │    MongoDB v6    │  │     Redis        │
│   Port: 8100         │  │   Port: 27018    │  │   Port: 6379     │
│                      │  │                  │  │                  │
│ ├─ POST /ai_core/analyze │ │ Collections:    │  │ ├─ Session store │
│ │  ├─ Validate input  │  │ ├─ users         │  │ ├─ Rate limits   │
│ │  ├─ Train model     │  │ ├─ refreshTokens │  │ └─ Cache         │
│ │  ├─ Fairness metrics│  │ ├─ datasets      │  └──────────────────┘
│ │  ├─ SHAP explanations│  │ ├─ reports       │
│ │  └─ Drift detection │  │ ├─ audit_logs    │
│                      │  │ ├─ policies      │
│ ├─ Federated Learning│  │ ├─ approval_     │
│ │  ├─ Node management│  │ │  workflows     │
│ │  ├─ Aggregation    │  │ ├─ compliance_   │
│ │  └─ Privacy (DP)   │  │ │  signoffs     │
│                      │  │ ├─ model_versions│
│ ├─ Model Retraining  │  │ ├─ retraining_   │
│ │  ├─ Scheduling     │  │ │  jobs         │
│ │  ├─ Versioning     │  │ ├─ tenants       │
│ │  └─ Promotion      │  │ ├─ shap_cache    │
│                      │  │ └─ notifications │
│ ├─ Metrics:          │  └──────────────────┘
│ │  ├─ ai_core_requests_total│
│ │  ├─ fairness_score        │
│ │  └─ bias_detected_total   │
└──────────────────────┘
```

## Service Communication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMMUNICATION PATTERNS                              │
└─────────────────────────────────────────────────────────────────────────────┘

Frontend → Backend:
├─ REST API calls (JSON over HTTPS)
├─ WebSocket for real-time updates
└─ Automatic token injection via axios interceptors

Backend → AI Core:
├─ HTTP REST (via axios with circuit breaker)
├─ Timeout: 30 seconds
├─ Retry: 3 attempts with exponential backoff
└─ Fallback: Graceful degradation on failure

Backend → MongoDB:
├─ Mongoose ODM with tenant scoping
├─ Connection pooling (default 10)
├─ Auto-reconnect on failure
└─ TTL indexes for auto-cleanup

Backend → Redis:
├─ Session storage
├─ Rate limit counters
└─ Cache layer (optional)

AI Core → MongoDB:
├─ Direct PyMongo connection
├─ SHAP cache storage
└─ Analysis results persistence
```

## Security Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

1. REGISTER
   ├─ User → Backend: { email, password, name }
   ├─ Backend: Firebase Auth creates user
   ├─ Backend: MongoDB stores user profile
   └─ Response: { status: 'registered', userId }

2. LOGIN
   ├─ User → Backend: { email, password }
   ├─ Backend: Firebase Auth verifies credentials
   ├─ Backend: Generate JWT (15min) + Refresh Token (7d)
   ├─ Backend: Store refresh token hash (Argon2)
   └─ Response: { accessToken, refreshToken }

3. ACCESS PROTECTED ENDPOINT
   ├─ User → Backend: Authorization: Bearer <accessToken>
   ├─ Backend: JWT verification
   ├─ Backend: Tenant context resolution
   └─ Route handler executes

4. REFRESH TOKEN (ROTATION)
   ├─ User → Backend: { refreshToken }
   ├─ Backend: Verify + rotate tokens
   ├─ Old token: REVOKED immediately
   └─ New tokens issued

5. LOGOUT
   ├─ User → Backend: POST /auth/logout
   ├─ Backend: Revoke refresh token
   └─ Session terminated
```

### Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY MIDDLEWARE STACK                           │
└─────────────────────────────────────────────────────────────────────────────┘

1. helmet         → Security headers (CSP, HSTS, X-Frame-Options)
2. cors           → Cross-origin resource sharing
3. mongoSanitize  → NoSQL injection prevention
4. hpp            → HTTP parameter pollution protection
5. compression    → Gzip response compression
6. rateLimit      → Request throttling (60 req/min global)
7. firebaseAuth   → Firebase JWT verification
8. authGuard      → JWT or Firebase token validation
9. requireRole    → RBAC authorization (admin, analyst, reviewer)
10. tenantGuard   → Multi-tenant data isolation
11. auditLog      → Request audit trail
```

## Data Architecture

### MongoDB Collections

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MONGODB SCHEMA                                     │
└─────────────────────────────────────────────────────────────────────────────┘

users
├─ _id: ObjectId
├─ email: string (unique)
├─ name: string
├─ role: enum [admin, analyst, reviewer, user]
├─ tenantId: ObjectId (ref: tenants)
├─ firebase_uid: string
├─ createdAt: Date
└─ updatedAt: Date

refreshTokens
├─ _id: ObjectId
├─ userId: ObjectId (ref: users)
├─ tokenHash: string (Argon2)
├─ device: { userAgent, ipAddress, deviceName }
├─ expiresAt: Date (TTL index, 7 days)
├─ revokedAt: Date (null = active)
├─ rotationId: string
└─ lastUsedAt: Date

datasets
├─ _id: ObjectId
├─ name: string
├─ type: string
├─ ownerId: ObjectId (ref: users)
├─ tenantId: ObjectId (ref: tenants)
├─ columns: [string]
├─ rowCount: number
└─ createdAt: Date

reports
├─ _id: ObjectId
├─ analysisId: string
├─ userId: ObjectId (ref: users)
├─ tenantId: ObjectId (ref: tenants)
├─ summary: object
├─ fairnessScore: number
├─ biasMetrics: object
└─ createdAt: Date

audit_logs
├─ _id: ObjectId
├─ model_id: string
├─ event_type: string
├─ actor: string
├─ result: string
├─ compliance_status: string
├─ details: object
├─ tenantId: ObjectId (ref: tenants)
└─ timestamp: Date

policies
├─ _id: ObjectId
├─ name: string
├─ description: string
├─ rules: [{ metric, threshold, operator }]
├─ enforcement: enum [block, warn, log]
├─ enabled: boolean
├─ tenantId: ObjectId (ref: tenants)
└─ createdAt: Date

approval_workflows
├─ _id: ObjectId
├─ name: string
├─ description: string
├─ type: enum [model_approval, policy_change, compliance_review]
├─ status: enum [pending, in_progress, approved, rejected, completed]
├─ stages: [{ name, approvers, required_approvals, decisions }]
├─ entityType: string
├─ entityId: string
├─ entityVersion: string
├─ initiatedBy: string
├─ tenantId: ObjectId (ref: tenants)
├─ createdAt: Date
└─ updatedAt: Date

compliance_signoffs
├─ _id: ObjectId
├─ type: string
├─ entity_id: string
├─ signee: string
├─ status: enum [pending, approved, rejected]
├─ comments: string
├─ tenantId: ObjectId (ref: tenants)
└─ createdAt: Date

model_versions
├─ _id: ObjectId
├─ model_id: string
├─ version: string
├─ status: enum [draft, staging, production, archived]
├─ performance_metrics: object
├─ tenantId: ObjectId (ref: tenants)
└─ createdAt: Date

retraining_jobs
├─ _id: ObjectId
├─ model_id: string
├─ request_id: string
├─ status: enum [queued, running, completed, failed]
├─ reason: string
├─ performance_metrics: object
├─ tenantId: ObjectId (ref: tenants)
├─ createdAt: Date
└─ completedAt: Date

federated_nodes
├─ _id: ObjectId
├─ node_id: string
├─ endpoint: string
├─ status: enum [active, inactive, error]
├─ last_heartbeat: Date
├─ capabilities: object
└─ createdAt: Date

tenants
├─ _id: ObjectId
├─ name: string
├─ settings: object
├─ createdAt: Date
└─ updatedAt: Date

shap_cache
├─ _id: ObjectId
├─ model_id: string
├─ dataset_hash: string
├─ shap_values: object
├─ expected_value: number
├─ expiresAt: Date (TTL index)
└─ createdAt: Date
```

### Database Indexes

```javascript
// Performance-critical indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ firebase_uid: 1 });
db.users.createIndex({ tenantId: 1 });

db.refreshTokens.createIndex({ userId: 1 });
db.refreshTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

db.audit_logs.createIndex({ model_id: 1, timestamp: -1 });
db.audit_logs.createIndex({ tenantId: 1, timestamp: -1 });

db.reports.createIndex({ userId: 1, createdAt: -1 });
db.reports.createIndex({ tenantId: 1 });

db.datasets.createIndex({ ownerId: 1 });
db.datasets.createIndex({ tenantId: 1 });

db.shap_cache.createIndex({ model_id: 1, dataset_hash: 1 });
db.shap_cache.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

## Multi-Tenancy Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TENANT ISOLATION                                   │
└─────────────────────────────────────────────────────────────────────────────┘

Request Flow:
1. User authenticates → JWT contains tenantId
2. authGuard resolves tenantId from token or database lookup
3. tenantGuard creates AsyncLocalStorage context
4. Mongoose plugin automatically adds tenantId to all queries
5. Data is fully isolated between tenants

Implementation:
├─ AsyncLocalStorage for request-scoped context
├─ Mongoose schema plugin for automatic tenant scoping
├─ Middleware chain: authGuard → tenantGuard → route handler
└─ Graceful fallback for system-level operations

Benefits:
├─ Single database, logical separation
├─ No query modification required in business logic
├─ Automatic tenant filtering on all Mongoose queries
└─ Easy tenant provisioning and deprovisioning
```

## Federated Learning Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FEDERATED LEARNING                                 │
└─────────────────────────────────────────────────────────────────────────────┘

Components:
├─ Coordinator (AI Core)
│  ├─ Manages training rounds
│  ├─ Aggregates model updates
│  └─ Enforces differential privacy
│
├─ Participating Nodes
│  ├─ Train local models on private data
│  ├─ Send encrypted gradients
│  └─ Receive aggregated model
│
└─ Privacy Guarantees
   ├─ Differential privacy (epsilon-delta)
   ├─ Secure aggregation
   └─ No raw data sharing

Workflow:
1. Coordinator broadcasts global model
2. Nodes train locally on private data
3. Nodes send encrypted gradients
4. Coordinator aggregates updates
5. New global model distributed
6. Repeat until convergence
```

## Model Retraining Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODEL RETRAINING                                   │
└─────────────────────────────────────────────────────────────────────────────┘

Triggers:
├─ Manual (admin dashboard)
├─ Scheduled (cron-based)
├─ Performance degradation (drift detection)
└─ Policy violation

Pipeline:
1. Retrain request created
2. Baseline snapshot captured
3. Worker job triggered (GitHub Actions or local)
4. Model retrained on new data
5. Performance metrics evaluated
6. Model version created
7. Staging promotion (optional)
8. Production promotion (requires approval)

Version Management:
├─ Semantic versioning (v1.0.0)
├─ Status tracking (draft → staging → production → archived)
├─ Performance comparison
└─ Rollback capability
```

## Observability Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MONITORING STACK                                   │
└─────────────────────────────────────────────────────────────────────────────┘

Metrics Collection:
├─ Backend: prom-client (Node.js)
├─ AI Core: prometheus_client (Python)
└─ Custom metrics:
   ├─ http_request_duration_seconds
   ├─ http_requests_total
   ├─ ai_core_requests_total
   ├─ fairness_score
   ├─ bias_detected_total
   ├─ evaluations_total
   └─ evaluations_high_risk_total

Logging:
├─ Backend: Pino (structured JSON)
├─ AI Core: Python logging (JSON format)
└─ Request correlation via requestId

Tracing:
├─ OpenTelemetry integration
├─ Distributed trace context propagation
└─ Span creation for critical paths

Alerting:
├─ Prometheus alerting rules
├─ Grafana dashboards
└─ PagerDuty/Slack integration
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION DEPLOYMENT                              │
└─────────────────────────────────────────────────────────────────────────────┘

Development:
├─ Docker Compose (all services)
├─ Hot reload for backend/frontend
└─ In-memory database option

Staging:
├─ Docker Compose with production config
├─ Managed MongoDB Atlas
└─ Load testing

Production:
├─ Frontend: Vercel (static SPA)
├─ Backend: Cloud Run / Fargate (3-13 pods)
├─ AI Core: Cloud Run / Fargate (6-11 pods)
├─ Database: MongoDB Atlas (M10+)
├─ Cache: Redis (managed)
├─ Monitoring: Prometheus + Grafana
└─ Secrets: Cloud Secret Manager

Scaling:
├─ Horizontal pod autoscaling (CPU/request-based)
├─ Database read replicas
├─ Redis cluster for high availability
└─ CDN for frontend assets
```

## Performance Characteristics

| Operation | Latency | Throughput | Notes |
|-----------|---------|------------|-------|
| Health Check | <5ms | 1000+ req/s | No auth required |
| Authentication | <50ms | 100+ req/s | Firebase + JWT |
| Bias Analysis | <15ms P95 | 100 req/s | With SHAP cache |
| Model Evaluation | <20ms | 50+ req/s | Risk scoring |
| Audit Log Query | <100ms | 50+ req/s | Indexed queries |
| Token Refresh | <100ms | 100+ req/s | Argon2 hash verify |

## Error Handling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ERROR RESPONSE FORMAT                              │
└─────────────────────────────────────────────────────────────────────────────┘

{
  "success": false,
  "error": "error_code",
  "message": "Human-readable description",
  "requestId": "uuid-for-tracing",
  "details": {} // Optional additional context
}

Error Codes:
├─ 400: Bad Request (validation errors)
├─ 401: Unauthorized (authentication required)
├─ 403: Forbidden (insufficient permissions)
├─ 404: Not Found (resource doesn't exist)
├─ 409: Conflict (resource already exists)
├─ 422: Unprocessable Entity (business logic error)
├─ 429: Too Many Requests (rate limit exceeded)
└─ 500: Internal Server Error (unexpected failure)
```

---

**Architecture Version**: 2.0  
**Last Updated**: July 2026  
**Status**: Production-Ready
