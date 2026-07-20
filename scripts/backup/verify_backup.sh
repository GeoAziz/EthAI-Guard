#!/bin/bash
# Backup Restore Verification Script
# Tests that a backup can be restored to a temporary database
# Usage: ./verify_backup.sh <mongo|postgres> <backup_file>

set -euo pipefail

BACKUP_TYPE="${1:-}"
BACKUP_FILE="${2:-}"

if [ -z "${BACKUP_TYPE}" ] || [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <mongo|postgres> <backup_file>"
  echo "  mongo     - Verify MongoDB archive backup"
  echo "  postgres  - Verify PostgreSQL dump backup"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "=== Backup Restore Verification ==="
echo "Type: ${BACKUP_TYPE}"
echo "File: ${BACKUP_FILE}"
echo ""

case "${BACKUP_TYPE}" in
  mongo)
    VERIFY_DB="ethixai_verify_$(date +%s)"
    echo "Restoring to temporary database: ${VERIFY_DB}"

    mongorestore \
      --host="${MONGO_HOST:-localhost}" \
      --port="${MONGO_PORT:-27017}" \
      ${MONGO_USER:+--username="${MONGO_USER}" --password="${MONGO_PASSWORD}" --authenticationDatabase=admin} \
      --db="${VERIFY_DB}" \
      --archive="${BACKUP_FILE}" \
      --gzip \
      --drop

    # Verify collections exist
    COLLECTION_COUNT=$(mongosh \
      --host="${MONGO_HOST:-localhost}" \
      --port="${MONGO_PORT:-27017}" \
      ${MONGO_USER:+--username="${MONGO_USER}" --password="${MONGO_PASSWORD}" --authenticationDatabase=admin} \
      --eval "db.getSiblingDB('${VERIFY_DB}').getCollectionNames().length" \
      --quiet 2>/dev/null)

    DOCUMENT_COUNT=$(mongosh \
      --host="${MONGO_HOST:-localhost}" \
      --port="${MONGO_PORT:-27017}" \
      ${MONGO_USER:+--username="${MONGO_USER}" --password="${MONGO_PASSWORD}" --authenticationDatabase=admin} \
      --eval "db.getSiblingDB('${VERIFY_DB}').aggregate([{\$match:{}}]).toArray().reduce((sum,c)=>sum+Object.values(c).filter(v=>typeof v==='number'&&v>0).length,0)" \
      --quiet 2>/dev/null || echo "0")

    echo ""
    echo "Verification Results:"
    echo "  Collections restored: ${COLLECTION_COUNT}"
    echo "  Documents found: ${DOCUMENT_COUNT}"

    # Cleanup
    echo "Dropping verification database..."
    mongosh \
      --host="${MONGO_HOST:-localhost}" \
      --port="${MONGO_PORT:-27017}" \
      ${MONGO_USER:+--username="${MONGO_USER}" --password="${MONGO_PASSWORD}" --authenticationDatabase=admin} \
      --eval "db.getSiblingDB('${VERIFY_DB}').dropDatabase()" \
      --quiet 2>/dev/null

    if [ "${COLLECTION_COUNT}" -gt 0 ]; then
      echo "✅ MongoDB backup verification PASSED"
    else
      echo "❌ MongoDB backup verification FAILED - no collections found"
      exit 1
    fi
    ;;

  postgres)
    VERIFY_DB="ethixai_verify_$(date +%s)"
    export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

    echo "Creating temporary database: ${VERIFY_DB}"
    psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" -d postgres -c "CREATE DATABASE ${VERIFY_DB};" 2>/dev/null

    echo "Restoring backup..."
    pg_restore \
      -h "${POSTGRES_HOST:-localhost}" \
      -p "${POSTGRES_PORT:-5432}" \
      -U "${POSTGRES_USER:-postgres}" \
      -d "${VERIFY_DB}" \
      --no-owner \
      --no-privileges \
      "${BACKUP_FILE}" 2>/dev/null || true

    # Verify tables exist
    TABLE_COUNT=$(psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" -d "${VERIFY_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

    echo ""
    echo "Verification Results:"
    echo "  Tables restored: ${TABLE_COUNT}"

    # Cleanup
    echo "Dropping verification database..."
    psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" -d postgres -c "DROP DATABASE IF EXISTS ${VERIFY_DB};" 2>/dev/null

    unset PGPASSWORD

    if [ "${TABLE_COUNT}" -gt 0 ]; then
      echo "✅ PostgreSQL backup verification PASSED"
    else
      echo "❌ PostgreSQL backup verification FAILED - no tables found"
      exit 1
    fi
    ;;

  *)
    echo "ERROR: Unknown backup type '${BACKUP_TYPE}'. Use 'mongo' or 'postgres'."
    exit 1
    ;;
esac
