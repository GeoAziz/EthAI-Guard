# GitHub Actions Workflows

22 workflows. This repo runs on the GitHub Actions **free tier** (2,000 min/month
on a private repo), so before adding a new workflow, check this table for an
existing one to extend — every new push/PR trigger multiplies cost across the
whole set below.

## CI (push / PR)

| Workflow | Trigger | Purpose |
|---|---|---|
| `backend-ci.yml` | push/PR to `main`, paths `backend/**` `frontend/**` | Backend Jest tests + frontend axe accessibility smoke check |
| `backend-emulator-tests.yml` | push/PR, paths `backend/**` `firebase.json` | Backend tests against Firebase emulator |
| `frontend-ci.yml` | push/PR, paths `frontend/**` | Frontend build, lint, lightweight secret pattern scan |
| `ci-ai-core.yml` | push/PR, paths `ai_core/**` | ai_core pytest suite with coverage |
| `lint-and-qa.yml` | push/PR to `main`/`develop` | Frontend ESLint + ai_core pylint/flake8/bandit gates |
| `pre-commit.yml` | push to `main`, PR (any path) | Fast hygiene hooks only (whitespace, EOF, YAML, large-files, black). Security hooks (`detect-secrets`, `bandit-ai-core`, `eslint-security-*`) are intentionally **not** re-run here — they duplicate `security-scan.yml`/`security-extra.yml`, which produce SARIF/artifacts this doesn't. Those hooks still run for local commits via `.pre-commit-config.yaml`. |
| `e2e-tests.yml` | push/PR to `main`/`develop` | Playwright end-to-end tests |
| `day13-integration-tests.yml` | push to `main`/`develop`, PR to `main` | Canonical integration suite: E2E journey, observability, compatibility tests, failure-drills, consolidated report |
| `day13-integration.yml` | push to `day13` branch only, `workflow_dispatch` | Historical full docker-compose Day-13 script. Deliberately **not** triggered on `main` — `day13-integration-tests.yml` is the canonical one; this stays scoped to its dev branch to avoid double-running on every push. |
| `day16-smoke-and-probes.yml` | push to `main`, `workflow_dispatch` | **Canonical per-push golden-path smoke test** (docker-compose + `tools/smoke_tests/run_smoke_tests.sh`, hard assertions) |
| `smoke-tests.yml` | nightly cron `0 2 * * *`, `workflow_dispatch` | Deeper nightly smoke regression against live mongo/redis services. Demoted off push/PR — it covered the same golden path as `day16-smoke-and-probes.yml` with weaker (non-blocking) assertions, so running both per-push was pure duplicate spend. |
| `chaos-smoke.yml` | PR to `main` | Chaos/resilience smoke test against an ephemeral environment |
| `governance-compliance.yml` | push/PR to `main`/`staging`, paths `ai_core/**` `backend/src/models/**` | Model card generation → compliance validation → MongoDB upload → audit log → deployment gate (dispatches `deploy-production.yml`) |

## Security & dependency scanning

| Workflow | Trigger | Purpose |
|---|---|---|
| `security-scan.yml` | push/PR to `main`/`develop`, weekly cron | **Canonical security workflow**: CodeQL (security-extended queries), dependency scan (npm audit + pip-audit, frontend+backend+ai_core), secret scan (Gitleaks w/ `.gitleaks.toml`), container scan (Trivy), advanced SAST (Bandit + pattern checks), consolidated summary |
| `security-extra.yml` | PR, paths `backend/**` `frontend/**` `ai_core/**` | ESLint security rules, Bandit scan, lockfile diff — narrower/faster than `security-scan.yml`'s advanced-sast job, PR-only |
| `snyk-security-scan.yml` | push/PR to `main`/`develop`, daily cron | Snyk SCA + SAST (separate commercial tool/DB from CodeQL/Gitleaks — intentionally not consolidated) |

> Note: `codeql.yml`, `secret-scan.yml`, and `dependency-audits.yml` were
> removed as pure duplicates of jobs inside `security-scan.yml`. `ci-cd.yml`
> was trimmed from a 9-job monolith down to its two jobs with no equivalent
> elsewhere (see below) — the rest duplicated `backend-ci.yml` / `ci-ai-core.yml`
> / `frontend-ci.yml` / `day13-integration-tests.yml` / `security-scan.yml`.

## Deploy & release

| Workflow | Trigger | Purpose |
|---|---|---|
| `deploy-production.yml` | push to `main`, `workflow_dispatch` | Canary production deploy to GCP Cloud Run: build/test/push images → staging → 10% canary → auto-monitor/rollback → promote to 100% (or skip-canary direct deploy) |
| `staging-smoke.yml` | push to `main`, `workflow_dispatch` | Smoke test against the **already-deployed** staging URL (`STAGING_BACKEND_URL`) — distinct from `day16-smoke-and-probes.yml`, which spins up a local docker-compose stack |
| `ci-cd.yml` | push to `main`/`develop`/tags `v*` | Artillery performance testing (main only) + tagged GitHub release creation. Trimmed down from a former full CI monolith — see note above. |
| `model-retrain.yml` | `workflow_dispatch` | Model retraining pipeline: prepare data → train → validate → update baseline → report |

## Scheduled workers

| Workflow | Trigger | Purpose |
|---|---|---|
| `drift-worker.yml` | cron `*/15 * * * *` | Streaming model drift detection |
| `status-worker.yml` | cron `*/15 * * * *` | Health-check worker, pushes metrics to Prometheus pushgateway |

> Both were widened from `*/5 * * * *` to `*/15 * * * *`. At 5-minute
> intervals the two workers alone run 576 times/day and can burn through the
> entire free-tier 2,000 min/month budget in a couple of days, before any
> push-triggered CI runs at all. Widen further (e.g. hourly) if 15-minute
> freshness isn't actually required by anything downstream.

## Adding a new workflow

Before creating one, check: does an existing workflow already cover this
trigger + concern? If you're adding a security check, it almost certainly
belongs as a job in `security-scan.yml`, not a new file — the summary job
there aggregates results and a new standalone file won't be included in it.
If you're adding a scheduled job, default to the coarsest interval that's
actually useful; cron minutes are the easiest way to blow the free tier.
