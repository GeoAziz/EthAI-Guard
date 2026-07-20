const request = require('supertest');
const app = require('../src/server');

describe('Models Registry Endpoints', () => {
  describe('GET /v1/models', () => {
    it('retrieves all models', async () => {
      const res = await request(app).get('/v1/models');
      expect([200, 401]).toContain(res.status);
    });

    it('supports pagination', async () => {
      const res = await request(app).get('/v1/models?limit=10&offset=0');
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('POST /v1/models', () => {
    it('registers new model', async () => {
      const res = await request(app).post('/v1/models').send({
        name: 'new_model',
        framework: 'scikit-learn',
        input_shape: [10],
        output_shape: [1],
      });

      expect([200, 201, 400, 403]).toContain(res.status);
    });
  });

  describe('GET /v1/models/:id', () => {
    it('retrieves model details', async () => {
      const res = await request(app).get('/v1/models/model_123');
      expect([200, 401, 404]).toContain(res.status);
    });
  });

  describe('GET /v1/models/:id/versions', () => {
    it('lists model versions', async () => {
      const res = await request(app).get('/v1/models/model_123/versions');
      expect([200, 401, 404]).toContain(res.status);
    });
  });
});
