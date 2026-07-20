# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📋 Project Overview

**EthixAI** is a production-ready ethical AI governance platform that provides real-time bias detection, SHAP-powered explainability, and comprehensive monitoring for financial decision-making systems.

**Core Value Proposition:** Detect fairness issues across protected attributes, provide transparent explanations for AI decisions, and generate compliance audit trails—all in <15ms P95 latency.

**Tech Stack:**
- **Frontend:** Next.js 15 + Tailwind CSS + Radix UI + Redux
- **Backend:** Node.js 20 + Express + Firebase Auth + MongoDB
- **AI Core:** Python 3.11 + FastAPI + SHAP + scikit-learn
- **Databases:** MongoDB (documents), PostgreSQL (relational data)
- **Observability:** Prometheus + Grafana
- **DevOps:** Docker Compose, k6 for load testing

---

## 🏗️ Architecture

### Service Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                   │
│                      Port 3000 | port 3000                  │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│                    Backend (Node.js)                         │
│      Express + Firebase Auth + Rate Limiting                │
│              Port 5000 | service: system_api                │
└────────┬──────────────────────────────────────────┬─────────┘
         │                                          │
         │ AI Analysis                              │ MongoDB
         │                                          │
┌────────▼──────────────────┐          ┌──────────▼──────┐
│   AI Core (FastAPI)       │          │    MongoDB v6   │
│   Fairness Analysis       │          │   Port 27018    │
│   SHAP Explanations       │          │ (internal 27017)│
│   Port 8100               │          └─────────────────┘
└───────────────────────────┘
         │
    PostgreSQL
    (future)
```

### Key Services (docker-compose)
| Service | Role | Port | Language | Key Features |
|---------|------|------|----------|--------------|
| `system_api` | API Gateway | 5000 | Node.js | Auth, rate limiting, request routing |
| `frontend` | Dashboard UI | 3000 | TypeScript/React | User registration, analytics, admin panel |
| `ai_core` | ML Engine | 8100 | Python | Fairness metrics, SHAP, drift detection |
| `mongo` | Document Store | 27018 | MongoDB | Reports, audit logs, user data |
| `postgres` | Relational DB | 5432 | PostgreSQL | (Reserved for future user session data) |
| `redis` | Cache | 6379 | Redis | Session store, rate limit counters |
| `prometheus` | Metrics | 9090 | Prometheus | Performance data collection |

---

## 🚀 Common Development Commands

### Setup & Installation
```bash
# Install all dependencies (backend + ai_core)
make install

# Or manually:
cd backend && npm install
cd ../ai_core && pip install -r requirements.txt
```

### Running Services
```bash
# Full stack with Docker (recommended)
make up

# View logs
make logs

# Stop services
make down

# Clean everything (containers, node_modules, cache)
make clean
```

### Local Development (without Docker)
```bash
# Terminal 1: Start Backend (port 5000)
cd backend
USE_IN_MEMORY_DB=1 DISABLE_RATE_LIMIT=1 AI_CORE_URL=http://localhost:8100/ai_core/analyze npm start

# Terminal 2: Start AI Core (port 8100)
cd ai_core
AI_CORE_TRUSTED_HOSTS=localhost AI_CORE_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5000" \
  uvicorn main:app --host 0.0.0.0 --port 8100

# Terminal 3: Start Frontend (port 3000)
cd frontend
npm run dev
```

### Watch Mode (Development)
```bash
# Watch backend for changes
make watch-backend

# Watch AI Core tests
make watch-ai-core
```

---

## 🧪 Testing

### Run All Tests
```bash
# Run all backend + ai_core tests
make test

# Or individually:
cd backend && NODE_ENV=test npm test
cd ../ai_core && pytest tests/ -v --tb=short
```

### Test-Specific Commands
```bash
# Backend unit tests only
cd backend && npm test

# Backend with coverage
cd backend && npm run test:coverage

# AI Core with verbose output
cd ai_core && pytest tests/ -v --tb=short

# Frontend tests (Vitest)
cd frontend && npm test

