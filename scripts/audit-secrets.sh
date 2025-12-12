#!/usr/bin/env bash
################################################################################
# Secret Audit Script for EthixAI-Guard
#
# Audits secret configurations, rotation status, and compliance
# 
# Usage:
#   ./scripts/audit-secrets.sh [options]
#
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OUTPUT_FILE="/tmp/secret-audit-$(date +%Y%m%d_%H%M%S).json"

# Logging
log() { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; }

# Banner
cat <<'EOF'
╔════════════════════════════════════════════════════════════╗
║          EthixAI-Guard Secret Audit Tool                  ║
╚════════════════════════════════════════════════════════════╝
EOF

# Initialize audit results
AUDIT_RESULTS='{
  "timestamp": "'$(date -Iseconds)'",
  "repository": "EthixAI-Guard",
  "checks": [],
  "summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "warnings": 0
  }
}'

add_check_result() {
    local name="$1"
    local status="$2"  # pass, fail, warn
    local message="$3"
    local details="${4:-}"
    
    AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq \
        --arg name "$name" \
        --arg status "$status" \
        --arg message "$message" \
        --arg details "$details" \
        '.checks += [{
            "name": $name,
            "status": $status,
            "message": $message,
            "details": $details
        }] | .summary.total += 1')
    
    case "$status" in
        pass)
            AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq '.summary.passed += 1')
            success "$name: $message"
            ;;
        fail)
            AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq '.summary.failed += 1')
            error "$name: $message"
            ;;
        warn)
            AUDIT_RESULTS=$(echo "$AUDIT_RESULTS" | jq '.summary.warnings += 1')
            warn "$name: $message"
            ;;
    esac
}

log "Starting secret audit..."
log ""

# Check 1: Gitleaks configuration exists
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Check 1: Gitleaks Configuration"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -f "$REPO_ROOT/.gitleaks.toml" ]]; then
    add_check_result \
        "gitleaks_config" \
        "pass" \
        "Gitleaks configuration file exists"
    
    # Check for custom rules
    if grep -q "ethixai" "$REPO_ROOT/.gitleaks.toml" 2>/dev/null; then
        add_check_result \
            "gitleaks_custom_rules" \
            "pass" \
            "Custom EthixAI rules configured"
    else
        add_check_result \
            "gitleaks_custom_rules" \
            "warn" \
            "No custom EthixAI rules found"
    fi
else
    add_check_result \
        "gitleaks_config" \
        "fail" \
        "Gitleaks configuration file missing"
fi

# Check 2: Pre-commit hooks
log ""
log "Check 2: Pre-commit Hooks"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -f "$REPO_ROOT/.pre-commit-config.yaml" ]]; then
    add_check_result \
        "precommit_config" \
        "pass" \
        "Pre-commit configuration exists"
    
    # Check if gitleaks or detect-secrets is configured
    if grep -q "gitleaks\|detect-secrets" "$REPO_ROOT/.pre-commit-config.yaml"; then
        add_check_result \
            "precommit_secrets_hook" \
            "pass" \
            "Secret scanning hooks configured"
    else
        add_check_result \
            "precommit_secrets_hook" \
            "warn" \
            "No secret scanning hooks in pre-commit"
    fi
else
    add_check_result \
        "precommit_config" \
        "warn" \
        "Pre-commit configuration not found"
fi

# Check 3: CI/CD secret scanning
log ""
log "Check 3: CI/CD Secret Scanning"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -f "$REPO_ROOT/.github/workflows/secret-scan.yml" ]]; then
    add_check_result \
        "cicd_secret_scan" \
        "pass" \
        "Secret scanning workflow exists"
    
    # Check if it runs on push and PR
    if grep -q "on:" "$REPO_ROOT/.github/workflows/secret-scan.yml" && \
       grep -q "push:\|pull_request:" "$REPO_ROOT/.github/workflows/secret-scan.yml"; then
        add_check_result \
            "cicd_scan_triggers" \
            "pass" \
            "Secret scan runs on push/PR"
    else
        add_check_result \
            "cicd_scan_triggers" \
            "warn" \
            "Secret scan triggers may not be optimal"
    fi
