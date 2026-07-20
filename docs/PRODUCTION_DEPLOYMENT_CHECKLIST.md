# Production Deployment Checklist

**Critical Gates:** All items must be checked before production deployment. This document serves as legal/compliance evidence.

---

## Pre-Deployment (1-2 weeks before)

### Security & Compliance

- [ ] **Code Security Audit**
  - [ ] Run `make lint:security` — zero security violations
  - [ ] Review recent commits for secrets/PII leaks
  - [ ] Check `.env` — all secrets are environment variables (never in code)
  - [ ] Verify no hardcoded API keys, passwords, or credentials
  - [ ] Confirm CORS origins are restricted to known domains (production URLs only)

- [ ] **Authentication & Authorization**
  - [ ] Firebase Auth configured with production project ID
  - [ ] JWT secret key generated and stored in secure vault (not in code)
  - [ ] Password policy enforced: min 12 characters, complexity requirements
  - [ ] MFA enabled for admin users (encourage for all users)
  - [ ] Role-based access control (RBAC) tested for all roles (admin, analyst, reviewer, viewer)
  - [ ] SSO configured if required (SAML, OIDC, LDAP metadata exported)

- [ ] **Payment & Billing**
  - [ ] Stripe production keys configured (not test keys)
  - [ ] Stripe webhook endpoint configured: `https://api.yourdomain.com/api/webhooks/stripe`
  - [ ] Stripe webhook secret stored in environment variable
  - [ ] Payment method validation working (test transaction successful)
  - [ ] Billing routes tested: subscribe, list invoices, generate invoice
  - [ ] Refund process documented and tested

- [ ] **Data Protection**
  - [ ] Database encryption enabled (PostgreSQL, MongoDB)
  - [ ] Backups encrypted (S3 SSE-S3 or customer-managed keys)
  - [ ] HTTPS enforced on all API endpoints (HSTS headers set)
  - [ ] API rate limiting configured: public endpoints stricter than private
  - [ ] Input validation enabled on all routes (express-validator)
  - [ ] SQL injection prevention verified (parameterized queries only)
  - [ ] XSS protection enabled (CSP headers configured)

- [ ] **Audit & Logging**
  - [ ] Application logging configured (Pino JSON logs)
  - [ ] Audit logs stored in immutable storage (S3 with versioning + MFA Delete)
  - [ ] Sensitive data excluded from logs (passwords, PII, payment details)
  - [ ] Log retention policy set: 7 years for compliance, 1 year for standard
  - [ ] Monitoring configured: Prometheus scrape targets responding
  - [ ] Alerting configured: Slack/PagerDuty integration for critical events

### Infrastructure & Operations

- [ ] **Database**
  - [ ] PostgreSQL version: 13+ (or specified version)
  - [ ] Database backups automated (daily snapshots)
  - [ ] Backup restoration tested: restore from snapshot successful
  - [ ] Row-level security (RLS) enabled on all tenant-scoped tables
  - [ ] Connection pooling configured: max 50 connections, idle timeout
  - [ ] Slow query logging enabled (`log_min_duration_statement = 1000`)

- [ ] **Application Servers**
  - [ ] Node.js version: 20+ (check `package.json`)
  - [ ] No development dependencies in production (remove `devDependencies`)
  - [ ] Environment variables validated at startup (missing vars = fatal error)
  - [ ] Graceful shutdown configured (60-second drain before termination)
  - [ ] Health check endpoint active: `GET /health` returns 200 + service status
  - [ ] Memory limits set: Node heap size < 1GB (adjust per deployment)

- [ ] **Networking**
  - [ ] API accessible via HTTPS only (redirect HTTP → HTTPS)
  - [ ] CORS origins whitelist configured (no wildcards in production)
  - [ ] Certificate: valid, not self-signed, renewed automatically
  - [ ] TLS 1.2+ enforced (disable older protocols)
  - [ ] API gateway/WAF configured: DDoS protection, bot detection
  - [ ] Database not publicly accessible (private VPC only)

- [ ] **Monitoring & Alerting**
  - [ ] Prometheus metrics endpoint: `GET /metrics` (list all exported metrics)
  - [ ] Grafana dashboards created: request latency, error rate, throughput
  - [ ] Alert rules configured for critical thresholds:
    - [ ] Uptime <99.9% (alert if down >4 minutes/hour)
    - [ ] Error rate >5% (alert immediately)
    - [ ] Response latency P95 >30ms (alert if degraded)
    - [ ] Database connection pool exhausted (alert)
    - [ ] Stripe webhook failures (alert)
  - [ ] Slack/PagerDuty integration tested: alerts are received

### Testing & Validation

- [ ] **Unit & Integration Tests**
  - [ ] All tests passing: `make test` (exit code 0)
  - [ ] Test coverage minimum 80% (critical paths)
  - [ ] Integration tests passing: database + API interactions
  - [ ] Payment flow tests passing: subscribe, invoice, webhook
  - [ ] Compliance report generation tested and verified

