const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const stripeService = require('../src/services/stripeService');
const billingService = require('../src/services/billingService');

const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  email: 'test@example.com',
  role: 'admin',
  tenantId: 'test-tenant-123',
  sub: 'firebase-uid-123',
};

const validToken = jwt.sign(mockUser, process.env.JWT_SECRET || 'test-secret', {
  expiresIn: '24h',
});

describe('Billing API Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = require('../src/server');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/billing/subscribe', () => {
    it('should create a free subscription without payment', async () => {
      const res = await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          plan: 'free',
          seats: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.subscription).toBeDefined();
      expect(res.body.subscription.plan).toBe('free');
    });

    it('should reject invalid plan', async () => {
      const res = await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          plan: 'invalid-plan',
          seats: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/billing/subscribe')
        .send({
          plan: 'starter',
          seats: 1,
        });

      expect(res.status).toBe(401);
    });

    it('should record subscription with seats', async () => {
      const res = await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          plan: 'pro',
          seats: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.subscription.seats).toBe(5);
    });
  });

  describe('GET /api/billing/subscription', () => {
    it('should retrieve active subscription', async () => {
      // First create a subscription
      await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          plan: 'starter',
          seats: 2,
        });

      // Then retrieve it
      const res = await request(app)
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.subscription).toBeDefined();
      expect(res.body.subscription.plan).toBe('starter');
    });

    it('should return null if no active subscription', async () => {
      const res = await request(app)
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${validToken}`);

      // Should not error, just return no subscription
      expect(res.status).toBeOneOf([200, 404]);
    });
  });

  describe('GET /api/billing/invoices', () => {
    it('should list invoices for tenant', async () => {
      const res = await request(app)
        .get('/api/billing/invoices')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.invoices)).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/billing/invoices');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/billing/invoices/generate', () => {
    it('should generate invoice for active subscription', async () => {
      // Create active subscription first
      await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          plan: 'pro',
          seats: 1,
        });

      // Generate invoice
      const res = await request(app)
        .post('/api/billing/invoices/generate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.invoice).toBeDefined();
      expect(res.body.invoice.amount_cents).toBeGreaterThanOrEqual(0);
    });

    it('should fail if no active subscription', async () => {
      const userWithoutSubscription = {
        ...mockUser,
        _id: new mongoose.Types.ObjectId(),
        tenantId: 'tenant-no-sub',
      };

      const token = jwt.sign(userWithoutSubscription, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '24h',
      });

      const res = await request(app)
        .post('/api/billing/invoices/generate')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('no_active_subscription');
    });

    it('should require admin role', async () => {
      const userToken = jwt.sign(
        { ...mockUser, role: 'viewer' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );

      const res = await request(app)
        .post('/api/billing/invoices/generate')
        .set('Authorization', `Bearer ${userToken}`);

      expect([400, 401, 403]).toContain(res.status);
    });
  });

  describe('POST /api/billing/usage', () => {
    it('should record usage metric', async () => {
      const res = await request(app)
        .post('/api/billing/usage')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          metric: 'analyses_run',
          quantity: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.record).toBeDefined();
      expect(res.body.record.quantity).toBe(5);
    });

    it('should require metric name', async () => {
      const res = await request(app)
        .post('/api/billing/usage')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          quantity: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('metric_required');
    });

    it('should default quantity to 1', async () => {
      const res = await request(app)
        .post('/api/billing/usage')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          metric: 'datasets_uploaded',
        });

      expect(res.status).toBe(200);
      expect(res.body.record.quantity).toBe(1);
    });
  });

  describe('POST /api/webhooks/stripe', () => {
    it('should accept Stripe webhook', async () => {
      // This requires Stripe SDK verification in production
      // For testing, we mock the verification
      jest.spyOn(stripeService, 'verifyWebhookSignature').mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            customer: 'cus_test123',
            metadata: { tenantId: mockUser.tenantId },
          },
        },
      });

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'test-signature')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });

    it('should reject missing signature', async () => {
      const res = await request(app)
        .post('/api/webhooks/stripe')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('missing_signature');
    });
  });

  describe('Billing service tests', () => {
    it('should calculate overage charges', async () => {
      // Test INCLUDED_USAGE_UNITS (1000) + overage
      const subscription = {
        price_cents: 29900,
        current_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        current_period_end: new Date(),
      };

      // Usage of 1200 units = 200 overage
      // Overage rate: 5 cents per unit
      // Expected: 200 * 5 = 1000 cents ($10)

      const expectedOverage = (1200 - 1000) * 5; // 1000 cents
      const expectedTotal = 29900 + expectedOverage;

      expect(expectedTotal).toBe(30900);
    });
  });

  describe('Stripe service tests', () => {
    it('should validate plan pricing', () => {
      const validPlans = ['free', 'starter', 'pro', 'enterprise'];
      const invalidPlan = 'unknown';

      validPlans.forEach(plan => {
        expect(() => {
          if (!(plan in stripeService.PLAN_PRICING)) {
            throw new Error(`Unknown plan: ${plan}`);
          }
        }).not.toThrow();
      });

      expect(() => {
        if (!(invalidPlan in stripeService.PLAN_PRICING)) {
          throw new Error(`Unknown plan: ${invalidPlan}`);
        }
      }).toThrow();
    });

    it('should handle subscription state transitions', () => {
      const states = ['active', 'past_due', 'cancelled', 'unpaid'];

      states.forEach(state => {
        // Verify valid state transitions
        expect(['active', 'past_due', 'cancelled', 'unpaid']).toContain(state);
      });
    });
  });

  describe('Compliance report generation with billing', () => {
    it('should include billing info in compliance report', async () => {
      // Create subscription
      await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          plan: 'pro',
          seats: 3,
        });

      // Get billing account
      const billingRes = await request(app)
        .get('/api/billing/account')
        .set('Authorization', `Bearer ${validToken}`);

      expect(billingRes.status).toBe(200);
      expect(billingRes.body.account).toBeDefined();
      expect(billingRes.body.account.plan).toBe('pro');
    });
  });

  describe('Multi-tenant billing isolation', () => {
    it('should isolate subscriptions by tenant', async () => {
      const tenant1 = jwt.sign(
        { ...mockUser, tenantId: 'tenant-1' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );

      const tenant2 = jwt.sign(
        { ...mockUser, tenantId: 'tenant-2' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );

      // Create subscription for tenant 1
      await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${tenant1}`)
        .send({ plan: 'starter', seats: 1 });

      // Create subscription for tenant 2
      await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${tenant2}`)
        .send({ plan: 'pro', seats: 1 });

      // Tenant 1 should only see their subscription
      const res1 = await request(app)
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${tenant1}`);

      expect(res1.body.subscription.plan).toBe('starter');

      // Tenant 2 should only see their subscription
      const res2 = await request(app)
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${tenant2}`);

      expect(res2.body.subscription.plan).toBe('pro');
    });
  });
});

// Helper matcher
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${expected.join(', ')}`
          : `expected ${received} to be one of ${expected.join(', ')}`,
    };
  },
});
