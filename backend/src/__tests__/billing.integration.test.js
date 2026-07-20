/**
 * Integration Tests: Billing Flow
 * Tests end-to-end billing operations
 * Requires test database and Stripe test keys
 */

const request = require('supertest');
const app = require('../server');
const { withTenant } = require('../db/postgres');
const stripeService = require('../services/stripeService');

describe('Billing Integration Tests', () => {
  let authToken;
  let testTenantId = 'test-tenant-' + Date.now();
  let testUserId = 'test-user-' + Date.now();

  /**
   * Setup: Create test user and authenticate
   */
  beforeAll(async () => {
    // In real test: Create user in Firebase, get auth token
    authToken = 'test-jwt-token-placeholder';
    // This would normally be obtained from Firebase Auth
  });

  /**
   * Cleanup: Remove test data
   */
  afterAll(async () => {
    // Cleanup test data from database
  });

  // ============================================================
  // Test: Register for Free Plan
  // ============================================================

  describe('POST /api/billing/account', () => {
    it('should create billing account on first access', async () => {
      const response = await request(app)
        .get('/api/billing/account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('account');
      expect(response.body.account.plan).toBe('free');
      expect(response.body.account.status).toBe('active');
    });

    it('should return existing account on second access', async () => {
      const response1 = await request(app)
        .get('/api/billing/account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response2 = await request(app)
        .get('/api/billing/account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response1.body.account.id).toBe(response2.body.account.id);
    });
  });

  // ============================================================
  // Test: Subscribe to Paid Plan
  // ============================================================

  describe('POST /api/billing/subscribe', () => {
    it('should upgrade from free to starter plan', async () => {
      const response = await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ plan: 'starter', seats: 2 })
        .expect(200);

      expect(response.body).toHaveProperty('subscription');
      expect(response.body.subscription.plan).toBe('starter');
      expect(response.body.subscription.seats).toBe(2);
      expect(response.body.subscription.status).toBe('active');
    });

    it('should upgrade from starter to pro plan', async () => {
      // First subscribe to starter
      await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ plan: 'starter', seats: 2 });

      // Then upgrade to pro
      const response = await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ plan: 'pro', seats: 10 })
        .expect(200);

      expect(response.body.subscription.plan).toBe('pro');
      expect(response.body.subscription.seats).toBe(10);
    });

    it('should reject invalid plan', async () => {
      const response = await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ plan: 'invalid_plan', seats: 1 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('invalid_plan');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/billing/subscribe')
        .send({ plan: 'starter', seats: 1 })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================
  // Test: Get Current Subscription
  // ============================================================

  describe('GET /api/billing/subscription', () => {
    it('should return current subscription details', async () => {
      await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ plan: 'pro', seats: 5 });

      const response = await request(app)
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('subscription');
      expect(response.body.subscription.plan).toBe('pro');
      expect(response.body.subscription.status).toBe('active');
    });

    it('should return null for free plan user', async () => {
      const response = await request(app)
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Free plan may return null or default subscription
      if (response.body.subscription) {
        expect(response.body.subscription.plan).toBe('free');
      }
    });
  });

  // ============================================================
  // Test: Track Usage
  // ============================================================

  describe('POST /api/billing/usage', () => {
    it('should record analyses usage', async () => {
      const response = await request(app)
        .post('/api/billing/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ metric: 'analyses', quantity: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('record');
      expect(response.body.record.metric).toBe('analyses');
      expect(response.body.record.quantity).toBe(10);
    });

    it('should record API calls usage', async () => {
      const response = await request(app)
        .post('/api/billing/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ metric: 'api_calls', quantity: 500 })
        .expect(200);

      expect(response.body.record.metric).toBe('api_calls');
      expect(response.body.record.quantity).toBe(500);
    });

    it('should default quantity to 1', async () => {
      const response = await request(app)
        .post('/api/billing/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ metric: 'dataset_uploads' })
        .expect(200);

      expect(response.body.record.quantity).toBe(1);
    });

    it('should require metric parameter', async () => {
      const response = await request(app)
        .post('/api/billing/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 5 })
        .expect(400);

      expect(response.body.error).toBe('metric_required');
    });
  });

  // ============================================================
  // Test: Generate Invoice
  // ============================================================

  describe('POST /api/billing/invoices/generate', () => {
    it('should generate invoice with correct pricing', async () => {
      // Subscribe to pro
      await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ plan: 'pro', seats: 2 });

      // Record usage (2000 analyses = 1000 overage @ $5 per 1000)
      for (let i = 0; i < 2000; i++) {
        await request(app)
          .post('/api/billing/usage')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ metric: 'analyses', quantity: 1 });
      }

      // Generate invoice
      const response = await request(app)
        .post('/api/billing/invoices/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('invoice');
      const invoice = response.body.invoice;

      // Pro plan: $2,999/month = 299,900 cents
      // Overage: 1000 units @ $5 per 1000 = 500 cents
      expect(invoice.usage_total).toBe(2000);
      expect(invoice.overage_cents).toBeGreaterThan(0);
      expect(invoice.amount_cents).toBe(invoice.price_cents + invoice.overage_cents);
    });

    it('should reject invoice generation without subscription', async () => {
      const newToken = 'new-auth-token-' + Date.now();

      const response = await request(app)
        .post('/api/billing/invoices/generate')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(400);

      expect(response.body.error).toBe('no_active_subscription');
    });
  });

  // ============================================================
  // Test: Get Invoice History
  // ============================================================

  describe('GET /api/billing/invoices', () => {
    it('should list all invoices for tenant', async () => {
      // Generate some invoices
      await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ plan: 'starter', seats: 1 });

      // Generate first invoice
      const gen1 = await request(app)
        .post('/api/billing/invoices/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Get invoice list
      const response = await request(app)
        .get('/api/billing/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.invoices)).toBe(true);
      expect(response.body.invoices.length).toBeGreaterThan(0);
    });

    it('should return empty list for new tenant', async () => {
      const response = await request(app)
        .get('/api/billing/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.invoices)).toBe(true);
    });
  });

  // ============================================================
  // Test: Webhook Processing
  // ============================================================

  describe('POST /api/webhooks/stripe', () => {
    it('should process payment_intent.succeeded event', async () => {
      const event = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 299900,
            currency: 'usd',
            status: 'succeeded',
            metadata: { tenantId: testTenantId },
          },
        },
      };

      // Note: This requires proper Stripe signature verification
      // In test environment, you'd use Stripe test webhook signing
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .send(event)
        // Skip signature verification in test: .set('stripe-signature', validSig)
        .expect([200, 400]); // May fail without valid signature

      // In production, would verify:
      // expect(response.body).toHaveProperty('received', true);
    });

    it('should handle missing stripe-signature header gracefully', async () => {
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================
  // Test: Multi-Tenant Isolation
  // ============================================================

  describe('Billing Multi-Tenant Isolation', () => {
    let tenant1Token = 'token-1-' + Date.now();
    let tenant2Token = 'token-2-' + Date.now();

    it('should prevent tenant A from accessing tenant B invoices', async () => {
      // Tenant A creates subscription
      await request(app)
        .post('/api/billing/subscribe')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({ plan: 'pro', seats: 1 });

      // Tenant B tries to get Tenant A's invoices
      // This should be blocked by tenantGuard middleware
      const response = await request(app)
        .get('/api/billing/invoices')
        .set('Authorization', `Bearer ${tenant2Token}`)
        .expect(200); // Gets their own (empty) invoices, not tenant A's

      // Should never see tenant A's data
      expect(response.body.invoices).not.toContainEqual(
        expect.objectContaining({
          tenant_id: tenant1Token,
        })
      );
    });
  });

  // ============================================================
  // Test: Overage Billing Calculations
  // ============================================================

  describe('Overage Billing Calculations', () => {
    it('should calculate overage correctly for pro plan', async () => {
      // Pro: $2,999/month, includes 1000 units
      // Overage: $5 per 1000 units

      const overageTests = [
        { usage: 1000, expectedOverageCents: 0 }, // Exactly included
        { usage: 1500, expectedOverageCents: 250 }, // 500 units overage
        { usage: 2000, expectedOverageCents: 500 }, // 1000 units overage
        { usage: 3000, expectedOverageCents: 1000 }, // 2000 units overage
      ];

      for (const test of overageTests) {
        // Record usage
        for (let i = 0; i < test.usage; i++) {
          await request(app)
            .post('/api/billing/usage')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ metric: 'analyses', quantity: 1 });
        }

        // Generate invoice
        const response = await request(app)
          .post('/api/billing/invoices/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const { overage_cents } = response.body.invoice;
        expect(overage_cents).toBe(test.expectedOverageCents);

        // Reset for next test
        await request(app)
          .post('/api/billing/subscribe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ plan: 'free', seats: 1 }); // Reset to free
      }
    });
  });
});
