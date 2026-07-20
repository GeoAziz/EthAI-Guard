# SOC 2 Type II Compliance Framework

**EthixAI** is designed to meet SOC 2 Type II requirements for Security, Availability, and Confidentiality. This document outlines the controls, procedures, and evidence required for certification.

---

## Executive Summary

| Control Area | Status | Evidence |
|---|---|---|
| Access Controls (CC6-CC9) | Implemented | IAM, MFA, RBAC, audit logs |
| Change Management (PO2, PO7, PO11) | Implemented | Git + CI/CD, testing, deployment checklist |
| Monitoring & Alerting (AT1-AT3) | Implemented | Prometheus, Grafana, structured logging |
| Incident Response (PI1-PI3) | Documented | Incident response plan |
| Data Protection (DS5, DS11, DS12) | Implemented | Encryption (TLS, at-rest), tokenization |
| Availability (A1) | Targeted | SLA 99.9%, load testing, failover plans |

---

## 1. Security Controls (CC6-CC9)

### 1.1 Physical & Logical Access

**CC6.1 Logical Access Controls**
- Authentication: Firebase Auth (production) + JWT tokens
- Authorization: Role-based access control (RBAC) with roles: admin, analyst, reviewer, viewer
- Multi-factor authentication (MFA) available via Firebase
- Session management: JWT tokens with 24-hour expiry, refresh token rotation

**Evidence:**
- `backend/src/middleware/authGuard.js` — Auth enforcement
- `backend/src/middleware/rbac.js` — Role-based access control
- `.env.example` — Lists all required secrets

**CC6.2 Role-Based Access**
```javascript
requireRole('admin')    // Admin dashboard, billing, SSO config
requireRole('analyst')  // Create analyses, upload datasets
requireRole('reviewer') // Approve compliance reports
requireRole('viewer')   // Read-only access
```

### 1.2 Credential Management

**CC7.2 Password Security**
- Password policy: Minimum 12 characters in production (configurable)
- Hashing: bcryptjs or argon2
- Throttling: 10 login attempts per 5 minutes (configurable)
- Password reset: Email-based via Firebase, no plaintext transmission

**CC7.3 Cryptographic Key Management**
- Session secrets: Stored in environment variables, never committed
- JWT secret: Rotated via deployment
- Stripe keys: Separate test/production keys managed per environment
- Database credentials: Stored in PostgreSQL, applied via environment

**Evidence:**
- `backend/src/config/secrets.js` — Secret validation & retrieval
- `backend/src/middleware/authGuard.js` — Password policy enforcement

### 1.3 User Provisioning & Deprovisioning

**CC8.1 Access Provisioning**
- New users created via sign-up or SSO provisioning
- Tenant-scoped user assignment
- Role assignment at provisioning time

**CC8.3 Revocation**
- User deletion removes access via Firebase and MongoDB
- SSO session revocation on logout
- Refresh token blacklist (in production; in-memory in dev)

**Evidence:**
- `backend/src/routes/auth.js` — User registration & provisioning
- `backend/src/routes/enterpriseSSO.js` — SSO user lifecycle
- `backend/src/models/User.js` — User schema

### 1.4 Audit & Logging

**CC7.4 Activity Logging**
- All API requests logged with: timestamp, user, action, resource, result
- Compliance-sensitive actions: analysis, report generation, export, payment
- Logs retained for minimum 1 year (configurable, ECOA requires 7 years for credit decisions)

**Evidence:**
- `backend/src/logger.js` — Structured JSON logging (Pino)
- `backend/src/middleware/auditGuard.js` — Audit logging middleware
- `backend/src/services/auditS3Service.js` — S3-backed audit archive

---

## 2. Change Management (PO2, PO7, PO11)

### 2.1 Change Control Process

**PO2.1 Risk Assessment**
- All code changes go through Git + Pull Requests
- Reviews required before merge to main
- Automated tests run pre-merge (CI/CD)
- Security linting checks for auth, injection, crypto issues

**PO7.1 Change Authorization**
- Pull requests require code review (CODEOWNERS)
- Deployment requires approval in production
- Rollback procedure documented