# Frontend e2e tests (Playwright)
cd frontend && npm run e2e
cd frontend && npm run e2e:headed  # With UI

# Single test file
cd backend && npm test -- auth.test.js
cd ai_core && pytest tests/test_fairness.py -v
```

### Integration Tests
```bash
# Full smoke test suite (register → login → analyze → metrics)
./tools/smoke_tests/full_integration.sh

# Quick metrics validation
./tools/smoke_tests/validate_metrics.sh

# Legacy smoke harness
./tools/smoke_tests/run_smoke_tests.sh http://localhost:5000
```

### Test Utilities

**Backend in-memory DB:** Use `USE_IN_MEMORY_DB=1` in dev for fast integration tests without Docker:
```bash
cd backend && USE_IN_MEMORY_DB=1 npm start
```

**Frontend test watching:**
```bash
cd frontend && npm run test:watch
```

---

## 🛠️ Code Patterns & Conventions

### Backend: Adding a New API Endpoint

1. **Create route handler** in `backend/src/routes/[feature].js`:
```javascript
const express = require('express');
const { authGuard, requireRole } = require('../middleware/authGuard');
const { body, validationResult } = require('express-validator');

module.exports = (app) => {
  app.post('/api/[feature]/action', 
    authGuard,
    requireRole('analyst'),
    body('param').isString().trim(),
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        
        const result = await doSomething(req.body);
        res.json({ success: true, data: result, requestId: req.id });
      } catch (error) {
        next(error); // errorHandler.js catches this
      }
    }
  );
};
```

2. **Register in `server.js`:** Add `require('./routes/[feature]')(app);`

3. **Test with Jest:** Create `backend/__tests__/[feature].test.js` with auth mocks

### Frontend: Adding a New Page/Dashboard

1. **Create route** in `frontend/src/app/(role)/[feature]/page.tsx`:
```typescript
import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Feature | EthixAI' };

export default function FeaturePage() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    api.get('/api/feature/data').then(r => setData(r.data));
  }, []);
  
  return <div>{/* JSX */}</div>;
}
```

2. **Create component** in `frontend/src/components/[feature]/FeatureCard.tsx` with TypeScript

3. **Test with Vitest/Playwright:** Unit test logic, e2e test user flows

### AI Core: Adding a Fairness Metric

1. **Implement metric** in `ai_core/governance/fairness_metrics.py`:
```python
def calculate_metric(y_true, y_pred, protected_attr):
    """Compute metric with docstring."""
    # implementation
    return metric_value
```

2. **Add to analyze.py endpoint:** Call from the main analysis flow

3. **Test with pytest:** Mock data, verify metric ranges

### Middleware Stack (Backend)

Middleware order in `server.js` (left-to-right execution):
1. **Security**: helmet, cors, mongoSanitize, hpp, xssClean
2. **Logging**: pino middleware logs all requests
3. **Rate Limiting**: rateLimit blocks abusers before handler runs
4. **Body Parsing**: express.json() → validates Content-Type
5. **Authentication**: authGuard (Firebase or JWT)
6. **Authorization**: requireRole checks permissions
7. **Tenancy**: tenantGuard isolates data by tenant
8. **Route Handlers**: your logic runs here
9. **Error Handler**: errorHandler.js catches all exceptions

**To add new middleware:** Insert before or after a specific layer, export as `module.exports = (app) => { app.use(...) }`

### Frontend: React Patterns

- **Pages:** Next.js app router, grouped routes with `(role)` directories
- **State:** Context (AuthContext, AnnounceContext) for global auth; local useState for component state
- **API calls:** `frontend/src/services/api.ts` provides axios client with auto token injection
- **UI Components:** Radix UI wrapped in Tailwind (see `frontend/src/components/ui/`)
- **Forms:** React Hook Form + Zod for validation

### Environment Variables

**Key variables** (see `.env.example` for defaults):

| Variable | Purpose | Required |
|----------|---------|----------|
| `MONGO_URL` | MongoDB connection | Yes (or `USE_IN_MEMORY_DB=1`) |
| `FIREBASE_PROJECT_ID` | Firebase project | Yes (production) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Service account JSON path | Yes (auth) |
| `NEXT_PUBLIC_API_URL` | Backend URL from frontend | Yes |
| `AI_CORE_URL` | FastAPI endpoint | Yes |
| `JWT_SECRET` | Token signing key | Yes (production) |
| `RATE_LIMIT_ENABLED` | Enable rate limiting | Optional (default: true) |
| `DISABLE_RATE_LIMIT` | Dev/test override | Optional |
| `LOG_LEVEL` | Pino log level (debug/info/warn/error) | Optional |

---

## 🔍 Linting & Code Quality

```bash
# Run all linters
make lint

