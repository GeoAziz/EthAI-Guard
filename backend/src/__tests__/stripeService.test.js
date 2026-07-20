/**
 * Unit Tests for Stripe Integration Service
 * Tests all Stripe payment processing, webhook handling, and subscription management
 */

const stripeService = require('../services/stripeService');
const { withTenant } = require('../db/postgres');

// Mock Stripe client
jest.mock('stripe');
jest.mock('../db/postgres');

describe('StripeService', () => {
  const mockTenantId = 'tenant-123';
  const mockEmail = 'test@example.com';
  const mockStripeCustomerId = 'cus_test123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Test: Create/Get Stripe Customer
  // ============================================================

  describe('getOrCreateStripeCustomer', () => {
    it('should create a new Stripe customer if not exists', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // No existing customer
          .mockResolvedValueOnce({ rows: [{ stripe_customer_id: mockStripeCustomerId }] }),
      };

      withTenant.mockImplementation((tenantId, callback) =>
        callback(mockClient)
      );

      stripeService.stripe.customers = {
        create: jest.fn().mockResolvedValue({
          id: mockStripeCustomerId,
          email: mockEmail,
        }),
      };

      const result = await stripeService.getOrCreateStripeCustomer(
        mockTenantId,
        mockEmail,
        'Test Company'
      );

      expect(result).toBe(mockStripeCustomerId);
      expect(stripeService.stripe.customers.create).toHaveBeenCalled();
    });

    it('should return existing customer ID if already created', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [{ stripe_customer_id: mockStripeCustomerId }],
        }),
      };

      withTenant.mockImplementation((tenantId, callback) =>
        callback(mockClient)
      );

      const result = await stripeService.getOrCreateStripeCustomer(
        mockTenantId,
        mockEmail
      );

      expect(result).toBe(mockStripeCustomerId);
      expect(stripeService.stripe.customers.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Test: Create Subscription
  // ============================================================

  describe('createSubscription', () => {
    it('should create a subscription for pro plan', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ billing_email: mockEmail }] })
          .mockResolvedValueOnce({ rows: [{ id: 'sub-123' }] }),
      };

      withTenant.mockImplementation((tenantId, callback) =>
        callback(mockClient)
      );

      stripeService.stripe.customers = {
        retrieve: jest.fn().mockResolvedValue({ id: mockStripeCustomerId }),
      };

      stripeService.stripe.subscriptions = {
        create: jest.fn().mockResolvedValue({
          id: 'sub-stripe-123',
          items: { data: [{ id: 'item-123' }] },
        }),
      };

      const result = await stripeService.createSubscription(
        mockTenantId,
        'pro',
        10
      );

      expect(result).toBeDefined();
      expect(result.plan).toBe('pro');
      expect(stripeService.stripe.subscriptions.create).toHaveBeenCalled();
    });

    it('should throw error for unknown plan', async () => {
      await expect(
        stripeService.createSubscription(mockTenantId, 'invalid_plan', 1)
      ).rejects.toThrow('Unknown plan');
    });
  });

  // ============================================================
  // Test: Webhook Signature Verification
  // ============================================================

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      const mockEvent = { type: 'payment_intent.succeeded', data: {} };
      const mockBody = JSON.stringify(mockEvent);
      const signature = 'valid_signature';

      stripeService.stripe.webhooks = {
        constructEvent: jest.fn().mockReturnValue(mockEvent),
      };

      const result = stripeService.verifyWebhookSignature(mockBody, signature);

      expect(result).toEqual(mockEvent);
      expect(stripeService.stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        mockBody,
        signature,
        expect.any(String)
      );
    });

    it('should throw error for invalid signature', () => {
      stripeService.stripe.webhooks = {
        constructEvent: jest
          .fn()
          .mockImplementation(() => {
            throw new Error('Invalid signature');
          }),
      };

      expect(() =>
        stripeService.verifyWebhookSignature('body', 'invalid')
      ).toThrow('Invalid signature');
    });
  });

  // ============================================================
  // Test: Handle Webhook Event
  // ============================================================

  describe('handleWebhookEvent', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const event = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            metadata: { tenantId: mockTenantId },
          },
        },
      };

      await stripeService.handleWebhookEvent(event);
      // Should not throw
    });

    it('should handle invoice.payment_failed event', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'inv_123',
            customer: mockStripeCustomerId,
          },
        },
      };

      await stripeService.handleWebhookEvent(event);
      // Should not throw
    });

    it('should ignore unhandled events', async () => {
      const event = {
        type: 'charge.refunded',
        data: { object: {} },
      };

      await expect(
        stripeService.handleWebhookEvent(event)
      ).resolves.not.toThrow();
    });
  });

  // ============================================================
  // Test: Get Active Subscription
  // ============================================================

  describe('getActiveSubscription', () => {
    it('should return active subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        status: 'active',
        plan: 'pro',
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [mockSubscription],
        }),
      };

      withTenant.mockImplementation((tenantId, callback) =>
        callback(mockClient)
      );

      const result = await stripeService.getActiveSubscription(mockTenantId);

      expect(result).toEqual(mockSubscription);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('subscriptions'),
        [mockTenantId]
      );
    });

    it('should return null if no active subscription', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };

      withTenant.mockImplementation((tenantId, callback) =>
        callback(mockClient)
      );

      const result = await stripeService.getActiveSubscription(mockTenantId);

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // Test: Record Usage
  // ============================================================

  describe('recordUsage', () => {
    it('should record usage metric', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 'usage-123', metric: 'analyses', quantity: 5 }],
        }),
      };

      withTenant.mockImplementation((tenantId, callback) =>
        callback(mockClient)
      );

      const result = await stripeService.recordUsage(mockTenantId, 'analyses', 5);

      expect(result).toBeDefined();
      expect(result.metric).toBe('analyses');
      expect(result.quantity).toBe(5);
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should default quantity to 1', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ quantity: 1 }],
        }),
      };

      withTenant.mockImplementation((tenantId, callback) =>
        callback(mockClient)
      );

      await stripeService.recordUsage(mockTenantId, 'api_calls');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([mockTenantId, 'api_calls', 1])
      );
    });
  });

  // ============================================================
  // Test: Generate Invoice
  // ============================================================

  describe('generateInvoice', () => {
    it('should calculate invoice with overage', async () => {
      const mockSubscription = {
        id: 'sub-123',
        price_cents: 299900,
        current_period_start: new Date('2024-01-01'),
        current_period_end: new Date('2024-02-01'),
      };

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [mockSubscription] })
          .mockResolvedValueOnce({ rows: [{ total: 1500 }] }) // Usage: 1500 units
          .mockResolvedValueOnce({ rows: [{ id: 'inv-123' }] }),
      };

      withTenant.mockImplementation((tenantId, callback) =>
        callback(mockClient)
      );

      const result = await stripeService.generateInvoice(mockTenantId);

      expect(result).toBeDefined();
      expect(result.usage_total).toBe(1500);
      // Overage: (1500 - 1000) * (500 / 1000) = 250 cents
      expect(result.overage_cents).toBeGreaterThan(0);
    });

    it('should throw error if no active subscription', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };

      withTenant.mockImplementation((tenantId, callback) =>
        callback(mockClient)
      );

      await expect(
        stripeService.generateInvoice(mockTenantId)
      ).rejects.toThrow('no_active_subscription');
    });
  });

  // ============================================================
  // Test: Plan Pricing
  // ============================================================

  describe('PLAN_PRICING', () => {
    it('should have all required plans', () => {
      expect(stripeService.PLAN_PRICING).toHaveProperty('free');
      expect(stripeService.PLAN_PRICING).toHaveProperty('starter');
      expect(stripeService.PLAN_PRICING).toHaveProperty('pro');
      expect(stripeService.PLAN_PRICING).toHaveProperty('enterprise');
    });

    it('should have correct pricing structure', () => {
      const pro = stripeService.PLAN_PRICING.pro;
      expect(pro).toHaveProperty('name');
      expect(pro).toHaveProperty('price_cents');
      expect(pro).toHaveProperty('seats');
      expect(typeof pro.price_cents).toBe('number');
    });
  });

  // ============================================================
  // Test: Cancel Subscription
  // ============================================================

  describe('cancelSubscription', () => {
    it('should cancel active subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        stripe_subscription_id: 'sub-stripe-123',
      };

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [mockSubscription] })
          .mockResolvedValueOnce({ rows: [{ status: 'cancelled' }] }),
      };

      withTenant.mockImplementation((tenantId, callback) =>
        callback(mockClient)
      );

      stripeService.stripe.subscriptions = {
        cancel: jest.fn().mockResolvedValue({ status: 'cancelled' }),
      };

      const result = await stripeService.cancelSubscription(mockTenantId);

      expect(result.status).toBe('cancelled');
      expect(stripeService.stripe.subscriptions.cancel).toHaveBeenCalledWith(
        'sub-stripe-123'
      );
    });

    it('should throw error if no subscription to cancel', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };

      withTenant.mockImplementation((tenantId, callback) =>
        callback(mockClient)
      );

      await expect(
        stripeService.cancelSubscription(mockTenantId)
      ).rejects.toThrow('no_active_subscription');
    });
  });
});