**Evidence:**
- `.github/workflows/*.yml` — CI/CD pipelines
- `CLAUDE.md` — Change procedures
- Git commit messages — Audit trail

### 2.2 Testing & Deployment

**PO11.1 Testing Standards**
- Unit tests: Jest (backend), Vitest (frontend), Pytest (AI Core)
- Integration tests: Full stack smoke tests
- Load tests: k6 scenarios (baseline, ramp, spike, stress, soak)
- Security tests: ESLint security rules, OWASP checks

**Deployment Procedure:**
1. Run tests & security linting locally
2. Create pull request with detailed description
3. Peer code review + automated CI checks
4. Merge to staging branch (auto-deploys to staging)
5. Production deployment via approval + rollback plan

**Evidence:**
- `Makefile` — Test targets
- `backend/__tests__`, `frontend/__tests__`, `ai_core/tests/` — Test suites
- `tools/load/day14/` — Load testing scenarios
- `.github/workflows/backend-ci.yml` — CI/CD definition

---

## 3. Monitoring & Alerting (AT1-AT3)

### 3.1 Continuous Monitoring

**AT1.1 Infrastructure Monitoring**
- Metrics: Prometheus (response time, error rate, resource usage)
- Logs: Structured JSON via Pino, archived to S3
- Health checks: Backend, AI Core, MongoDB, Redis
- Alerts: Grafana rules for critical issues

**AT3.1 Sensitive Operations Monitoring**
- Payment events (charge, subscription, cancellation)
- User access to reports
- Export/download of data
- Configuration changes (SSO, billing, user roles)

**Evidence:**
- `backend/src/server.js` — Prometheus metrics endpoint
- `docker-compose.yml` — Prometheus + Grafana services
- `backend/src/logger.js` — JSON logging configuration
- `tools/stress/` — Monitoring during load tests

### 3.2 Alert Response

- Critical alerts (availability <99.9%, error rate >5%) → immediate response
- Security alerts (failed auth >100/min, API errors with secrets) → 1-hour response
- Standard alerts → business hours response

**Evidence:**
- Grafana dashboards
- Incident response runbooks (below)

---

## 4. Data Protection (DS5, DS11, DS12)

### 4.1 Encryption

**DS5.1 Encryption in Transit**
- All external communication via HTTPS/TLS 1.2+
- API responses include CORS headers (enforce HTTPS in production)
- Database connections via SSL to PostgreSQL

**DS5.2 Encryption at Rest**
- PostgreSQL: Disk encryption (via infrastructure provider, e.g., AWS EBS)
- Session tokens: Stored as JWTs (stateless) or hashed in refresh token table
- Sensitive fields: Application-level encryption for PII (optional, via NaCl)
- Backups: Encrypted snapshots (infrastructure responsibility)

**Evidence:**
- `backend/src/server.js` — Helmet CSP, HTTPS enforcement
- `.env.example` — HTTPS requirements
- Database SSL configuration in `src/db/postgres.js`

### 4.2 Data Retention & Disposal

**DS11.1 Retention Policy**
- User account data: Deleted on account removal
- Analysis results: Retained per subscription plan (indefinite for paid, 90 days for free tier)
- Compliance reports: 7 years (ECOA requirement for credit decisions)
- Audit logs: 1 year (configurable; longer for regulated data)
- Usage records: Retained for billing purposes + 1 year for audit

**DS12.1 Secure Disposal**
- Database records: Soft-deleted (retained in archive) or hard-deleted with audit trail
- S3 objects: Marked for deletion, then purged after retention period
- Backups: Purged per retention schedule

**Evidence:**
- `backend/migrations/postgres/0002_stripe_tables.sql` — Retention policy (compliance_reports expires_at)
- `backend/src/services/auditS3Service.js` — S3 lifecycle policy management

### 4.3 PII Handling

**DS5.3 PII Protection**
- User emails, names, passwords: Firebase-managed or hashed locally
- Credit card data: **Not stored locally** (Stripe-only, PCI-DSS delegated)
- Analysis data: Tenant-isolated via RLS + SQL parameter binding
- Logs: Exclude credentials, passwords, full card numbers