- [ ] **Load & Performance Testing**
  - [ ] Baseline performance captured: `make day14-baseline-artifacts`
  - [ ] P95 latency <15ms (or production SLA)
  - [ ] Throughput ≥100 req/s sustained (or target load)
  - [ ] Error rate <1% under normal load
  - [ ] Spike test: 250 req/s for 2 minutes (graceful handling)
  - [ ] Soak test: 40 req/s for 30 minutes (no memory leaks)

- [ ] **Smoke Tests**
  - [ ] Full user flow: register → login → upload dataset → run analysis → generate report
  - [ ] Payment flow: upgrade plan → Stripe payment → subscription active
  - [ ] Compliance flow: create analysis → generate compliance report PDF → verify audit log
  - [ ] API endpoints: all critical endpoints responding with correct status codes
  - [ ] Database: can read/write data; backups restorable

- [ ] **Security Testing**
  - [ ] SQL injection test: payload `' OR '1'='1` rejected
  - [ ] XSS test: `<script>alert('xss')</script>` escaped or blocked
  - [ ] CSRF: POST requests require CSRF token (if applicable)
  - [ ] Authentication bypass: invalid tokens rejected
  - [ ] Authorization: non-admin users cannot access admin endpoints
  - [ ] Rate limiting: 100+ requests/min rejected for public endpoints
  - [ ] Secrets scan: `detect-secrets` finds no active secrets

### Documentation & Runbooks

- [ ] **Incident Response**
  - [ ] Incident playbook created: payment failure, data loss, security breach
  - [ ] On-call escalation path documented: primary → secondary → manager
  - [ ] Incident communication template prepared (customer notification)
  - [ ] Post-incident review template prepared (root cause analysis)

- [ ] **Deployment & Rollback**
  - [ ] Deployment procedure documented (step-by-step)
  - [ ] Rollback procedure tested: able to deploy previous version
  - [ ] Change log entry prepared (what changed, why, who approved)
  - [ ] Maintenance window notification sent to users (if applicable)

- [ ] **Operations**
  - [ ] Backup restoration procedure documented and tested
  - [ ] Database failover procedure documented (manual or automated)
  - [ ] Log rotation configured: archive old logs to S3 after 30 days
  - [ ] Secrets rotation schedule: annual for API keys, monthly for passwords

---

## Day-of-Deployment (2 hours before to 2 hours after)

### Pre-Deployment (2 hours before)

- [ ] **Team Communication**
  - [ ] Incident commander assigned (primary on-call engineer)
  - [ ] On-call team notified via Slack: @channel "Deployment starting at [TIME]"
  - [ ] Customer support notified: expect brief uptime (if applicable)
  - [ ] Status page updated: "Maintenance window, expected completion [TIME]"

- [ ] **Final Checks**
  - [ ] Database backup freshly created: `scripts/backup_postgres.sh`
  - [ ] Backup restoration tested: confirmed successful restore
  - [ ] All tests passing locally: `make test && make lint:security`
  - [ ] Environment variables double-checked: staging vs. production
  - [ ] Stripe webhooks still configured (re-verify endpoint + signing secret)
  - [ ] SSL certificate valid: not expired, correct domain

### Deployment

- [ ] **Deployment Steps**
  ```bash
  # 1. Pull latest code
  git checkout main
  git pull origin main

  # 2. Run migrations (test on staging first if new)
  npm run db:migrate

  # 3. Restart services (or rolling restart via k8s)
  docker-compose up -d --remove-orphans

  # 4. Verify health
  curl https://api.yourdomain.com/health
  ```

- [ ] **Validation After Deployment**
  - [ ] Health check passing: `GET /health` responds with `{ "status": "ok" }`
  - [ ] Error rate normal: check Prometheus (target <1%)
  - [ ] Response latency normal: P95 <15ms (check Grafana)
  - [ ] No alert storms: check Grafana Alerts + Slack
  - [ ] Database responding: can read/write
  - [ ] Stripe webhook delivery working: test via Stripe Dashboard
  - [ ] Users can login: test with staging user account
  - [ ] Payment flow works: test with Stripe test card (4242...)

### Post-Deployment (1-2 hours)

- [ ] **Monitoring**
  - [ ] Watch error logs: `tail -f logs/application.log | grep -i error`
  - [ ] Monitor CPU/memory: `docker stats`
  - [ ] Check Grafana dashboard every 15 minutes
  - [ ] Respond to any alerts immediately

- [ ] **Rollback Plan**
  If critical issues discovered within 1 hour:
  ```bash
  git checkout previous-stable-tag
  docker-compose up -d --remove-orphans
  curl https://api.yourdomain.com/health  # Verify
  ```

- [ ] **Team Notification**
  - [ ] If successful: @channel "Deployment complete, all systems green"
  - [ ] If rollback: @channel "Rollback in progress due to [REASON]"
  - [ ] If issues: page on-call engineer + incident commander

---

## Post-Deployment (24-48 hours)