# Backend linting
cd backend && npm run lint              # ESLint
cd backend && npm run lint:fix          # Auto-fix
cd backend && npm run lint:security     # Security (helmet, input validation, etc.)

# Frontend linting & type checking
cd frontend && npm run lint             # ESLint
cd frontend && npm run lint:security    # Security (XSS, injection, auth)
cd frontend && npm run type-check       # TypeScript validation (required before commit)

# AI Core linting
cd ai_core && python -m pylint ai_core/ --disable=all --enable=E,F
```

**Security linting targets critical vulnerabilities:** Always run `lint:security` before commits to catch auth bypasses, injection vectors, or unsafe crypto patterns.

---

## 📊 Performance Testing

### Load Testing (k6)
```bash
# All baseline + ramp + mixed + spike + stress + soak phases
make day14-all-artifacts

# Individual scenarios:
make day14-baseline          # Auth + dashboard + upload/analyze
make day14-ramp              # Explainability heavy
make day14-mixed             # Mixed weighted hold (10m)
make day14-spike             # 250 rps for 2m
make day14-stress            # Escalation (300→600 rps)
make day14-soak              # 40 rps for 30m

# With artifact export (JSON summaries)
make day14-baseline-artifacts
make day14-ramp-artifacts
# ... etc
```

### Demo & Performance Smoke Tests
```bash
# Full 5-minute demo (register → login → upload → analyze → reports)
./tools/demo/full_demo_sequence.sh

# Performance test suite
./tools/demo/performance_test.sh
```

### Monitoring
```bash
# View metrics endpoints
make metrics

# Manual checks
curl http://localhost:5000/metrics
curl http://localhost:8100/metrics/

# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001
```

---

## 📁 Directory Structure

### Root-Level Key Files
- **`Makefile`** — Development targets (install, test, lint, up, down, etc.)
- **`docker-compose.yml`** — Service definitions for local development
- **`docker-compose.prod.yml`** — Production deployment config
- **`.env.example`** — Template for environment variables
- **`README.md`** — Project overview, quick start, feature list

### Backend (`/backend`)
```
backend/
├── src/
│   ├── server.js              # Express app entry point, middleware stack setup
│   ├── errorHandler.js        # Unified error handling for all routes
│   ├── logger.js              # Logging setup (Pino for JSON, Winston for persistence)
│   ├── worker-starter.js      # Background job queue (Bull + Redis)
│   ├── routes/                # API route handlers (mounted in server.js)
│   │   ├── auth.js            # Auth flows (register, login, JWT refresh)
│   │   ├── analyze.js         # Forward to AI Core, cache results
│   │   ├── reports.js         # Generate compliance reports
│   │   └── metrics.js         # Prometheus metrics endpoint
│   ├── middleware/            # Express middleware (execution order matters)
│   │   ├── authGuard.js       # Firebase or JWT validation
│   │   ├── tenantGuard.js     # PostgreSQL RLS/multi-tenancy isolation
│   │   ├── rbac.js            # Role-based access control (requireRole)
│   │   ├── security.js        # Security headers, CORS, sanitization
│   │   ├── cache.js           # In-memory caching layer
│   │   ├── logging.js         # Request/response logging
│   │   └── [auth variants]/   # SAML, LDAP, OIDC integrations
│   ├── models/                # Mongoose schemas (MongoDB collections)
│   ├── services/              # Shared logic (Firebase, S3, AI Core client)
│   ├── utils/                 # Helpers (validation, formatting, errors)
│   └── __tests__/             # Jest test suite (mirrors src structure)
├── scripts/                   # Deploy, admin scripts (create users, migrations)
├── Dockerfile                 # Node.js 20 container
├── package.json               # Dependencies + npm scripts
├── .eslintrc.json             # ESLint config (logic rules)
└── .eslintrc.security.json    # Security linting (auth, crypto, injection)
```

**Key entry points:** `server.js` initializes Express, mounts middleware in order, registers routes, starts listening on port 5000.

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── app/                   # Next.js app directory
│   │   ├── (auth)/            # Auth pages (login, register)
│   │   ├── (admin)/           # Admin dashboard
│   │   ├── (analyst)/         # Analyst dashboard
│   │   ├── (reviewer)/        # Reviewer dashboard
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable React components
│   │   ├── ui/                # Radix UI + Tailwind wrappers
│   │   ├── forms/             # Form components
│   │   └── dashboard/         # Dashboard-specific components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities (auth, API client)
│   ├── services/              # API communication
│   ├── store/                 # Redux store (analytics, auth)
│   └── __tests__/             # Vitest test suite
├── e2e/                       # Playwright e2e tests
├── Dockerfile                 # Next.js container
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS config
└── package.json               # Node.js dependencies
```

