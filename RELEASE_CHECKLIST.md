# Release Checklist & QA

## Pre-Release Verification

### Code Quality

- [ ] All tests passing locally:
  ```bash
  make test
  # Expected: All backend + ai_core tests pass
  ```

- [ ] No linting errors:
  ```bash
  make lint
  # Expected: No ESLint/Pylint errors
  ```

- [ ] No type errors:
  ```bash
  # Backend
  cd backend && npm list typescript
  
  # AI Core
  cd ai_core && python -m mypy ai_core/ --ignore-missing-imports || true
  ```

### API Compliance

- [ ] All endpoints documented in `docs/backend-refresh-tokens.md`
- [ ] All endpoints have proper authentication
- [ ] Error responses follow standard format:
  ```json
  {
    "error": "Error message",
    "code": "ERROR_CODE"
  }
  ```

### Database & Persistence

- [ ] MongoDB models created/migrated:
  ```bash
  docker compose exec mongo mongosh << 'EOF'
  db.users.count()
  db.refreshtokens.count()
  db.reports.count()
  EOF
  ```

- [ ] TTL indexes configured:
  ```bash
  docker compose exec mongo mongosh << 'EOF'
  db.refreshtokens.getIndexes()
  # Should include expireAfterSeconds
  EOF
  ```

### Authentication & Security

- [ ] JWT tokens include unique `jti` field
- [ ] Refresh tokens use Argon2 hashing (not plaintext)
- [ ] Password hashing uses bcryptjs (10+ rounds)
- [ ] Rate limiting enforced on auth endpoints
- [ ] Device tracking implemented and working

### Metrics & Logging

- [ ] Prometheus metrics endpoint responds:
  ```bash
  curl -s http://localhost:5000/metrics | head -20
  ```

- [ ] JSON logs are structured:
  ```bash
  docker compose logs backend | jq '.level' | sort | uniq
  ```

- [ ] Request IDs propagate across services:
  ```bash
  curl -H "X-Request-Id: test-123" http://localhost:5000/health
  # Response should include: X-Request-Id: test-123
  ```

## Test Suites

### Backend Tests (Node.js)

- [ ] Unit tests passing:
  ```bash
  cd backend && NODE_ENV=test npm test
  # Expected: 5/5 tests passing
  ```

- [ ] Test coverage adequate:
  ```bash
  cd backend && npm test -- --coverage
  # Expected: > 60% coverage
  ```

### AI Core Tests (Python)

- [ ] All tests passing:
  ```bash
  cd ai_core && python -m pytest tests/ -v --tb=short
  # Expected: 22+ tests passing
  ```

- [ ] No import errors:
  ```bash
  cd ai_core && python -c "import ai_core; print('✅')"
  ```

### Integration Tests

- [ ] End-to-end demo completes:
  ```bash
  ./demo/run_demo.sh
  # Expected: All steps complete, report generated
  ```

- [ ] Chaos smoke test passes:
  ```bash
  ./tools/ci/chaos_smoke_ci.sh
  # Expected: Passes with baseline metrics collected
  ```

## Feature Validation

### User Authentication Flow

- [ ] Registration works:
  ```bash
  curl -X POST http://localhost:5000/auth/register \
    -H 'Content-Type: application/json' \
    -d '{"name":"Test","email":"test@example.com","password":"Pass123!"}'
  # Expected: { userId: "...", email: "test@example.com" }
  ```

- [ ] Login returns tokens:
  ```bash
  curl -X POST http://localhost:5000/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@example.com","password":"Pass123!"}'
  # Expected: { accessToken: "...", refreshToken: "..." }
  ```

- [ ] Token refresh works:
  ```bash
  curl -X POST http://localhost:5000/auth/refresh \
    -H 'Content-Type: application/json' \
    -d '{"refreshToken":"..."}'
  # Expected: { accessToken: "..." }
  ```

### Device Management

- [ ] List devices:
  ```bash
  curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/auth/devices
  # Expected: { devices: [ { deviceId: "...", ... } ] }
  ```

- [ ] Revoke device:
  ```bash
  curl -X DELETE "http://localhost:5000/auth/devices/$DEVICE_ID" \
    -H "Authorization: Bearer $TOKEN"
  # Expected: { ok: true }
  ```

### Fairness Analysis

- [ ] Analysis accepts valid data:
  ```bash
  curl -X POST http://localhost:5000/analyze \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{
      "data": {"x": [[1,2],[3,4]], "y": [0,1], "sensitive_attributes": [0,1]},
      "parameters": {"model_type": "logistic_regression"}
    }'
  # Expected: { reportId: "..." }
  ```

- [ ] Reports retrievable:
  ```bash
  curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/reports/$REPORT_ID
  # Expected: Full report with metrics
  ```

## Documentation

