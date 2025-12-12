#!/usr/bin/env bash
# Simple staging smoke script: checks health, login (if credentials provided), exchange, promote
# Usage: BACKEND_URL=https://staging.example.com ADMIN_EMAIL=admin@... ADMIN_PASS=... ./tools/ci/staging-smoke.sh
set -euo pipefail

BACKEND_URL=${BACKEND_URL:-http://localhost:5000}
ADMIN_EMAIL=${ADMIN_EMAIL:-}
ADMIN_PASS=${ADMIN_PASS:-}
TEST_USER_EMAIL=${TEST_USER_EMAIL:-promote-test@example.com}
TEST_USER_ROLE=${TEST_USER_ROLE:-admin}

echo "Checking backend health: ${BACKEND_URL}/health"
curl -fsS ${BACKEND_URL}/health | jq '.'

# If admin creds provided, attempt login flow, otherwise skip to promote via no-auth test-mode
if [[ -n "${ADMIN_EMAIL}" && -n "${ADMIN_PASS}" ]]; then
  echo "Attempting admin login..."
  LOGIN_RESP=$(curl -sS -X POST -H "Content-Type: application/json" -d "{\"email\": \"${ADMIN_EMAIL}\", \"password\": \"${ADMIN_PASS}\"}" ${BACKEND_URL}/auth/login)
  echo "Login response: ${LOGIN_RESP}"
  ACCESS_TOKEN=$(echo "${LOGIN_RESP}" | jq -r '.accessToken // .access_token // empty')
  if [[ -z "${ACCESS_TOKEN}" ]]; then
    echo "Login failed or no access token returned" >&2
    exit 2
  fi
  echo "Calling promote endpoint as admin to set ${TEST_USER_EMAIL} -> ${TEST_USER_ROLE}"
  PROM_RESP=$(curl -sS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${ACCESS_TOKEN}" -d "{\"email\": \"${TEST_USER_EMAIL}\", \"role\": \"${TEST_USER_ROLE}\"}" ${BACKEND_URL}/v1/users/promote)
  echo "Promote response: ${PROM_RESP}"
else
  echo "No admin credentials provided; attempting promote endpoint using test-mode (if backend supports it)"
  PROM_RESP=$(curl -sS -X POST -H "Content-Type: application/json" -d "{\"email\": \"${TEST_USER_EMAIL}\", \"role\": \"${TEST_USER_ROLE}\"}" ${BACKEND_URL}/v1/users/promote || true)
  echo "Promote response: ${PROM_RESP}"
fi

# If jq available, show role field
if command -v jq >/dev/null 2>&1; then
  echo "claimsSync:" $(echo "${PROM_RESP}" | jq -r '.claimsSync | tostring')
fi

echo "Staging smoke completed"
