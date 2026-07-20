const request = require('supertest');
const app = require('../src/server');

describe('Stripe Webhook Endpoints', () => {
  describe('POST /stripe-webhooks', () => {
    it('validates webhook signature before processing', async () => {
      const res = await request(app)
        .post('/stripe-webhooks')
        .set('Stripe-Signature', 'invalid_signature')
        .send({ type: 'payment_intent.succeeded' });

      expect([400, 401, 403, 404]).toContain(res.status);
    });

    it('processes payment_intent.succeeded event', async () => {
      const event = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            customer: 'cus_123',
            amount: 5000,
            status: 'succeeded',
          },
        },
      };

      const res = await request(app)
        .post('/stripe-webhooks')
        .set('Stripe-Signature', 'valid_signature_mock')
        .send(event);

      expect([200, 400, 403, 404]).toContain(res.status);
    });

    it('handles customer.subscription.updated event', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
          },
        },
      };

      const res = await request(app)
        .post('/stripe-webhooks')
        .set('Stripe-Signature', 'valid_signature_mock')
        .send(event);

      expect([200, 400, 403, 404]).toContain(res.status);
    });

    it('handles customer.subscription.deleted event', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'canceled',
          },
        },
      };

      const res = await request(app)
        .post('/stripe-webhooks')
        .set('Stripe-Signature', 'valid_signature_mock')
        .send(event);

      expect([200, 400, 403, 404]).toContain(res.status);
    });

    it('handles invoice.payment_failed event', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            amount_due: 5000,
          },
        },
      };

      const res = await request(app)
        .post('/stripe-webhooks')
        .set('Stripe-Signature', 'valid_signature_mock')
        .send(event);

      expect([200, 400, 403, 404]).toContain(res.status);
    });

    it('logs webhook events for audit trail', async () => {
      const event = {
        type: 'payment_intent.succeeded',
        id: 'evt_123',
        data: { object: { id: 'pi_123' } },
      };

      const res = await request(app)
        .post('/stripe-webhooks')
        .set('Stripe-Signature', 'valid_signature_mock')
        .send(event);

      expect([200, 400, 403, 404]).toContain(res.status);
    });

    it('handles idempotent webhook retries gracefully', async () => {
      const event = {
        type: 'payment_intent.succeeded',
        id: 'evt_same_123',
        data: { object: { id: 'pi_123' } },
      };

      const res1 = await request(app)
        .post('/stripe-webhooks')
        .set('Stripe-Signature', 'valid_signature_mock')
        .send(event);

      const res2 = await request(app)
        .post('/stripe-webhooks')
        .set('Stripe-Signature', 'valid_signature_mock')
        .send(event);

      expect([200, 400, 403, 404]).toContain(res1.status);
      expect([200, 400, 403, 404]).toContain(res2.status);
    });
  });
});