### AI Core (`/ai_core`)
```
ai_core/
├── main.py                    # FastAPI app entry point
├── routers/                   # API endpoints
│   ├── analyze.py             # Bias detection endpoint
│   └── metrics.py             # Health & metrics
├── governance/                # Fairness logic
│   ├── fairness_metrics.py    # Statistical parity, equal opportunity
│   ├── bias_detector.py       # Detects disparate impact
│   └── shap_explainer.py      # SHAP integration
├── models/                    # ML models & loaders
├── utils/                     # Helper functions (data processing, drift)
├── tests/                     # Pytest test suite
├── requirements.txt           # Python dependencies
└── Dockerfile                 # FastAPI container
```

### Tools & Scripts (`/tools`)
```
tools/
├── demo/
│   ├── full_demo_sequence.sh  # Complete 5m demo flow
│   └── performance_test.sh    # Smoke test suite
├── load/
│   ├── day14/                 # k6 performance scenarios
│   └── locustfile.py          # Locust load generator
├── smoke_tests/               # Integration & smoke tests
├── chaos/                     # Chaos engineering scenarios
├── drift/                     # Drift detection tools
└── stress/                    # Stress test configuration

```

### Documentation (`/docs`)
- **`ARCHITECTURE.md`** — Deep dive system design
- **`USER_MANUAL.md`** — Feature guide for end users
- **`api-spec.yaml`** — OpenAPI spec for all endpoints
- **`guides/DEPLOYMENT_GUIDE.md`** — Production deployment steps
- **`security/SECURITY.md`** — Security practices & compliance

---

## 🔑 Critical Files & Their Roles

### Backend Core
| File | Purpose | Modifications |
|------|---------|---|
| `backend/src/server.js` | Express app, middleware stack | Routes, error handler, rate limiting |
| `backend/src/errorHandler.js` | Unified error responses | Add new error types/codes |
| `backend/src/routes/auth.js` | Firebase auth flow | JWT refresh, token validation |
| `backend/src/routes/analyze.js` | Forwards requests to AI Core | Validation, response formatting |

### Frontend Core
| File | Purpose | Modifications |
|------|---------|---|
| `frontend/src/app/layout.tsx` | Root layout, providers | Global auth, Redux setup |
| `frontend/src/app/(auth)/*` | Auth pages | Login, register, forgot password |
| `frontend/src/services/api.ts` | API client | Axios instance, interceptors |
| `frontend/src/store/` | Redux state | Auth, analytics, admin panel state |

