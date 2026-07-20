#!/bin/bash
# PostgreSQL Backup Script for EthixAI
# Usage: ./postgres_backup.sh [backup_dir] [retention_days]
#
# Environment variables:
#   POSTGRES_HOST     - PostgreSQL host (default: localhost)
#   POSTGRES_PORT     - PostgreSQL port (default: 5432)
#   POSTGRES_USER     - PostgreSQL superuser (default: postgres)
#   POSTGRES_PASSWORD - PostgreSQL password
#   POSTGRES_DB       - Database name (default: ethixai)

set -euo pipefail

BACKUP_DIR="${1:-/backups/postgres}"
RETENTION_DAYS="${2:-30}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-ethixai}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${POSTGRES_DB}_${TIMESTAMP}"

echo "=== PostgreSQL Backup ==="
echo "Host: ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "Database: ${POSTGRES_DB}"
echo "Backup dir: ${BACKUP_DIR}"
echo "Retention: ${RETENTION_DAYS} days"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Set password for psql
export PGPASSWORD="${POSTGRES_PASSWORD}"

# Check connection
echo "Verifying database connection..."
pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" || {
  echo "ERROR: Cannot connect to PostgreSQL"
  exit 1
}

# Run pg_dump
echo "Starting pg_dump..."
pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=custom \
  --compress=9 \
  --verbose \
  -f "${BACKUP_DIR}/${BACKUP_NAME}.dump" \
  2>&1

echo "Backup created: ${BACKUP_DIR}/${BACKUP_NAME}.dump"

# Verify backup
BACKUP_SIZE=$(stat -c%s "${BACKUP_DIR}/${BACKUP_NAME}.dump" 2>/dev/null || stat -f%z "${BACKUP_DIR}/${BACKUP_NAME}.dump" 2>/dev/null)
echo "Backup size: $(( BACKUP_SIZE / 1024 / 1024 ))MB"

if [ "${BACKUP_SIZE}" -lt 1024 ]; then
  echo "ERROR: Backup file is suspiciously small (< 1KB). Aborting."
  exit 1
fi

# Also create a plain SQL backup for disaster recovery (human-readable)
echo "Creating plain SQL backup for DR..."
pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=plain \
  -f "${BACKUP_DIR}/${BACKUP_NAME}.sql" \
  2>&1

# Rotate old backups
echo "Rotating backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" \( -name "${POSTGRES_DB}_*.dump" -o -name "${POSTGRES_DB}_*.sql" \) -mtime +${RETENTION_DAYS} -delete -print | \
  while read -r f; do echo "  Deleted: $(basename "$f")"; done

# Summary
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "${POSTGRES_DB}_*.dump" | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo ""
echo "=== Backup Complete ==="
echo "Total backups: ${TOTAL_BACKUPS}"
echo "Total size: ${TOTAL_SIZE}"
echo "Latest dump: ${BACKUP_NAME}.dump"
echo "Latest SQL: ${BACKUP_NAME}.sql"

unset PGPASSWORD
