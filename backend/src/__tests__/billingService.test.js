jest.mock('../db/postgres', () => ({
  withTenant: jest.fn(),
}));

const { withTenant } = require('../db/postgres');
const billingService = require('../services/billingService');

function makeClient(rowsByCall) {
  let call = 0;
  return {
    query: jest.fn(() => Promise.resolve(rowsByCall[call++] || { rows: [] })),
  };
}

beforeEach(() => {
  withTenant.mockReset();
  withTenant.mockImplementation((tenantId, fn) => fn(makeClient([])));
});

describe('billingService tenant scoping', () => {
  test('every billing operation runs inside withTenant(tenantId, ...)', async () => {
    await billingService.getOrCreateBillingAccount('tenant-a', 'a@x.com');
    await billingService.recordUsage('tenant-a', 'analyses', 3);
    await billingService.listInvoices('tenant-a');
    await billingService.getActiveSubscription('tenant-a');

    for (const call of withTenant.mock.calls) {
      expect(call[0]).toBe('tenant-a');
    }
    expect(withTenant).toHaveBeenCalledTimes(4);
  });

  test('getOrCreateBillingAccount scopes its SELECT by tenant_id parameter, not string interpolation', async () => {
    const client = makeClient([{ rows: [] }, { rows: [{ id: 1, tenant_id: 'tenant-a' }] }]);
    withTenant.mockImplementation((tenantId, fn) => fn(client));

    await billingService.getOrCreateBillingAccount('tenant-a', 'a@x.com');

    const [selectSql, selectParams] = client.query.mock.calls[0];
    expect(selectSql).toMatch(/WHERE tenant_id = \$1/);
    expect(selectParams).toEqual(['tenant-a']);
  });

  test('rejects unknown plans before touching the database', async () => {
    await expect(billingService.createSubscription('tenant-a', 'not-a-real-plan')).rejects.toThrow(
      /unknown_plan/,
    );
    expect(withTenant).not.toHaveBeenCalled();
  });

  test('createSubscription computes price from PLAN_PRICING and seats, scoped to the tenant', async () => {
    const client = makeClient([{ rows: [] }, { rows: [{ id: 'sub-1', plan: 'pro', seats: 3 }] }, { rows: [] }]);
    withTenant.mockImplementation((tenantId, fn) => fn(client));

    await billingService.createSubscription('tenant-a', 'pro', 3);

    const insertCall = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO subscriptions'));
    const [, params] = insertCall;
    expect(params[0]).toBe('tenant-a');
    expect(params[1]).toBe('pro');
    expect(params[2]).toBe(3);
    expect(params[3]).toBe(billingService.PLAN_PRICING.pro * 3);
  });

  test('generateInvoice refuses to invent a subscription for a tenant that has none', async () => {
    const client = makeClient([{ rows: [] }]);
    withTenant.mockImplementation((tenantId, fn) => fn(client));

    await expect(billingService.generateInvoice('tenant-a')).rejects.toThrow('no_active_subscription');
  });

  test('generateInvoice bills overage only beyond the included usage allowance', async () => {
    const subscription = {
      id: 'sub-1',
      price_cents: 4900,
      current_period_start: '2026-01-01',
      current_period_end: '2026-02-01',
    };
    const client = makeClient([
      { rows: [subscription] },
      { rows: [{ total: '1500' }] }, // 500 units over the 1000 included
      { rows: [{ id: 'inv-1', amount_cents: 4900 + 500 * 5 }] },
    ]);
    withTenant.mockImplementation((tenantId, fn) => fn(client));

    await billingService.generateInvoice('tenant-a');

    const insertCall = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO invoices'));
    const [, params] = insertCall;
    expect(params[0]).toBe('tenant-a');
    expect(params[2]).toBe(4900 + 500 * 5); // base plan price + overage
  });
});