else
    add_check_result \
        "cicd_secret_scan" \
        "fail" \
        "No CI/CD secret scanning workflow found"
fi

# Check 4: Secrets in repository scan
log ""
log "Check 4: Scanning for Secrets in Repository"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v gitleaks >/dev/null 2>&1; then
    cd "$REPO_ROOT"
    
    if gitleaks detect --source . --config .gitleaks.toml --no-banner --redact -v 2>/dev/null; then
        add_check_result \
            "repo_secret_scan" \
            "pass" \
            "No secrets detected in repository"
    else
        add_check_result \
            "repo_secret_scan" \
            "fail" \
            "Potential secrets detected (review required)"
    fi
else
    add_check_result \
        "repo_secret_scan" \
        "warn" \
        "Gitleaks not installed, skipping scan"
fi

# Check 5: Sensitive files
log ""
log "Check 5: Checking for Sensitive Files"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SENSITIVE_FILES=(
    ".env"
    "serviceAccountKey.json"
    "credentials.json"
    "private.key"
    "id_rsa"
    "id_rsa.pub"
    ".pem"
    ".p12"
)

FOUND_SENSITIVE=0
for file in "${SENSITIVE_FILES[@]}"; do
    if git ls-files | grep -q "$file" 2>/dev/null; then
        error "Sensitive file in git: $file"
        ((FOUND_SENSITIVE++))
    fi
done

if [[ $FOUND_SENSITIVE -eq 0 ]]; then
    add_check_result \
        "sensitive_files" \
        "pass" \
        "No sensitive files tracked in git"
else
    add_check_result \
        "sensitive_files" \
        "fail" \
        "$FOUND_SENSITIVE sensitive file(s) found in repository"
fi

# Check 6: .gitignore coverage
log ""
log "Check 6: .gitignore Coverage"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -f "$REPO_ROOT/.gitignore" ]]; then
    IGNORE_PATTERNS=(
        "\.env"
        "serviceAccountKey\.json"
        "credentials"
        "\.pem"
        "private.*key"
    )
    
    MISSING_PATTERNS=0
    for pattern in "${IGNORE_PATTERNS[@]}"; do
        if ! grep -qE "$pattern" "$REPO_ROOT/.gitignore"; then
            warn "Missing .gitignore pattern: $pattern"
            ((MISSING_PATTERNS++))
        fi
    done
    
    if [[ $MISSING_PATTERNS -eq 0 ]]; then
        add_check_result \
            "gitignore_coverage" \
            "pass" \
            "All sensitive patterns in .gitignore"
    else
        add_check_result \
            "gitignore_coverage" \
            "warn" \
            "$MISSING_PATTERNS pattern(s) missing from .gitignore"
    fi
else
    add_check_result \
        "gitignore_coverage" \
        "fail" \
        ".gitignore file not found"
fi

# Check 7: Environment file templates
log ""
log "Check 7: Environment File Templates"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -f "$REPO_ROOT/.env.example" ]]; then
    add_check_result \
        "env_template" \
        "pass" \
        "Environment template file exists"
    
    # Check that .env.example doesn't contain real secrets
    if grep -qE "AKIA[A-Z0-9]{16}|sk-[a-zA-Z0-9]{48}|0x[a-fA-F0-9]{64}" "$REPO_ROOT/.env.example" 2>/dev/null; then
        add_check_result \
            "env_template_clean" \
            "fail" \
            "Real secrets found in .env.example"
    else
        add_check_result \
            "env_template_clean" \
            "pass" \
            ".env.example appears clean"
    fi
else
    add_check_result \
        "env_template" \
        "warn" \
        "No .env.example file found"
