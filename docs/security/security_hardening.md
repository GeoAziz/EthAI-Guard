# Security Hardening (Day 28)

This document summarizes production security measures added to the backend and CI pipelines.

## Backend API (Express)

- HTTP headers and protections
  - helmet enabled with conservative defaults and CSP (disable with `DISABLE_CSP=1` if needed)
  - disable `x-powered-by`, optional `TRUST_PROXY=1` when behind a reverse proxy
  - CORS restricted to `ALLOWED_ORIGINS` (comma-separated list). Non-browser tools (no Origin) are allowed.
  - `hpp` to prevent HTTP parameter pollution
  - `express-mongo-sanitize` to strip MongoDB operators from inputs
  - `xss-clean` to sanitize untrusted input
  - response `compression` enabled
- Rate limiters
  - Global limiter (configurable via `RATE_WINDOW_MS`, `RATE_MAX`)
  - Login-specific limiter (5m window, max 10 attempts)
- AuthN/AuthZ
  - Firebase auth supported when `AUTH_PROVIDER=firebase` (auto-provisions users)
  - JWT fallback auth when Firebase is not configured
  - RBAC helper and checks
    - Admin-only routes: model retrain trigger, retrain status, model promotion
    - Owner-or-admin required for listing user reports
- Sessions & tokens
  - Short-lived access tokens (15m)
  - Refresh tokens are stored hashed (Argon2) with rotation, revocation, and device metadata
  - Optional cookie-based refresh token (`USE_COOKIE_REFRESH=1`)

## Environment variables (new or relevant)

- `ALLOWED_ORIGINS` – CSV of allowed origins for CORS
- `DISABLE_CSP` – set to `1` to disable CSP if you terminate headers elsewhere
- `TRUST_PROXY` – set to `1` when behind a trusted reverse proxy to honor `X-Forwarded-*`
- `RATE_WINDOW_MS`, `RATE_MAX` – global rate limiter
- `USE_COOKIE_REFRESH` – set to `1` to set refresh tokens as HttpOnly cookies

## CI/CD Security Gates

- CodeQL analysis for JavaScript and Python
- Dependency audits:
  - `npm audit --audit-level=high` for frontend and backend
  - `pip-audit` for `ai_core` (and backend if `requirements.txt` exists)
- Secret scanning via Gitleaks with SARIF upload to code scanning

## Notes

- Tune CSP and CORS per your deployment (reverse proxies, SSO, subdomains)
- RBAC is currently role-equals check (admin/user). Expand to role sets or permissions if needed.
- Some scanners may produce findings on transient vulnerabilities; triage and pin/update versions where possible.

## Run security checks locally

Use these commands to run the same checks locally.

```bash
# Node dependency audits
cd backend && npm audit --audit-level=high || true
cd ../frontend && npm audit --audit-level=high || true

# Python dependency audits
pipx install pip-audit || python -m pip install pip-audit
cd ai_core && pip-audit -r requirements.txt || true

# Secret scanning with gitleaks (uses .gitleaks.toml)
gitleaks detect --source . --no-banner --redact --config .gitleaks.toml
```

## AI Core API (FastAPI) hardening

- CORS restricted via `AI_CORE_ALLOWED_ORIGINS` (CSV). Default allows all in dev.
- Trusted hosts via `AI_CORE_TRUSTED_HOSTS` (CSV of hostnames) in production.
- Optional HTTPS redirect with `AI_CORE_REQUIRE_HTTPS=1`.
- Adds common security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy).

## Developer pre-commit security hook

To catch issues early, you can enable the repo's lightweight security gate script before each commit.

### Script location

`tools/precommit-security.sh` runs:

- Gitleaks secret scan (uses `.gitleaks.toml`)
- Optional detect-secrets baseline drift check (if `.secrets.baseline` exists)
- `npm audit --audit-level=high` in `backend` and `frontend`
- `pip-audit` for Python dependencies (`ai_core` and backend if `requirements.txt` present)
- Warns about staged `SECURITY_TODO` markers

### Quick enable (Git hook)

```bash
ln -s ../../tools/precommit-security.sh .git/hooks/pre-commit  # from repo root
chmod +x tools/precommit-security.sh
```

If symlinks are problematic (Windows), copy instead:

```bash
cp tools/precommit-security.sh .git/hooks/pre-commit
```

### Using with pre-commit framework (optional)

Add to `.pre-commit-config.yaml` as a local hook:

```yaml
repos:
  - repo: local
    hooks:
      - id: security-gate
        name: security gate (gitleaks + audits)
        entry: tools/precommit-security.sh
        language: system
        pass_filenames: false
```

Then run:

```bash
pre-commit install
```

### Bypassing (not recommended)

You can bypass with `git commit --no-verify`, but only do this for emergency commits; fix findings promptly.

### Exit codes

The hook exits non-zero if any high severity dependency vulnerabilities or potential secrets are detected, blocking the commit.

