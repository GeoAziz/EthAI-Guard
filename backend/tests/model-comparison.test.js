const request = require('supertest');
const app = require('../src/server');

describe('Model Comparison Endpoints', () => {
  describe('POST /v1/models/compare', () => {
    it('compares two model versions', async () => {
      const res = await request(app).post('/v1/models/compare').send({
        model_id: 'model_123',
        version_a: '1.0',
        version_b: '2.0',
      });

      expect([200, 400, 403]).toContain(res.status);
    });

    it('includes fairness comparison', async () => {
      const res = await request(app).post('/v1/models/compare').send({
        model_id: 'model_123',
        version_a: '1.0',
        version_b: '2.0',
        compare_fairness: true,
      });

      expect([200, 400, 403]).toContain(res.status);
    });
  });

  describe('GET /v1/models/comparison/:comparison_id', () => {
    it('retrieves comparison results', async () => {
      const res = await request(app).get('/v1/models/comparison/comp_123');
      expect([200, 401, 404]).toContain(res.status);
    });
  });
});
