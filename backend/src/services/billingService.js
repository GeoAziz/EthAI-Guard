const { withTenant } = require('../db/postgres');

const PLAN_PRICING = {
  free: 0,
  starter: 4900,
  pro: 19900,
  enterprise: 99900,
};

async function getOrCreateBillingAccount(tenantId, billingEmail) {
  return withTenant(tenantId, async (client) => {
    const existing = await client.query('SELECT * FROM billing_accounts WHERE tenant_id = $1', [tenantId]);
    if (existing.rows[0]) {
      return existing.rows[0];
    }
    const inserted = await client.query(
      'INSERT INTO billing_accounts (tenant_id, billing_email, plan, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [tenantId, billingEmail || null, 'free', 'active'],
    );
    return inserted.rows[0];
  });
}

async function createSubscription(tenantId, plan, seats = 1) {
  const unitPriceCents = PLAN_PRICING[plan];
  if (unitPriceCents === undefined) {
    throw new Error(`unknown_plan:${plan}`);
  }
  return withTenant(tenantId, async (client) => {
    await client.query(
      "UPDATE subscriptions SET status = 'cancelled' WHERE tenant_id = $1 AND status = 'active'",
      [tenantId],
    );
    const result = await client.query(
      `INSERT INTO subscriptions (tenant_id, plan, seats, price_cents, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
      [tenantId, plan, seats, unitPriceCents * seats],
    );
    await client.query(
      "UPDATE billing_accounts SET plan = $2, updated_at = now() WHERE tenant_id = $1",
      [tenantId, plan],
    );
    return result.rows[0];
  });
}

async function recordUsage(tenantId, metric, quantity = 1) {
  return withTenant(tenantId, async (client) => {
    const result = await client.query(
      'INSERT INTO usage_records (tenant_id, metric, quantity) VALUES ($1, $2, $3) RETURNING *',
      [tenantId, metric, quantity],
    );
    return result.rows[0];
  });
}

async function listInvoices(tenantId) {
  return withTenant(tenantId, async (client) => {
    const result = await client.query(
      'SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY issued_at DESC',
      [tenantId],
    );
    return result.rows;
  });
}

async function getActiveSubscription(tenantId) {
  return withTenant(tenantId, async (client) => {
    const result = await client.query(
      "SELECT * FROM subscriptions WHERE tenant_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [tenantId],
    );
    return result.rows[0] || null;
  });
}

const INCLUDED_USAGE_UNITS = 1000;
const OVERAGE_CENTS_PER_UNIT = 5;

async function generateInvoice(tenantId) {
  return withTenant(tenantId, async (client) => {
    const sub = await client.query(
      "SELECT * FROM subscriptions WHERE tenant_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [tenantId],
    );
    const subscription = sub.rows[0];
    if (!subscription) {
      throw new Error('no_active_subscription');
    }

    const usage = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) AS total FROM usage_records
       WHERE tenant_id = $1 AND recorded_at >= $2 AND recorded_at < $3`,
      [tenantId, subscription.current_period_start, subscription.current_period_end],
    );
    const overageUnits = Math.max(0, Number(usage.rows[0].total) - INCLUDED_USAGE_UNITS);
    const overageCents = Math.round(overageUnits * OVERAGE_CENTS_PER_UNIT);
    const amountCents = subscription.price_cents + overageCents;

    const invoice = await client.query(
      `INSERT INTO invoices (tenant_id, subscription_id, amount_cents, currency, status, period_start, period_end)
       VALUES ($1, $2, $3, 'usd', 'open', $4, $5) RETURNING *`,
      [tenantId, subscription.id, amountCents, subscription.current_period_start, subscription.current_period_end],
    );
    return invoice.rows[0];
  });
}

module.exports = {
  PLAN_PRICING,
  getOrCreateBillingAccount,
  createSubscription,
  recordUsage,
  listInvoices,
  getActiveSubscription,
  generateInvoice,
};
