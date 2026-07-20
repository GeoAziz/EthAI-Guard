#!/usr/bin/env node
/* eslint-disable no-console */
// Provisions the low-privilege application role that FORCE ROW LEVEL
// SECURITY actually applies to (superusers and table owners bypass RLS).
// Run once per environment with a superuser connection (POSTGRES_URL), then
// point the app at the role via POSTGRES_APP_URL.
//
// Required env: POSTGRES_URL (superuser), POSTGRES_APP_PASSWORD.
// Optional env: POSTGRES_APP_USER (default 'ethixai_app').
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.POSTGRES_URL;
  const roleName = process.env.POSTGRES_APP_USER || 'ethixai_app';
  const rolePassword = process.env.POSTGRES_APP_PASSWORD;

  if (!connectionString) {
    console.error('POSTGRES_URL is not set');
    process.exit(1);
  }
  if (!rolePassword) {
    console.error('POSTGRES_APP_PASSWORD is not set');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const existing = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [roleName]);
    if (existing.rowCount === 0) {
      // Role name comes from a controlled env var, not user input; identifiers
      // can't be parametrized in DDL so it's validated instead of interpolated blindly.
      if (!/^[a-z_][a-z0-9_]*$/.test(roleName)) {
        throw new Error(`invalid role name: ${roleName}`);
      }
      await client.query(`CREATE ROLE ${roleName} LOGIN PASSWORD $1 NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`, [rolePassword]);
      console.log(`Created role ${roleName}`);
    } else {
      await client.query(`ALTER ROLE ${roleName} WITH LOGIN PASSWORD $1 NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`, [rolePassword]);
      console.log(`Updated role ${roleName}`);
    }
    await client.query(`GRANT CONNECT ON DATABASE ${client.database} TO ${roleName}`).catch(() => {});
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
