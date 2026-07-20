#!/bin/bash
# Runs automatically by the official postgres image on first container init
# (empty data directory only). Provisions the low-privilege ethixai_app role
# that FORCE ROW LEVEL SECURITY actually restricts (superusers/table owners
# bypass RLS), then applies the tenancy/billing schema migrations so the
# stack is tenant-isolated out of the box with `docker compose up`.
set -euo pipefail

APP_USER="${POSTGRES_APP_USER:-ethixai_app}"

if [ -z "${POSTGRES_APP_PASSWORD:-}" ]; then
  echo "[postgres-init] POSTGRES_APP_PASSWORD not set; skipping ethixai_app role provisioning." >&2
  exit 0
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_USER}') THEN
      CREATE ROLE ${APP_USER} LOGIN PASSWORD '${POSTGRES_APP_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    ELSE
      ALTER ROLE ${APP_USER} WITH LOGIN PASSWORD '${POSTGRES_APP_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
  END
  \$\$;
  GRANT CONNECT ON DATABASE "${POSTGRES_DB}" TO ${APP_USER};
EOSQL

for f in /docker-entrypoint-initdb.d/migrations/*.sql; do
  echo "[postgres-init] Applying $(basename "$f")..."
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
done

echo "[postgres-init] Tenancy/billing schema + ${APP_USER} role ready."
