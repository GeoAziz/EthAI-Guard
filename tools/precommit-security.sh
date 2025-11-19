#!/usr/bin/env bash
# Pre-commit security & hygiene gate
# Runs lightweight scans before allowing a commit.
# Add by symlinking or copying into .git/hooks/pre-commit:
#   ln -s ../../tools/precommit-security.sh .git/hooks/pre-commit
# Or with pre-commit framework, reference this script as a local hook.

set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

RED="\033[31m"; YEL="\033[33m"; GRN="\033[32m"; NC="\033[0m"
FAILED=0

log() { printf "[precommit-security] %s\n" "$*"; }
warn() { printf "${YEL}[warn]${NC} %s\n" "$*"; }
err() { printf "${RED}[fail]${NC} %s\n" "$*"; }
ok() { printf "${GRN}[ok]${NC} %s\n" "$*"; }

log "Starting security pre-commit checks..."

# 1. Secret scanning (gitleaks)
if command -v gitleaks >/dev/null 2>&1; then
  log "Running gitleaks secret scan (redacted)..."
  if ! gitleaks detect --source . --no-banner --redact --config .gitleaks.toml >/tmp/gitleaks.out 2>&1; then
    err "Gitleaks detected potential secrets; review output (stored in /tmp/gitleaks.out)."
    FAILED=1
  else
    ok "Gitleaks passed"
  fi
else
  warn "gitleaks not installed; skipping secret scan (install: https://github.com/gitleaks/gitleaks)"
fi

# 2. Detect-secrets (optional baseline drift)
if command -v detect-secrets >/dev/null 2>&1; then
  if [ -f .secrets.baseline ]; then
    log "Checking detect-secrets baseline for new findings..."
    if ! detect-secrets scan | detect-secrets audit --diff .secrets.baseline >/dev/null 2>&1; then
      warn "detect-secrets found differences; run: detect-secrets scan > .secrets.baseline"
    else
      ok "detect-secrets baseline unchanged"
    fi
  else
    warn "No .secrets.baseline present; consider generating one (detect-secrets scan > .secrets.baseline)"
  fi
fi

# 3. Node dependency audit (backend + frontend)
run_npm_audit() {
  local dir="$1"; local name="$2";
  if [ -f "$dir/package.json" ]; then
    log "npm audit ($name)"
    pushd "$dir" >/dev/null || return
    if ! npm audit --audit-level=high --no-progress >/tmp/npm_audit_${name}.out 2>&1; then
      err "npm audit high severity issues in $name (see /tmp/npm_audit_${name}.out)"
      FAILED=1
    else
      ok "npm audit clean ($name)"
    fi
    popd >/dev/null || return
  fi
}
run_npm_audit backend backend || true
run_npm_audit frontend frontend || true

# 4. Python dependency audit (pip-audit) for ai_core & backend if requirements.txt
run_pip_audit() {
  local req="$1"; local tag="$2";
  if [ -f "$req" ]; then
    if ! command -v pip-audit >/dev/null 2>&1; then
      warn "pip-audit not installed; installing into current Python environment..."
      python -m pip install --quiet pip-audit || warn "pip-audit install failed"
    fi
    if command -v pip-audit >/dev/null 2>&1; then
      log "pip-audit ($tag)"
      if ! pip-audit -r "$req" >/tmp/pip_audit_${tag}.out 2>&1; then
        err "pip-audit vulnerabilities in $tag (see /tmp/pip_audit_${tag}.out)"
        FAILED=1
      else
        ok "pip-audit clean ($tag)"
      fi
    fi
  fi
}
run_pip_audit ai_core/requirements.txt ai_core || true
run_pip_audit backend/requirements.txt backend || true

# 5. (Optional) Basic grep for TODO security markers
if git diff --cached | grep -E "SECURITY_TODO" >/dev/null 2>&1; then
  warn "Staged changes include SECURITY_TODO markers; consider resolving before commit."
fi

if [ "$FAILED" -ne 0 ]; then
  err "Security pre-commit FAILED; fix issues or bypass with --no-verify (not recommended)."
  exit 1
else
  ok "All configured security checks passed."
fi

exit 0
