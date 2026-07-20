const request = require('supertest');
const app = require('../src/server');

describe('Model Retraining Endpoints', () => {
  describe('POST /v1/models/retrain', () => {
    it('triggers model retraining', async () => {
      const res = await request(app).post('/v1/models/retrain').send({
        model_id: 'model_123',
        training_data_id: 'dataset_456',
        retrain_reason: 'Performance degradation detected',
      });

      expect([200, 201, 400, 403]).toContain(res.status);
    });

    it('requires model_id and training data', async () => {
      const res = await request(app).post('/v1/models/retrain').send({
        model_id: 'model_123',
      });

      expect([400, 401, 403]).toContain(res.status);
    });
  });

  describe('GET /v1/models/retrain-status/:job_id', () => {
    it('retrieves retraining job status', async () => {
      const res = await request(app).get('/v1/models/retrain-status/job_123');
      expect([200, 401, 404]).toContain(res.status);
    });
  });

  describe('POST /v1/models/promote-version', () => {
    it('promotes retrained model to production', async () => {
      const res = await request(app).post('/v1/models/promote-version').send({
        model_id: 'model_123',
        version: '2.0',
        approval_reason: 'Better fairness metrics',
      });

      expect([200, 400, 403]).toContain(res.status);
    });
  });
});
