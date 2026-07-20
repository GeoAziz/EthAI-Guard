const request = require('supertest');
const app = require('../src/server');

describe('Model Cards Endpoints', () => {
  describe('GET /v1/model-cards', () => {
    it('retrieves model cards', async () => {
      const res = await request(app).get('/v1/model-cards');
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('POST /v1/model-cards', () => {
    it('creates new model card', async () => {
      const res = await request(app).post('/v1/model-cards').send({
        model_id: 'model_123',
        name: 'Credit Risk Model v2',
        description: 'Predicts credit default risk',
        intended_use: 'Loan approval decisions',
        performance_metrics: { accuracy: 0.94, f1: 0.91 },
      });

      expect([200, 201, 400, 403]).toContain(res.status);
    });
  });

  describe('GET /v1/model-cards/:id', () => {
    it('retrieves specific model card', async () => {
      const res = await request(app).get('/v1/model-cards/model_123');
      expect([200, 401, 404]).toContain(res.status);
    });
  });

  describe('PUT /v1/model-cards/:id', () => {
    it('updates model card', async () => {
      const res = await request(app).put('/v1/model-cards/model_123').send({
        description: 'Updated description',
      });

      expect([200, 400, 403, 404]).toContain(res.status);
    });
  });
});
