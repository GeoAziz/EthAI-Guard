const { Pool } = require('pg');
const logger = require('../logger');

let pool = null;

function getPool() {
  if (pool) {
    return pool;
  }
  // POSTGRES_APP_URL should point at a non-superuser role with RLS enforced
  // (see scripts/setup_postgres_role.js). Falls back to POSTGRES_URL for
  // environments that haven't provisioned the dedicated role yet, but note
  // that a superuser/table-owner connection bypasses FORCE ROW LEVEL SECURITY.
  const connectionString = process.env.POSTGRES_APP_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL (or POSTGRES_APP_URL) is not configured');
  }
  if (!process.env.POSTGRES_APP_URL) {
    logger.warn('POSTGRES_APP_URL not set; falling back to POSTGRES_URL. Row-level security will not be enforced against a superuser/table-owner connection.');
  }
  pool = new Pool({ connectionString });
  pool.on('error', (err) => logger.error({ err }, 'postgres_pool_error'));
  return pool;
}

/**
 * Runs `fn` inside a transaction with the tenant's id bound to the
 * `app.tenant_id` session variable (via a parametrized set_config, not
 * string interpolation) so PostgreSQL row-level security policies scope
 * every statement to that tenant for the lifetime of the transaction.
 */
async function withTenant(tenantId, fn) {
  if (!tenantId) {
    throw new Error('tenantId_required');
  }
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', String(tenantId)]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { getPool, withTenant };