**Evidence:**
- `backend/src/middleware/authGuard.js` — No password logging
- `backend/src/services/stripeService.js` — Stripe-only payment handling
- `backend/migrations/postgres/0001_tenancy_billing.sql` — RLS policies

---

## 5. Availability (A1)

### 5.1 Availability Infrastructure

**A1.1 Uptime SLOs**
- Target: 99.9% monthly uptime (43.2 minutes downtime allowed)
- Measurement: HTTP /health endpoint (all critical services: API, DB, AI Core)
- Incident: Downtime >1 hour → root cause + remediation plan

**A1.2 Redundancy**
- Database: Backups via PostgreSQL snapshots (daily)
- Failover: Manual failover plan to standby PostgreSQL instance (documented, not yet automated)
- Cache: Redis with persistence (RDB snapshots)
- Load balancing: Via reverse proxy/load balancer (infrastructure layer)

**A1.3 Disaster Recovery**
- Backup frequency: Daily snapshots (configurable)
- Recovery time objective (RTO): <4 hours (restore from latest backup)
- Recovery point objective (RPO): <24 hours (one day of data loss acceptable)
- Testing: Monthly backup restoration test

**Evidence:**
- `backend/src/server.js` — Health check endpoint
- Docker Compose setup — Service interdependencies
- Disaster recovery runbook (below)

### 5.2 Capacity Planning

**Load Testing Results:**
- Baseline: 100 req/s sustained, P95 <15ms (verified via k6)
- Peak: 250 req/s achievable (spike test passed)
- Stress: Degradation at 600+ req/s (graceful error responses)

**Scaling Plan:**
- Database: Read replicas + connection pooling
- Cache: Redis Cluster for distributed sessions
- API servers: Horizontal scaling via k8s (documented, not yet deployed)

**Evidence:**
- `tools/load/day14/` — Load test scenarios & results
- `PERFORMANCE_REPORT.md` — Baseline metrics

---

## 6. Incident Response (PI1-PI3)

### 6.1 Incident Classification

| Severity | SLA | Example |
|---|---|---|
| Critical | <15 min response | Payment processing down, data breach, security exploit |
| High | <1 hour response | API errors >5%, user access denied, compliance report failure |
| Medium | <4 hours response | Slow queries, minor UI issues, non-critical service degraded |
| Low | Business hours | Documentation needs update, feature request, minor bug |

### 6.2 Incident Response Runbook

**Payment Processing Failure:**
1. Check Stripe webhook logs: `docker compose logs -f system_api | grep stripe`
2. Verify Stripe API status: https://status.stripe.com
3. Retry failed payments via `POST /api/billing/retry-payment`
4. Notify affected users of billing delay
5. Root cause: Check billing service logs and Stripe API error logs

**Data Loss:**
1. Identify affected data range (check audit logs: `SELECT * FROM audit_logs WHERE created_at > X`)
2. Restore from latest snapshot: `scripts/restore_postgres_backup.sh [backup_id]`
3. Verify data integrity: Run integration tests
4. Notify users of restore
5. Root cause: Investigate for accidental deletes or replication lag

**Security Breach:**
1. Isolate affected system (disable login, restrict API access)
2. Investigate: Check audit logs, SSH/API logs for unauthorized access
3. Revoke compromised tokens/credentials
4. Notify affected users and regulators (within 72 hours)
5. Post-incident review: Document timeline, root cause, remediation

**AI Core Service Down:**
1. Check AI Core logs: `docker compose logs -f ai_core`
2. Restart service: `docker compose up -d ai_core`
3. Verify health: `curl http://localhost:8100/health`
4. If not recovered, failover to backup model (if configured)
5. Degrade frontend: Show "Analysis temporarily unavailable" message

### 6.3 Communication Plan

- Internal: Notify engineering team via Slack alert
- External: Notify affected users via email (if >15 min downtime)
- Status page: Update incident status (if infrastructure provider offers status page)
- Post-incident: Full timeline + root cause within 48 hours

**Evidence:**
- Slack integration (configured in `backend/src/services/notificationsService.js`)
- Incident log template (below)

---

## 7. Regulatory Compliance

### 7.1 ECOA (Equal Credit Opportunity Act)

