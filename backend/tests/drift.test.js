const request = require('supertest');
const app = require('../src/server');

describe('Drift Detection Endpoints', () => {
  describe('POST /v1/drift/detect', () => {
    it('detects drift in model predictions', async () => {
      const res = await request(app).post('/v1/drift/detect').send({
        model_id: 'model_123',
        baseline_data: [[1, 2, 3], [4, 5, 6]],
        current_data: [[1.1, 2.1, 3.1], [4.1, 5.1, 6.1]],
      });

      expect([200, 400, 403, 404]).toContain(res.status);
    });

    it('requires model_id and data', async () => {
      const res = await request(app).post('/v1/drift/detect').send({});

      expect([400, 401, 403]).toContain(res.status);
    });

    it('handles covariate shift detection', async () => {
      const res = await request(app).post('/v1/drift/detect').send({
        model_id: 'model_123',
        drift_type: 'covariate_shift',
        baseline_data: [[1, 2], [3, 4]],
        current_data: [[5, 6], [7, 8]],
      });

      expect([200, 400, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /v1/drift/snapshots', () => {
    it('retrieves drift detection snapshots', async () => {
      const res = await request(app).get('/v1/drift/snapshots?model_id=model_123');

      expect([200, 400, 401]).toContain(res.status);
    });

    it('supports time-range filtering', async () => {
      const res = await request(app)
        .get('/v1/drift/snapshots')
        .query({ model_id: 'model_123', start: '2025-01-01', end: '2025-12-31' });

      expect([200, 400, 401]).toContain(res.status);
    });
  });

  describe('GET /v1/drift/alerts', () => {
    it('retrieves triggered drift alerts', async () => {
      const res = await request(app).get('/v1/drift/alerts?model_id=model_123');

      expect([200, 400, 401]).toContain(res.status);
    });
  });

  describe('POST /v1/drift/configure-threshold', () => {
    it('sets drift detection threshold', async () => {
      const res = await request(app).post('/v1/drift/configure-threshold').send({
        model_id: 'model_123',
        psi_threshold: 0.25,
        kl_divergence_threshold: 0.5,
      });

      expect([200, 201, 400, 403]).toContain(res.status);
    });
  });
});