### AI Core Core
| File | Purpose | Modifications |
|------|---------|---|
| `ai_core/main.py` | FastAPI app, CORS, middleware | New routes, logging |
| `ai_core/routers/analyze.py` | Fairness analysis endpoint | Model logic, metric calculations |
| `ai_core/governance/fairness_metrics.py` | Metric computations | Add new fairness metrics |

### Configuration
| File | Purpose |
|------|---------|
| `.env.example` | Required environment variables; copy to `.env` and fill in |
| `docker-compose.yml` | Local service orchestration (development) |
| `docker-compose.prod.yml` | Production deployment config |
| `Makefile` | Development commands (targets for all common tasks) |
| `firestore.rules` | Firebase Firestore security rules (document-level access control) |
| `firestore.indexes.json` | Composite indexes for Firestore queries (deployed via `make deploy-firestore-indexes`) |

---

## 🔐 Authentication & Authorization

### Flow
1. **Frontend** → User registers/logs in
2. **Firebase Auth** → Creates/authenticates user
3. **Backend** → Issues JWT token on successful auth
4. **Frontend** → Stores token in localStorage (or secure cookie)
5. **Protected Routes** → Validate JWT in header (`Authorization: Bearer <token>`)

### Key Endpoint
```bash
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh     # JWT refresh
GET  /api/auth/profile     # Requires auth
```

### Testing Auth
```bash
# Create admin user (Firebase + MongoDB)
node scripts/create_admin_user.js --email=admin@example.com --password=AdminPass123! --role=admin

# Demo credentials (built-in)
Email: demo@ethixai.com
Password: SecureDemo2024!
```

### Firebase & Firestore Integration

- **Firebase Authentication:** Provides user identity (email, phone, OAuth)
- **Firestore Security Rules** (`firestore.rules`): Document-level access control (who can read/write what)
- **Service Account:** Set via `GOOGLE_APPLICATION_CREDENTIALS` env var (JSON file path)
- **Indexes:** Composite indexes defined in `firestore.indexes.json`; deployed with `make deploy-firestore-indexes`
- **Rules deployment:** `make deploy-firestore-rules FIREBASE_PROJECT_ID=your-project`

**Common pattern:** User signs up with Firebase → backend creates user record in MongoDB + Firestore → frontend stores JWT → all subsequent requests use JWT (not Firestore directly from client).

---

## 🗄️ Database Schemas

### MongoDB (Documents)
**Collections:**
- `users` — User profiles, roles, preferences
- `analyses` — Fairness analysis results
- `reports` — Generated compliance reports
- `audit_logs` — Request tracing & compliance

**Key Queries:**
```js
// Backend example
const user = await User.findById(userId);
const reports = await Report.find({ userId, createdAt: { $gte: startDate } });
```

### PostgreSQL (Relational)
**Tables (reserved for future use):**
- `sessions` — User sessions (if moving from in-memory)
- `datasets` — Large dataset metadata
- `model_versions` — Model lineage tracking

---

## 🚀 Deployment

### Docker Build
```bash
# Build all services
docker compose build

# Build specific service
docker compose build backend
docker compose build frontend
docker compose build ai_core
```

### Production Deployment
```bash
# Use production compose config
docker-compose -f docker-compose.prod.yml up -d

# Or deploy to Kubernetes
kubectl apply -f k8s/
```

### Firebase Setup (Required for Prod)
```bash
# Login to Firebase
make firebase-login

# Deploy Firestore rules & indexes
make deploy-firestore-rules FIREBASE_PROJECT_ID=your-project-id
make deploy-firestore-indexes FIREBASE_PROJECT_ID=your-project-id
```

See `docs/guides/DEPLOYMENT_GUIDE.md` for complete production setup.

---

## 📌 Important Conventions & Patterns

### Error Handling
- **Backend:** Use `errorHandler.js` async wrapper for Express routes
- **AI Core:** FastAPI's `HTTPException` for HTTP errors; Python exceptions for internal logic
- **Frontend:** Catch API errors, display user-friendly messages via toast notifications