**Applicability:** Applies to AI systems making credit decisions

**Requirements:**
- Fairness analysis: Protected attribute testing (race, gender, age, national origin)
- Documentation: Compliance report with fairness metrics + methodology
- Retention: 7-year record retention (implemented in compliance_reports table)
- Adverse action notices: Notification of decision rationale to applicant

**EthixAI Controls:**
- Fair lending bias detection: Disparate impact, statistical parity metrics
- Explainability: SHAP values for decision explanations
- Audit trail: Full request/response logging with fairness scores
- Report generation: Automated compliance reports (PDF)

**Evidence:**
- `backend/src/services/complianceReportService.js` — Report generation
- `ai_core/governance/fairness_metrics.py` — Metric calculations
- `backend/migrations/postgres/0002_stripe_tables.sql` — 7-year retention

### 7.2 GDPR (Right to Explanation)

**Applicability:** If serving EU customers

**Requirements:**
- Right to explanation: Provide rationale for algorithmic decisions
- Data portability: Export user data in machine-readable format
- Deletion: Right to be forgotten (delete account + associated data)

**EthixAI Controls:**
- Decision explanations: SHAP values + feature importance
- Data export: Endpoint to download analysis results as JSON/CSV
- Account deletion: Cascade delete from MongoDB + PostgreSQL
- Consent management: Audit record of user consent for data processing

**Evidence:**
- `backend/src/routes/analyze.js` — SHAP explanations in response
- `backend/src/routes/auth.js` — Account deletion endpoint
- Privacy policy (in `frontend/src/app/privacy`)

### 7.3 NIST AI Risk Management Framework (AI RMF 1.0)

**EthixAI Alignment:**

| NIST Area | Control | Evidence |
|---|---|---|
| Govern (GV) | AI governance board | CLAUDE.md governance checklist |
| Map (MAP) | Bias & fairness mapping | Fairness metrics (disparate impact, statistical parity) |
| Measure (ME) | Performance metrics | Load testing, accuracy metrics in reports |
| Manage (MA) | Incident response | Runbooks above; automated alerting |

---

## 8. Compliance Testing & Validation

### 8.1 Annual Audit Checklist

- [ ] Code review: Security linting passed (no auth bypasses, injection vectors)
- [ ] Access review: IAM roles still appropriate, no stale users
- [ ] Change log review: All production changes documented + tested
- [ ] Incident log review: SLAs met, incidents resolved within timelines
- [ ] Backup validation: Restore test successful
- [ ] Performance: Load test results meet SLOs (P95 <15ms, 100+ req/s)
- [ ] Compliance: All required audit trails present + immutable
- [ ] Penetration testing: Third-party security assessment (optional)

### 8.2 Continuous Validation

**Pre-Deployment:**
```bash
make test             # Unit + integration tests
make lint:security    # Security linting
make type-check       # TypeScript validation
```

**Post-Deployment:**
```bash
make smoke-tests      # Full-stack validation
make day14-baseline   # Performance baseline
curl http://localhost:5000/health  # Health check
```

**Scheduled (weekly):**
- Backup restoration test
- Audit log integrity check
- Security policy review

---

## 9. Security Incident Log Template

```
INCIDENT ID: INC-2024-001
Date: 2024-07-20
Severity: High
Component: Payment Service

TIMELINE:
- 14:32 UTC: Payment processing started failing (error rate >10%)
- 14:45 UTC: Alert triggered, engineering notified
- 14:52 UTC: Root cause identified (Stripe API rate limit)
- 15:00 UTC: Service recovered (rate limit reset)

ROOT CAUSE:
Unexpected spike in subscription cancellation requests triggered Stripe API rate limiter.

RESOLUTION:
- Implement exponential backoff for Stripe API calls
- Set up separate rate limit monitoring for Stripe

IMPACT:
- 18 minutes downtime, 12 users affected
- ~$50 in refunded transactions

FOLLOW-UP:
- [ ] Implement backoff (3 days)
- [ ] Add Stripe rate limit monitoring (1 day)
- [ ] Post-incident review meeting (scheduled for 2024-07-22)

ASSIGNEE: @engineering
```

---

