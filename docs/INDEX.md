# EthixAI Documentation

**Last Updated**: July 2026 | **Version**: 1.0.0

---

## Start Here

| Who you are | Read this |
|-------------|-----------|
| **New developer** | [CONTRIBUTING.md](guides/CONTRIBUTING.md) → [ARCHITECTURE.md](ARCHITECTURE.md) |
| **Deploying** | [DEPLOYMENT_GUIDE.md](guides/DEPLOYMENT_GUIDE.md) → [deploy/](deploy/) |
| **Running analysis** | [USER_MANUAL.md](USER_MANUAL.md) |
| **Security review** | [security/](security/) |
| **AI agent onboarding** | [ETHIXAI_PROJECT_CONTEXT.md](ETHIXAI_PROJECT_CONTEXT.md) |

---

## Architecture & Design

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture — services, auth, data flow |
| [ETHIXAI_PROJECT_CONTEXT.md](ETHIXAI_PROJECT_CONTEXT.md) | Comprehensive codebase context (routes, components, API surface) |
| [architecture/architecture-diagram.md](architecture/architecture-diagram.md) | ASCII architecture diagrams |
| [architecture/data-models.md](architecture/data-models.md) | Database schemas and models |
| [architecture/decision-flow.md](architecture/decision-flow.md) | Decision flow diagrams |
| [architecture/storage-architecture.md](architecture/storage-architecture.md) | Storage layer design |
| [architecture/tech-stack.md](architecture/tech-stack.md) | Technology stack reference |

## API Reference

| Document | Description |
|----------|-------------|
| [api-spec.yaml](api-spec.yaml) | OpenAPI specification |
| [api/api-contract-v1.md](api/api-contract-v1.md) | Frozen API contract v1.0 |
| [api/backend-system-api.md](api/backend-system-api.md) | Express API endpoints |
| [api/backend-ai-core.md](api/backend-ai-core.md) | Backend ↔ AI Core integration |
| [api/backend-refresh-tokens.md](api/backend-refresh-tokens.md) | Auth system — tokens, rotation, devices |
| [api/validation-api.md](api/validation-api.md) | Validation API endpoints |
| [api/api-evaluation-spec.md](api/api-evaluation-spec.md) | Evaluation pipeline spec |

## Guides

| Document | Description |
|----------|-------------|
| [USER_MANUAL.md](USER_MANUAL.md) | End-user guide — analysis, reports, troubleshooting |
| [guides/CONTRIBUTING.md](guides/CONTRIBUTING.md) | Branch strategy, PR workflow, code style |
| [guides/DEPLOYMENT_GUIDE.md](guides/DEPLOYMENT_GUIDE.md) | Production deployment steps |
| [guides/frontend-setup.md](guides/frontend-setup.md) | Frontend local dev setup |
| [guides/product_spec.md](guides/product_spec.md) | Product specification |
| [guides/ADMIN_SYSTEM_SPEC.md](guides/ADMIN_SYSTEM_SPEC.md) | Admin system specification |
| [guides/history-ui.md](guides/history-ui.md) | History UI design |
| [guides/ux-descriptions.md](guides/ux-descriptions.md) | UX descriptions and flows |

## Security

| Document | Description |
|----------|-------------|
| [security/README.md](security/README.md) | Security overview |
| [security/encryption-guide.md](security/encryption-guide.md) | TLS, data-at-rest, field-level encryption |
| [security/secrets-management.md](security/secrets-management.md) | Vault, key rotation, OIDC, Gitleaks |
| [security/SECRETS_MANAGEMENT.md](security/SECRETS_MANAGEMENT.md) | Secrets management detailed guide |
| [security/rbac-zero-trust.md](security/rbac-zero-trust.md) | RBAC, JWT hardening, mTLS, MFA |
| [security/audit-logging.md](security/audit-logging.md) | Structured logs, immutable storage |
| [security/supply-chain.md](security/supply-chain.md) | Dependency scan, SBOM, image signing |
| [security/incident-response.md](security/incident-response.md) | IR playbook, runbooks, patch SLAs |
| [security/soc2-readiness.md](security/soc2-readiness.md) | SOC 2 control mapping, gap analysis |
| [security/security_design.md](security/security_design.md) | Security hardening design |
| [security/security_hardening.md](security/security_hardening.md) | Security hardening implementation |
| [security/SECRET_SCANNING_ARCHITECTURE.md](security/SECRET_SCANNING_ARCHITECTURE.md) | Secret scanning architecture |
| [security/SECRET_MANAGEMENT_QUICK_REF.md](security/SECRET_MANAGEMENT_QUICK_REF.md) | Quick reference for secrets |

## Deployment & Infrastructure

