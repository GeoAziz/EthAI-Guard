#!/bin/bash
# Full Backup Script for EthixAI
# Runs MongoDB + PostgreSQL backups and verifies them
# Usage: ./backup_all.sh [backup_base_dir] [retention_days]
#
# Environment variables (all optional, have defaults):
#   MONGO_HOST, MONGO_PORT, MONGO_USER, MONGO_PASSWORD, MONGO_DB
#   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
#   BACKUP_S3_BUCKET - If set, upload backups to S3/GCS
#   SLACK_WEBHOOK_URL - If set, send backup notifications

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_BASE="${1:-/backups}"
RETENTION_DAYS="${2:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${BACKUP_BASE}/backup_${TIMESTAMP}.log"

mkdir -p "${BACKUP_BASE}"

exec > >(tee -a "${LOG_FILE}") 2>&1

echo "============================================"
echo "  EthixAI Full Backup - ${TIMESTAMP}"
echo "============================================"
echo ""

ERRORS=0

# MongoDB Backup
echo "--- MongoDB Backup ---"
if bash "${SCRIPT_DIR}/mongo_backup.sh" "${BACKUP_BASE}/mongo" "${RETENTION_DAYS}"; then
  echo "✅ MongoDB backup completed successfully"
else
  echo "❌ MongoDB backup FAILED"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# PostgreSQL Backup
echo "--- PostgreSQL Backup ---"
if bash "${SCRIPT_DIR}/postgres_backup.sh" "${BACKUP_BASE}/postgres" "${RETENTION_DAYS}"; then
  echo "✅ PostgreSQL backup completed successfully"
else
  echo "❌ PostgreSQL backup FAILED"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Verify backups (optional — requires running databases)
if [ "${VERIFY_BACKUPS:-0}" = "1" ]; then
  echo "--- Backup Verification ---"

  LATEST_MONGO=$(ls -t "${BACKUP_BASE}/mongo/"*.archive 2>/dev/null | head -1)
  if [ -n "${LATEST_MONGO}" ]; then
    bash "${SCRIPT_DIR}/verify_backup.sh" mongo "${LATEST_MONGO}" || ERRORS=$((ERRORS + 1))
  fi

  LATEST_PG=$(ls -t "${BACKUP_BASE}/postgres/"*.dump 2>/dev/null | head -1)
  if [ -n "${LATEST_PG}" ]; then
    bash "${SCRIPT_DIR}/verify_backup.sh" postgres "${LATEST_PG}" || ERRORS=$((ERRORS + 1))
  fi
  echo ""
fi

# Upload to S3/GCS (optional)
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  echo "--- S3 Upload ---"
  if command -v aws &>/dev/null; then
    aws s3 sync "${BACKUP_BASE}/mongo/" "s3://${BACKUP_S3_BUCKET}/mongo/" --storage-class STANDARD_IA
    aws s3 sync "${BACKUP_BASE}/postgres/" "s3://${BACKUP_S3_BUCKET}/postgres/" --storage-class STANDARD_IA
    echo "✅ Backups uploaded to s3://${BACKUP_S3_BUCKET}"
  elif command -v gsutil &>/dev/null; then
    gsutil -m rsync -r "${BACKUP_BASE}/mongo/" "gs://${BACKUP_S3_BUCKET}/mongo/"
    gsutil -m rsync -r "${BACKUP_BASE}/postgres/" "gs://${BACKUP_S3_BUCKET}/postgres/"
    echo "✅ Backups uploaded to gs://${BACKUP_S3_BUCKET}"
  else
    echo "⚠️  No cloud CLI found (aws/gsutil). Skipping upload."
  fi
  echo ""
fi

# Disk usage summary
echo "--- Disk Usage ---"
echo "MongoDB backups:  $(du -sh "${BACKUP_BASE}/mongo" 2>/dev/null | cut -f1 || echo '0')"
echo "Postgres backups: $(du -sh "${BACKUP_BASE}/postgres" 2>/dev/null | cut -f1 || echo '0')"
echo "Log file:         ${LOG_FILE}"
echo ""

# Send Slack notification (optional)
if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
  STATUS="✅ SUCCESS"
  if [ "${ERRORS}" -gt 0 ]; then
    STATUS="❌ FAILED (${ERRORS} errors)"
  fi

  curl -s -X POST "${SLACK_WEBHOOK_URL}" \
    -H 'Content-Type: application/json' \
    -d "{
      \"text\": \"*EthixAI Backup Report*\nStatus: ${STATUS}\nTimestamp: ${TIMESTAMP}\nMongoDB: $(du -sh "${BACKUP_BASE}/mongo" 2>/dev/null | cut -f1 || echo '0')\nPostgres: $(du -sh "${BACKUP_BASE}/postgres" 2>/dev/null | cut -f1 || echo '0')\nRetention: ${RETENTION_DAYS} days\"
    }" > /dev/null 2>&1 || echo "Warning: Failed to send Slack notification"
fi

echo "============================================"
if [ "${ERRORS}" -gt 0 ]; then
  echo "  ❌ Backup completed with ${ERRORS} error(s)"
  exit 1
else
  echo "  ✅ All backups completed successfully"
fi
echo "============================================"