## 10. Deployment Checklist (Pre-Production)

### Before Each Production Deploy

- [ ] All tests passing: `make test`
- [ ] Security linting passing: `make lint:security`
- [ ] Database migrations tested: Restore from backup, run migrations, verify schema
- [ ] Environment variables validated: All required secrets present + non-default values
- [ ] Secrets not in code: `git diff --cached | grep -i password || echo "OK"`
- [ ] Load test baseline: `make day14-baseline-artifacts` results within acceptable range
- [ ] Incident response team notified: Slack announcement
- [ ] Rollback plan documented: `docs/DEPLOYMENT_GUIDE.md`
- [ ] Monitoring configured: Grafana dashboards, alert rules, Slack hooks

### Post-Deployment (First 1 Hour)

- [ ] Health check passing: `curl https://api.ethixai.com/health`
- [ ] Error rate normal: Check Prometheus (goal: <1% errors)
- [ ] Response latency normal: P95 <15ms (check Grafana)
- [ ] No new incidents: Review recent alert logs
- [ ] Users can login: Manual smoke test of sign-up → analyze → report flow
- [ ] Payments working: Test payment with Stripe test card
- [ ] Compliance reports generating: Manual test of report PDF generation

---

## 11. Security Policies

### 11.1 Password Policy

- Minimum length: 12 characters (production), 8 (dev/test)
- Complexity: At least one uppercase, lowercase, digit, special character
- Reuse: Previous 5 passwords cannot be reused
- Expiry: Optional (60 days if configured)
- Reset: Email-based, link expires in 1 hour

### 11.2 Session Policy

- JWT expiry: 24 hours
- Refresh token: Rotated on use, invalidates old token
- Refresh token storage: In production, token hashes stored in DB + revocation list; in dev, in-memory
- Simultaneous logins: Allowed (stateless JWT); refresh token per device can be revoked individually
- Idle timeout: Optional, configurable per deployment

### 11.3 API Key Policy

- Stripe API keys: Separate test/production keys, rotated annually
- Database credentials: Environment-variable managed, rotated annually
- JWT secret: Rotated on deployment (generated at runtime)
- Firebase service account: Stored as JSON in secure vault (not committed), rotated annually

### 11.4 Data Classification

| Level | Definition | Examples | Storage | Retention |
|---|---|---|---|---|
| Public | No confidentiality concern | Marketing materials, public API docs | Any | Indefinite |
| Internal | Employee/customer internal data | Architecture docs, team notes | Git (encrypted) or shared drive | 3 years |
| Confidential | Customer data, business sensitive | User data, analysis results, payment info | Encrypted DB + S3 | Per contract |
| Restricted | Regulatory/compliance data | Audit logs, compliance reports, secrets | Encrypted, access-logged DB | 7+ years |

---

## 12. Contacts & Escalation

| Role | Responsibility | Contact |
|---|---|---|
| Security Lead | Incident response, policy enforcement | @security-team (Slack) |
| Compliance Officer | Audit, regulatory requirements, SLA tracking | @compliance (Slack) |
| Ops Lead | Infrastructure, backups, deployment | @devops (Slack) |
| Engineering Manager | Code quality, testing, change approval | @eng-lead (Slack) |

---

## 13. References

- **NIST SP 800-53:** Security and Privacy Controls (https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- **NIST AI RMF 1.0:** AI Risk Management Framework (https://airc.nist.gov/AI_RMF_1.0_Framework.pdf)
- **ECOA:** Equal Credit Opportunity Act, 15 U.S.C. § 1691 (https://www.govinfo.gov/content/pkg/USCODE-2020-title15/pdf/USCODE-2020-title15-chap41-subchapIII.pdf)
- **GDPR Article 22:** Right to Explanation (https://gdpr-info.eu/art-22-gdpr/)
- **SOC 2 Trust Service Criteria:** (https://www.aicpa.org/resources/download/trust-service-criteria)

---

## 14. Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2024-07-20 | EthixAI Security Team | Initial SOC 2 framework |

---

**Last Updated:** 2024-07-20  
**Next Review:** 2024-10-20  
**Approval Status:** Draft (awaiting CISO sign-off)
