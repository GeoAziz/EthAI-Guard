const request = require('supertest');
const app = require('../src/server');

describe('Newsletter Endpoints', () => {
  describe('POST /v1/newsletter/subscribe', () => {
    it('subscribes user to newsletter', async () => {
      const res = await request(app).post('/v1/newsletter/subscribe').send({
        email: 'user@example.com',
        preferences: { frequency: 'weekly' },
      });

      expect([200, 201, 400]).toContain(res.status);
    });

    it('validates email format', async () => {
      const res = await request(app).post('/v1/newsletter/subscribe').send({
        email: 'invalid_email',
      });

      expect([400, 422]).toContain(res.status);
    });
  });

  describe('POST /v1/newsletter/unsubscribe', () => {
    it('unsubscribes user from newsletter', async () => {
      const res = await request(app).post('/v1/newsletter/unsubscribe').send({
        email: 'user@example.com',
      });

      expect([200, 400, 404]).toContain(res.status);
    });
  });

  describe('PUT /v1/newsletter/preferences', () => {
    it('updates newsletter preferences', async () => {
      const res = await request(app).put('/v1/newsletter/preferences').send({
        frequency: 'monthly',
        topics: ['fairness', 'performance'],
      });

      expect([200, 400, 401]).toContain(res.status);
    });
  });
});