| Document | Description |
|----------|-------------|
| [deploy/production-plan.md](deploy/production-plan.md) | Production deployment plan |
| [deploy/environment-variables.md](deploy/environment-variables.md) | Environment variable reference |
| [deploy/secrets-management.md](deploy/secrets-management.md) | Deployment secrets setup |
| [deploy/health-probes.md](deploy/health-probes.md) | Liveness/readiness/startup probes |
| [deploy/smoke-tests.md](deploy/smoke-tests.md) | Smoke test procedures |
| [deploy/backup-disaster-recovery.md](deploy/backup-disaster-recovery.md) | Backup and DR procedures |
| [deploy/firestore-deploy.md](deploy/firestore-deploy.md) | Firestore deployment |
| [deploy/FIREBASE_BACKEND_SETUP.md](deploy/FIREBASE_BACKEND_SETUP.md) | Firebase backend setup |
| [deploy/FIREBASE_SECRET_FILE_SETUP.md](deploy/FIREBASE_SECRET_FILE_SETUP.md) | Firebase secret file setup |
| [deploy/QUICK_FIX_FIREBASE.md](deploy/QUICK_FIX_FIREBASE.md) | Firebase quick fix |

## Monitoring & Observability

| Document | Description |
|----------|-------------|
| [monitoring/monitoring-overview.md](monitoring/monitoring-overview.md) | Monitoring overview |
| [monitoring/MONITORING_GUIDE.md](monitoring/MONITORING_GUIDE.md) | Complete monitoring guide |
| [monitoring/monitoring_architecture.md](monitoring/monitoring_architecture.md) | Monitoring architecture |
| [monitoring/monitoring_infrastructure.md](monitoring/monitoring_infrastructure.md) | Infrastructure setup |
| [monitoring/monitoring_dashboard_design.md](monitoring/monitoring_dashboard_design.md) | Dashboard design |
| [monitoring/monitoring_data_flow.md](monitoring/monitoring_data_flow.md) | Data flow design |
| [monitoring/monitoring_policy.md](monitoring/monitoring_policy.md) | Monitoring policies |
| [monitoring/monitoring_schemas.md](monitoring/monitoring_schemas.md) | Metric schemas |
| [monitoring/alerting_system_design.md](monitoring/alerting_system_design.md) | Alerting system |
| [monitoring/drift_metrics_spec.md](monitoring/drift_metrics_spec.md) | Drift detection metrics |
| [monitoring/observability.md](monitoring/observability.md) | Observability overview |
| [monitoring/OBSERVABILITY_ADVANCED.md](monitoring/OBSERVABILITY_ADVANCED.md) | Advanced observability |
| [monitoring/performance_metrics.md](monitoring/performance_metrics.md) | Performance metrics |
| [monitoring/stress_test_dashboard.md](monitoring/stress_test_dashboard.md) | Stress test dashboard |
| [monitoring/stress_test_plan.md](monitoring/stress_test_plan.md) | Stress test plan |

## Governance & Compliance

| Document | Description |
|----------|-------------|
| [governance/compliance_automation.md](governance/compliance_automation.md) | Compliance automation |
| [governance/audit_logging_spec.md](governance/audit_logging_spec.md) | Audit logging specification |
| [governance/audit-trail-design.md](governance/audit-trail-design.md) | Audit trail design |
| [governance/fairness-metrics.md](governance/fairness-metrics.md) | Fairness metrics reference |
| [governance/model_explainability.md](governance/model_explainability.md) | Model explainability (SHAP) |
| [governance/model_validation.md](governance/model_validation.md) | Model validation |
| [governance/model-validation-engine.md](governance/model-validation-engine.md) | Validation engine |
| [governance/model_cards_design.md](governance/model_cards_design.md) | Model cards design |
| [governance/QUICK_START.md](governance/QUICK_START.md) | Governance quick start |

## Quality & Testing

| Document | Description |
|----------|-------------|
| [quality/qa-checklist.md](quality/qa-checklist.md) | QA manual test plan |
| [quality/test-coverage.md](quality/test-coverage.md) | Coverage targets and enforcement |
| [quality/red-lines.md](quality/red-lines.md) | Non-negotiable coding/security rules |
| [quality/security-controls-review.md](quality/security-controls-review.md) | Security controls review |

## Operations

| Document | Description |
|----------|-------------|
| [operations/incident_playbook.md](operations/incident_playbook.md) | Incident response playbook |
| [operations/alerts_playbook.md](operations/alerts_playbook.md) | Alert response playbook |
| [operations/release-rollback.md](operations/release-rollback.md) | Release rollback procedures |
| [operations/PRODUCTION_HARDENING.md](operations/PRODUCTION_HARDENING.md) | Production hardening guide |

---

## Archive

Historical documents are preserved in `docs/archive/`:
- `archive/daily-reports/` — Day-by-day completion reports (Days 5–32)
- `archive/feature-docs/` — Feature-specific implementation summaries
- `archive/testing-guides/` — Historical testing checklists
- `archive/demo-release/` — Demo prep and release checklists

---

## Root Files

| File | Purpose |
|------|---------|
| [README.md](../README.md) | Project overview, features, getting started |
| [CLAUDE.md](../CLAUDE.md) | AI agent context and conventions |
| [Makefile](../Makefile) | Development commands |
| [CONTRIBUTING.md](guides/CONTRIBUTING.md) | Contribution guide |
