#!/usr/bin/env node
/* eslint-disable no-console */
// Applies backend/migrations/postgres/*.sql in filename order.
// Connects with POSTGRES_URL (expected to be a superuser/owner connection,
// since DDL and RLS policy creation require elevated privileges).
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error('POSTGRES_URL is not set');
    process.exit(1);
  }

  const dir = path.join(__dirname, '..', 'migrations', 'postgres');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  const client = new Client({ connectionString });
  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      console.log(`Applying ${file}...`);
      await client.query(sql);
    }
    console.log(`Applied ${files.length} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
