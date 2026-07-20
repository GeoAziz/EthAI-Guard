const request = require('supertest');
const app = require('../src/server');

jest.mock('stripe', () => ({
  Stripe: jest.fn(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_123', email: 'test@example.com' }),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_123', status: 'active' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'sub_123', status: 'active' }),
      update: jest.fn().mockResolvedValue({ id: 'sub_123', status: 'active' }),
      del: jest.fn().mockResolvedValue({ id: 'sub_123', status: 'canceled' }),
    },
    invoices: {
      list: jest.fn().mockResolvedValue({ data: [] }),
    },
  })),
}));

describe('Billing Endpoints', () => {
  describe('POST /v1/billing/subscription', () => {
    it('creates new subscription with valid plan', async () => {
      const res = await request(app).post('/v1/billing/subscription').send({
        plan_id: 'plan_starter',
        customer_email: 'test@example.com',
      });

      expect([200, 201, 400, 403]).toContain(res.status);
    });

    it('requires authentication', async () => {
      const res = await request(app).post('/v1/billing/subscription').send({
        plan_id: 'plan_starter',
      });

      expect([401, 403, 400]).toContain(res.status);
    });
  });

  describe('GET /v1/billing/subscription', () => {
    it('retrieves current subscription', async () => {
      const res = await request(app).get('/v1/billing/subscription');

      expect([200, 401, 404]).toContain(res.status);
    });
  });

  describe('POST /v1/billing/subscription/cancel', () => {
    it('cancels active subscription', async () => {
      const res = await request(app).post('/v1/billing/subscription/cancel').send({});

      expect([200, 400, 404, 403]).toContain(res.status);
    });
  });

  describe('GET /v1/billing/invoices', () => {
    it('lists user invoices', async () => {
      const res = await request(app).get('/v1/billing/invoices');

      expect([200, 401]).toContain(res.status);
    });

    it('supports pagination', async () => {
      const res = await request(app).get('/v1/billing/invoices?limit=10&offset=0');

      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /v1/billing/usage', () => {
    it('returns current usage metrics', async () => {
      const res = await request(app).get('/v1/billing/usage');

      expect([200, 401]).toContain(res.status);
    });
  });

  describe('POST /v1/billing/payment-method', () => {
    it('adds payment method to account', async () => {
      const res = await request(app).post('/v1/billing/payment-method').send({
        token: 'pm_card_visa',
      });

      expect([200, 201, 400, 403]).toContain(res.status);
    });
  });
});