### Logging
- **Backend:** Pino (JSON structured logging) for application, Winston for persistence
- **AI Core:** Loguru for Python logging with JSON output
- **Frontend:** Console logging (no persistent logging in UI)

### Testing Strategy
- **Backend:** Jest unit tests + integration tests with in-memory MongoDB
- **AI Core:** Pytest with mock data; avoid heavy ML dependencies in unit tests
- **Frontend:** Vitest for unit tests; Playwright for e2e tests
- **Integration:** Full stack smoke tests in `tools/smoke_tests/`

### API Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "requestId": "uuid-for-tracing"
}
```

### Caching & Rate Limiting

**In-memory cache** (server.js SimpleCache):
- Stores frequently accessed data (user profiles, settings) for 5 minutes by default
- Max 500 entries; LRU eviction when full
- Use for read-heavy, read-only data; never cache user-sensitive state

**Rate limiting:**
- Configured via `express-rate-limit` middleware
- Default: 100 requests per 15 minutes per IP
- Disable with `DISABLE_RATE_LIMIT=1` for local testing
- Public endpoints should have stricter limits (auth: 5/min, analyze: 30/min)

**Redis (external):**
- Used for session store and distributed rate limit counters
- Not required for local dev (falls back to in-memory)
- Required for production and multi-instance deployments

---

## 🎯 Performance Targets (SLOs)

| Metric | Target | Status |
|--------|--------|--------|
| P95 Latency | <15ms | ✅ 12.1ms |
| Throughput | 100 req/s | ✅ Tested |
| Success Rate | 99.9%+ | ✅ 100% |
| Uptime | 99.9%+ | ✅ Verified |

---

## 🛠️ Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000/5000 already in use | `lsof -i :3000` then `kill -9 <PID>` or use different port |
| MongoDB connection refused | Run `docker compose up mongo` or check `MONGO_URL` env |
| AI Core not responding | Check logs: `docker compose logs ai_core` |
| Frontend can't reach backend | Verify `NEXT_PUBLIC_API_URL` points to correct host |
| Tests failing with "Cannot find module" | Run `make install` to ensure dependencies |
| Firebase auth issues | Check `GOOGLE_APPLICATION_CREDENTIALS` path and `.env` |

---

## 📚 Key Documentation Files

- **Day 30 Report:** `DAY30_COMPLETION.md` — Latest polish, demo readiness
- **Day 29 Report:** `DAY29_FINAL_SUMMARY.md` — Integration & smoke tests
- **Architecture:** `docs/ARCHITECTURE.md` — System design patterns
- **Performance:** `PERFORMANCE_REPORT.md` — Load test results & analysis
- **Security:** `docs/security/SECURITY.md` — Security practices & policies
- **Deployment:** `docs/guides/DEPLOYMENT_GUIDE.md` — Production setup

---

## 🔗 Quick Links

| Resource | Link |
|----------|------|
| Frontend | http://localhost:3000 (dev) |
| Backend Health | http://localhost:5000/health |
| AI Core Health | http://localhost:8100/health |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |
| MongoDB | localhost:27018 (via docker) |

---

## 💡 Development Tips

1. **Use `make` for common tasks** — DRY and consistent across team
2. **Run `make test && make lint` before committing** — Catch logic bugs and security issues early
3. **Check logs with `docker compose logs -f [service]`** — Quick debugging; add `--tail=50` to limit output
4. **Performance issues?** Run `make day14-baseline` to get baseline metrics
5. **Frontend styling:** Edit `tailwind.config.ts`, not inline CSS; use `@apply` for reusable patterns
6. **Adding AI features:** Work in `ai_core/governance/` and test with pytest before integration
7. **New API endpoints:** Add to `backend/src/routes/`, wrap async handlers, validate with express-validator
8. **Watch mode for fast iteration:** Run `make watch-backend` + `make watch-ai-core` in separate terminals
9. **Test in isolation first:** Single test file catches issues before full suite runs; use `-t "describe block name"` for Jest

## 🧪 Testing Patterns

### Backend Jest

- **Mock Firebase:** Use `jest.mock('firebase-admin')` in test setup
- **Test auth routes:** Create dummy JWT, pass in Authorization header
- **Integration tests:** Use in-memory MongoDB (configured in test setup)
- **Async routes:** Always wrap in `async` and catch with `next(error)`

### Frontend Vitest

- **Test components:** Use `@testing-library/react` to render and query DOM
- **Mock API calls:** Jest mock `frontend/src/services/api.ts`
- **Test hooks:** Use `renderHook` from testing library
- **Snapshot testing:** Use sparingly; prefer specific assertions

### AI Core Pytest

- **Mock SHAP/sklearn:** Use `unittest.mock.patch` to avoid heavy ML imports
- **Test fairness metrics:** Use fixture data (CSV or JSON arrays)
- **Test with realistic data:** Small sample datasets catch edge cases
- **Parametrized tests:** Use `@pytest.mark.parametrize` for testing multiple scenarios

## 🔐 Security Checklist

Before committing changes to auth, API, or data handling:
- [ ] Ran `npm run lint:security` (all services)
- [ ] Validated all user inputs with express-validator (backend) or Zod (frontend)
- [ ] No secrets in `.env`, `.js`, or `.py` files
- [ ] SQL/MongoDB queries use parameterized methods (mongoose, not raw strings)
- [ ] API errors don't leak sensitive info (stack traces, DB details)
- [ ] Rate limiting active on public endpoints
- [ ] Passwords hashed with bcryptjs or argon2, never plaintext
- [ ] CORS configured to allow only expected origins
- [ ] JWT secret rotated in production (not hardcoded)

## 📝 Common Development Tasks

### Task: Add a new user role
1. Update MongoDB schema in `backend/src/models/User.js`
2. Add role to `middleware/rbac.js` permissions map
3. Create new page in `frontend/src/app/(role)/` if UI needed
4. Test with `requireRole('newrole')` guard
5. Add test case in Jest auth tests

### Task: Add a fairness metric to the analysis
1. Implement in `ai_core/governance/fairness_metrics.py`
2. Call from `ai_core/routers/analyze.py` analysis flow
3. Update response schema with new metric
4. Add test with sample data in `ai_core/tests/`
5. Test end-to-end: upload CSV → analyze → verify metric appears

### Task: Fix a performance regression
1. Run `make day14-baseline` to capture baseline metrics
2. Identify bottleneck: check `docker compose logs system_api` for slow queries
3. Profile with Prometheus: http://localhost:9090 (check request duration)
4. Apply fix (add cache, optimize query, add index)
5. Re-run baseline to verify improvement

### Task: Debug a failing integration test
1. Run the single test: `cd backend && npm test -- auth.test.js`
2. Check logs: `docker compose logs -f mongo` (if DB related)
3. Add console.log or debugger in test and rerun
4. Verify test data setup is correct (mocks, fixtures)
5. Check if external service (Firebase, AI Core) is mocked properly

---

## 🚦 When to Run What

| Scenario | Command |
|----------|---------|
| Start development | `make up` in one terminal; `make watch-backend` + `make watch-ai-core` in others |
| Write a feature | Write tests first (TDD), implement, then `make test && make lint` |
| Before committing | `make test && make lint` — must pass security checks |
| Debug a failing test | `cd [layer] && npm test -- file.test.js` (backend) or `pytest tests/test_file.py -v` (ai_core) |
| Debug at runtime | `docker compose logs -f [service]` to tail logs in real time |
| Performance regression? | `make day14-baseline-artifacts` to capture metrics JSON for comparison |
| Type errors in frontend | `cd frontend && npm run type-check` catches TypeScript issues |
| Deploy to production | `make deploy-firestore-all` then Docker push to registry, then k8s/Docker Swarm |
| Test auth in isolation | `USE_IN_MEMORY_DB=1 npm start` in backend terminal, test with curl/Postman |
| Check metrics | `make metrics` shows Prometheus URLs; visit http://localhost:9090 to query |
