#!/bin/bash
# MongoDB Backup Script for EthixAI
# Usage: ./mongo_backup.sh [backup_dir] [retention_days]
#
# Environment variables:
#   MONGO_HOST     - MongoDB host (default: localhost)
#   MONGO_PORT     - MongoDB port (default: 27017)
#   MONGO_USER     - MongoDB username (optional)
#   MONGO_PASSWORD - MongoDB password (optional)
#   MONGO_DB       - Database name (default: ethixai)

set -euo pipefail

BACKUP_DIR="${1:-/backups/mongo}"
RETENTION_DAYS="${2:-30}"
MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-ethixai}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${MONGO_DB}_${TIMESTAMP}"

echo "=== MongoDB Backup ==="
echo "Host: ${MONGO_HOST}:${MONGO_PORT}"
echo "Database: ${MONGO_DB}"
echo "Backup dir: ${BACKUP_DIR}"
echo "Retention: ${RETENTION_DAYS} days"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Build auth args
AUTH_ARGS=""
if [ -n "${MONGO_USER:-}" ] && [ -n "${MONGO_PASSWORD:-}" ]; then
  AUTH_ARGS="--username=${MONGO_USER} --password=${MONGO_PASSWORD} --authenticationDatabase=admin"
fi

# Run mongodump
echo "Starting mongodump..."
mongodump \
  --host="${MONGO_HOST}" \
  --port="${MONGO_PORT}" \
  --db="${MONGO_DB}" \
  ${AUTH_ARGS} \
  --archive="${BACKUP_DIR}/${BACKUP_NAME}.archive" \
  --gzip \
  --oplog

echo "Backup created: ${BACKUP_DIR}/${BACKUP_NAME}.archive"

# Verify backup size
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}.archive" | cut -f1)
echo "Backup size: ${BACKUP_SIZE}"

if [ "$(stat -f%z "${BACKUP_DIR}/${BACKUP_NAME}.archive" 2>/dev/null || stat -c%s "${BACKUP_DIR}/${BACKUP_NAME}.archive" 2>/dev/null)" -lt 1024 ]; then
  echo "ERROR: Backup file is suspiciously small (< 1KB). Aborting."
  exit 1
fi

# Rotate old backups
echo "Rotating backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "${MONGO_DB}_*.archive" -mtime +${RETENTION_DAYS} -delete -print | \
  while read -r f; do echo "  Deleted: $(basename "$f")"; done

# Summary
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "${MONGO_DB}_*.archive" | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo ""
echo "=== Backup Complete ==="
echo "Total backups: ${TOTAL_BACKUPS}"
echo "Total size: ${TOTAL_SIZE}"
echo "Latest: ${BACKUP_NAME}.archive"