- [ ] **Verify Stability**
  - [ ] Error rate stable: <1% for 24 hours
  - [ ] Response latency stable: P95 <15ms
  - [ ] No unusual database queries: check slow query log
  - [ ] Backup completed successfully: verify S3 object size reasonable
  - [ ] User reports: no critical bugs reported

- [ ] **Verify Compliance**
  - [ ] Audit logs present: check `audit_logs` table for all actions
  - [ ] Encryption enabled: verify S3 object encryption headers
  - [ ] Rate limiting active: verify IP throttling working
  - [ ] Secrets rotation: if this was a secrets rotation, verify old secrets invalidated

- [ ] **Document**
  - [ ] Create incident/deployment log: timestamp, changes, issues encountered
  - [ ] Update CHANGELOG.md with version + deployment date
  - [ ] Schedule post-incident review if any issues occurred (within 2 business days)

---

## Environment Variable Checklist (Production)

Copy this and fill in all values before deployment:

```bash
# Core
NODE_ENV=production
PORT=5000
LOG_LEVEL=info

# Database
DB_HOST=<production-postgres-hostname>
DB_PORT=5432
DB_NAME=ethixai
DB_USER=ethixai_app
DB_PASSWORD=<generate-random-password>
DATABASE_URL=postgresql://ethixai_app:<password>@<hostname>:5432/ethixai

# Authentication
JWT_SECRET=<generate-random-secret>
FIREBASE_PROJECT_ID=<production-firebase-project>
GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/firebase-service-account.json

# Stripe
STRIPE_SECRET_KEY=sk_live_<your-stripe-live-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-stripe-webhook-secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_<your-stripe-live-key>

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXTAUTH_SECRET=<generate-random-secret>
NEXTAUTH_URL=https://app.yourdomain.com

# Email (if configured)
SENDGRID_API_KEY=<sendgrid-key-if-used>
MAIL_FROM=noreply@yourdomain.com

# AWS (if using S3 for backups/logs)
AWS_ACCESS_KEY_ID=<production-key>
AWS_SECRET_ACCESS_KEY=<production-secret>
AWS_REGION=us-east-1
AUDIT_LOG_BUCKET=ethixai-audit-logs-prod

# Monitoring
PROMETHEUS_RETENTION=30d
GRAFANA_ADMIN_PASSWORD=<generate-random-password>

# Optional: AI Core (if separate microservice)
AI_CORE_URL=https://ai-core.yourdomain.com
AI_CORE_TRUSTED_HOSTS=api.yourdomain.com,app.yourdomain.com

# SSL/TLS
TRUST_PROXY=1
HTTPS_ONLY=1
HSTS_MAX_AGE=31536000
```

---

## Secrets Management (Production)

**NEVER commit secrets to Git.** Use one of these approaches:

### Option 1: HashiCorp Vault (Recommended)
```bash
vault kv put secret/ethixai/prod \
  stripe_secret_key="sk_live_..." \
  jwt_secret="random..." \
  db_password="random..."
```

### Option 2: AWS Secrets Manager
```bash
aws secretsmanager create-secret \
  --name ethixai/prod \
  --secret-string '{"stripe_secret_key":"sk_live_...","jwt_secret":"..."}'
```

### Option 3: Environment Variables (Simple)
- Store in production CI/CD system (GitHub Secrets, GitLab CI variables)
- Load at container startup
- Never log or echo secrets

---

## Compliance Verification (Post-Deployment)

- [ ] **ECOA Compliance** (if handling credit decisions)
  - [ ] Audit logs present for all analysis decisions
  - [ ] Compliance reports generated and retained for 7 years
  - [ ] Fairness metrics calculated and logged

- [ ] **GDPR Compliance** (if EU customers)
  - [ ] Data subject access request (DSAR) process implemented
  - [ ] Account deletion cascades to all user data
  - [ ] Consent management UI present

- [ ] **SOC 2 Compliance**
  - [ ] Audit logging enabled and immutable
  - [ ] Encryption in transit and at rest verified
  - [ ] Access controls (RBAC) enforced
  - [ ] Incident response procedures in place

---

## Sign-Off (Required Before Production)

```
Deployment Date: ________________
Deployed By: ________________
Approved By (Tech Lead): ________________
Approved By (Ops/Security): ________________

All checklists complete and verified: ____ YES ____ NO
No critical issues identified: ____ YES ____ NO
Ready for production: ____ YES ____ NO
```

---

## Post-Deployment Review (Within 48 hours)

**Conducted By:** ________________  
**Date:** ________________

### System Health
- Error rate: ____% (target: <1%)
- P95 latency: ____ms (target: <15ms)
- Uptime: ____% (target: >99.9%)

### Issues Encountered
(describe any incidents, false alarms, or improvements needed)

### Follow-Up Actions
1. ________________________
2. ________________________
3. ________________________

---

**Document Version:** 1.0  
**Last Updated:** 2024-07-20  
**Next Review:** 2024-10-20