- [ ] README.md is complete and accurate
- [ ] CONTRIBUTING.md explains workflow
- [ ] API documentation exists (`docs/backend-refresh-tokens.md`)
- [ ] Architecture documented (`docs/ARCHITECTURE.md`)
- [ ] Observability guide available (`docs/observability.md`)
- [ ] Demo README explains usage (`demo/README.md`)
- [ ] Makefile has help text:
  ```bash
  make help
  ```

## Deployment Checklist

### Environment Variables

- [ ] All required variables documented:
  ```bash
  grep -r "process.env\|os.environ" backend/src/ ai_core/routers/ | \
    grep -v "node_modules" | cut -d: -f2 | sort -u
  ```

- [ ] Example `.env.example` file exists
- [ ] MongoDB URL configured
- [ ] JWT secret configured
- [ ] Rate limiting configured

### Docker & Compose

- [ ] All services build successfully:
  ```bash
  docker compose build
  ```

- [ ] Services start without errors:
  ```bash
  docker compose up -d && sleep 5
  docker compose ps  # All should be "Up"
  ```

- [ ] Health checks pass:
  ```bash
  docker compose exec backend curl http://localhost:5000/health
  docker compose exec ai_core curl http://localhost:8100/health
  ```

### Performance Baselines

- [ ] Chaos test passes with acceptable metrics:
  ```bash
  ./tools/ci/chaos_smoke_ci.sh
  # Expected: No 5xx errors, latency < baseline
  ```

- [ ] Memory usage acceptable (< 500MB each service)
- [ ] CPU usage under load acceptable (< 70%)

## CI/CD Validation

### GitHub Actions

- [ ] All workflows passing:
  ```bash
  # Check locally with act
  act -l
  ```

- [ ] AI Core tests run:
  - [ ] `.github/workflows/ci-ai-core.yml` triggers
  - [ ] Tests pass on Python 3.11

- [ ] Backend tests run:
  - [ ] `.github/workflows/backend-ci.yml` triggers
  - [ ] Tests pass on Node.js 18+

- [ ] Chaos smoke tests run:
  - [ ] `.github/workflows/chaos-smoke.yml` triggers on PRs
  - [ ] Metrics collected and validated

### Pre-push Hook

- [ ] Pre-push hook installed:
  ```bash
  ls -la .git/hooks/pre-push
  ```

- [ ] Hook runs tests on changed packages:
  ```bash
  # Make a change to backend
  git add backend/src/server.js
  git commit -m "test"
  git push  # Should run tests before push
  ```

## Release Notes

### Changelog

Document changes in `CHANGELOG.md`:

```markdown
## [v1.0.0] - 2025-11-15

### Added
- DB-backed refresh token system with Argon2 hashing
- Multi-device session management
- Token rotation with unique JTI
- Comprehensive observability (Prometheus + JSON logs)
- End-to-end demo script
- Makefile for development workflow

### Fixed
- Token determinism in refresh flow
- Revocation tracking in in-memory mode

### Security
- All tokens hashed with Argon2
- Rate limiting on auth endpoints
- Secure cookie settings (HttpOnly, SameSite)

### Performance
- SHAP cache with TTL management
- In-memory result caching
- Optimized MongoDB indexes
```

## Sign-Off & Review

### Code Review Checklist

Reviewer should verify:
- [ ] Code follows project style
- [ ] Tests are adequate and passing
- [ ] Documentation is accurate
- [ ] No security vulnerabilities
- [ ] No performance regressions
- [ ] No breaking changes (or documented)

### Approval Gates

Before merge:
- [ ] All CI checks passing
- [ ] Code review approved
- [ ] Tests pass locally on reviewer's machine
- [ ] Demo script runs successfully

## Post-Release

### Deployment Steps

1. Merge to `main` branch
2. Tag release:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0: DB-backed tokens, observability, demo"
   git push origin v1.0.0
   ```

3. Build and push containers:
   ```bash
   docker build -t ethixai/backend:v1.0.0 ./backend
   docker build -t ethixai/ai-core:v1.0.0 ./ai_core
   docker push ethixai/backend:v1.0.0
   docker push ethixai/ai-core:v1.0.0
   ```

4. Deploy to staging/production
5. Verify health checks pass
6. Monitor metrics for anomalies

### Monitoring Post-Release

- [ ] Error rate stable (< 1%)
- [ ] Latency baseline maintained
- [ ] No unusual memory growth
- [ ] Cache hit ratio > 40%
- [ ] No security alerts

## Rollback Plan

If issues detected:

1. Stop affected services:
   ```bash
   docker compose down
   ```

2. Revert database migrations (if needed):
   ```bash
   # Manual MongoDB document restoration from backups
   ```

3. Redeploy previous version:
   ```bash
   docker compose pull  # Gets previous tag
   docker compose up -d
   ```

4. Verify health:
   ```bash
   curl http://localhost:5000/health
   ```

---

**Release Prepared By:** _________  
**Review Approved By:** _________  
**Release Date:** _________  

**Status:** ✅ Ready for Release