fi

# Check 8: Documentation
log ""
log "Check 8: Secrets Management Documentation"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -f "$REPO_ROOT/docs/SECRETS_MANAGEMENT.md" ]]; then
    add_check_result \
        "documentation" \
        "pass" \
        "Secrets management documentation exists"
else
    add_check_result \
        "documentation" \
        "warn" \
        "No secrets management documentation found"
fi

# Check 9: Secret rotation scripts
log ""
log "Check 9: Secret Rotation Automation"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -x "$REPO_ROOT/scripts/rotate-secrets.sh" ]]; then
    add_check_result \
        "rotation_script" \
        "pass" \
        "Secret rotation script exists and is executable"
else
    if [[ -f "$REPO_ROOT/scripts/rotate-secrets.sh" ]]; then
        add_check_result \
            "rotation_script" \
            "warn" \
            "Rotation script exists but not executable"
    else
        add_check_result \
            "rotation_script" \
            "warn" \
            "No rotation script found"
    fi
fi

# Check 10: Docker secrets configuration
log ""
log "Check 10: Docker Secrets Configuration"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -f "$REPO_ROOT/docker-compose.yml" ]] || [[ -f "$REPO_ROOT/docker-compose.prod.yml" ]]; then
    if grep -q "secrets:" "$REPO_ROOT/docker-compose"*.yml 2>/dev/null; then
        add_check_result \
            "docker_secrets" \
            "pass" \
            "Docker secrets configuration found"
    else
        add_check_result \
            "docker_secrets" \
            "warn" \
            "No Docker secrets configuration (using env vars)"
    fi
fi

# Generate final summary
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Audit Summary"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL=$(echo "$AUDIT_RESULTS" | jq '.summary.total')
PASSED=$(echo "$AUDIT_RESULTS" | jq '.summary.passed')
FAILED=$(echo "$AUDIT_RESULTS" | jq '.summary.failed')
WARNINGS=$(echo "$AUDIT_RESULTS" | jq '.summary.warnings')

log ""
success "Passed:   $PASSED/$TOTAL"
if [[ $WARNINGS -gt 0 ]]; then
    warn "Warnings: $WARNINGS/$TOTAL"
fi
if [[ $FAILED -gt 0 ]]; then
    error "Failed:   $FAILED/$TOTAL"
fi

# Calculate score
SCORE=$(( (PASSED * 100) / TOTAL ))

log ""
if [[ $SCORE -ge 90 ]]; then
    success "Overall Score: $SCORE% - EXCELLENT"
elif [[ $SCORE -ge 75 ]]; then
    success "Overall Score: $SCORE% - GOOD"
elif [[ $SCORE -ge 60 ]]; then
    warn "Overall Score: $SCORE% - FAIR (Improvement needed)"
else
    error "Overall Score: $SCORE% - POOR (Action required)"
fi

# Save results
echo "$AUDIT_RESULTS" > "$OUTPUT_FILE"
log ""
log "Detailed results saved to: $OUTPUT_FILE"

# Recommendations
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Recommendations"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $FAILED -gt 0 ]]; then
    log "❗ Critical Issues:"
    echo "$AUDIT_RESULTS" | jq -r '.checks[] | select(.status=="fail") | "  - \(.name): \(.message)"'
    log ""
fi

if [[ $WARNINGS -gt 0 ]]; then
    log "⚠️  Warnings:"
    echo "$AUDIT_RESULTS" | jq -r '.checks[] | select(.status=="warn") | "  - \(.name): \(.message)"'
    log ""
fi

log "Next Steps:"
log "  1. Review and address any failed checks"
log "  2. Consider addressing warnings"
log "  3. Document any exceptions/waivers"
log "  4. Schedule next audit (recommended: monthly)"
log ""

# Exit code based on failures
if [[ $FAILED -gt 0 ]]; then
    exit 1
else
    exit 0
fi
