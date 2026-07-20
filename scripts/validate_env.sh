#!/bin/bash
# Environment Variable Validation Script for EthixAI
# Usage: ./validate_env.sh [environment]
#
# Checks that all required environment variables are set and non-placeholder.
# Exit code 0 = all checks passed, 1 = validation failed.

set -euo pipefail

ENVIRONMENT="${1:-production}"
ERRORS=0
WARNINGS=0

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

error() {
  echo -e "${RED}❌ ERROR:${NC} $1"
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo -e "${YELLOW}⚠️  WARN:${NC} $1"
  WARNINGS=$((WARNINGS + 1))
}

ok() {
  echo -e "${GREEN}✅ OK:${NC} $1"
}

check_required() {
  local var_name="$1"
  local var_value="${!var_name:-}"

  if [ -z "${var_value}" ]; then
    error "${var_name} is not set"
    return 1
  fi

  if echo "${var_value}" | grep -qi "PLACEHOLDER\|CHANGE_ME\|YOUR_.*_HERE\|example\.com"; then
    error "${var_name} contains placeholder value: ${var_value}"
    return 1
  fi

  ok "${var_name} is set"
  return 0
}

check_optional() {
  local var_name="$1"
  local var_value="${!var_name:-}"

  if [ -z "${var_value}" ]; then
    warn "${var_name} is not set (optional)"
    return 0
  fi

  if echo "${var_value}" | grep -qi "PLACEHOLDER\|CHANGE_ME"; then
    warn "${var_name} contains placeholder value"
    return 0
  fi

  ok "${var_name} is set"
  return 0
}

check_min_length() {
  local var_name="$1"
  local min_len="$2"
  local var_value="${!var_name:-}"

  if [ -z "${var_value}" ]; then
    return 0  # Already caught by check_required
  fi

  if [ ${#var_value} -lt ${min_len} ]; then
    error "${var_name} is too short (${#var_value} chars, minimum ${min_len})"
    return 1
  fi

  ok "${var_name} meets minimum length (${#var_value} chars)"
  return 0
}

echo "============================================"
echo "  EthixAI Environment Validation"
echo "  Environment: ${ENVIRONMENT}"
echo "============================================"
echo ""

# =========================
# DATABASE
# =========================
echo "--- Database Configuration ---"
check_required "MONGO_URL"
check_required "POSTGRES_URL"
check_required "POSTGRES_APP_USER"
check_required "POSTGRES_APP_PASSWORD"
check_required "POSTGRES_APP_URL"
check_required "REDIS_URL"
echo ""

# =========================
# AUTHENTICATION
# =========================
echo "--- Authentication & Security ---"
check_required "SECRET_KEY"
check_min_length "SECRET_KEY" 32
check_required "REFRESH_SECRET"
check_min_length "REFRESH_SECRET" 32
check_required "SESSION_SECRET"
check_min_length "SESSION_SECRET" 32
check_optional "GOOGLE_APPLICATION_CREDENTIALS"
echo ""

# =========================
# AI CORE
# =========================
echo "--- AI Core ---"
check_required "AI_CORE_URL"
echo ""

# =========================
# FRONTEND
# =========================
echo "--- Frontend ---"
check_required "NEXT_PUBLIC_API_URL"
echo ""

# =========================
# PRODUCTION ONLY
# =========================
if [ "${ENVIRONMENT}" = "production" ]; then
  echo "--- Production-Specific ---"
  check_required "JWT_SECRET"
  check_min_length "JWT_SECRET" 32
  check_required "JWT_REFRESH_SECRET"
  check_min_length "JWT_REFRESH_SECRET" 32
  check_required "CORS_ORIGIN"

  # Stripe (required for payments)
  check_required "STRIPE_SECRET_KEY"
  check_required "STRIPE_PUBLISHABLE_KEY"
  check_required "STRIPE_WEBHOOK_SECRET"

  # MongoDB auth
  check_required "MONGO_ROOT_USER"
  check_required "MONGO_ROOT_PASSWORD"

  # Postgres
  check_required "POSTGRES_PASSWORD"

  # Grafana
  check_required "GRAFANA_ADMIN_PASSWORD"

  # Monitoring
  check_optional "SLACK_WEBHOOK_URL"

  # Firebase
  check_optional "GOOGLE_APPLICATION_CREDENTIALS"
  echo ""
fi

# =========================
# SECURITY CHECKS
# =========================
echo "--- Security Checks ---"

# Check for weak/default passwords
if [ "${POSTGRES_PASSWORD:-}" = "postgres" ]; then
  warn "POSTGRES_PASSWORD is the default 'postgres' value"
fi

if [ "${GRAFANA_ADMIN_PASSWORD:-}" = "admin" ] && [ "${ENVIRONMENT}" = "production" ]; then
  warn "GRAFANA_ADMIN_PASSWORD is 'admin' in production"
fi

# Check CORS
if [ "${CORS_ORIGIN:-}" = "*" ] && [ "${ENVIRONMENT}" = "production" ]; then
  warn "CORS_ORIGIN is '*' in production — restrict to your domain"
fi

# Check for secrets in .env file that shouldn't be committed
if [ -f ".env" ]; then
  if git ls-files --error-unmatch .env 2>/dev/null; then
    error ".env file is tracked by git — add it to .gitignore immediately"
  fi
fi

echo ""

# =========================
# SUMMARY
# =========================
echo "============================================"
echo "  Validation Summary"
echo "============================================"
echo -e "  Errors:   ${RED}${ERRORS}${NC}"
echo -e "  Warnings: ${YELLOW}${WARNINGS}${NC}"
echo ""

if [ "${ERRORS}" -gt 0 ]; then
  echo -e "${RED}❌ Validation FAILED — fix ${ERRORS} error(s) before deploying${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Validation PASSED${NC}"
  if [ "${WARNINGS}" -gt 0 ]; then
    echo -e "${YELLOW}   (${WARNINGS} warning(s) — review recommended)${NC}"
  fi
  exit 0
fi
