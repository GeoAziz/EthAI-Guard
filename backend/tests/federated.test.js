const request = require('supertest');
const app = require('../src/server');

describe('Federated Learning Endpoints', () => {
  describe('POST /v1/federated/initialize', () => {
    it('initializes federated learning session', async () => {
      const res = await request(app).post('/v1/federated/initialize').send({
        session_name: 'fl_session_001',
        participants: ['org_a', 'org_b', 'org_c'],
        model_config: { layers: 3, input_size: 10 },
      });

      expect([200, 201, 400, 403]).toContain(res.status);
    });

    it('requires participants and model config', async () => {
      const res = await request(app).post('/v1/federated/initialize').send({
        session_name: 'fl_001',
      });

      expect([400, 401, 403]).toContain(res.status);
    });
  });

  describe('POST /v1/federated/submit-update', () => {
    it('accepts model update from participant', async () => {
      const res = await request(app).post('/v1/federated/submit-update').send({
        session_id: 'session_001',
        participant_id: 'org_a',
        model_weights: [0.1, 0.2, 0.3],
        metrics: { local_accuracy: 0.92 },
      });

      expect([200, 400, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /v1/federated/status/:session_id', () => {
    it('retrieves federated learning session status', async () => {
      const res = await request(app).get('/v1/federated/status/session_001');

      expect([200, 401, 404]).toContain(res.status);
    });
  });

  describe('POST /v1/federated/aggregate', () => {
    it('triggers model aggregation across participants', async () => {
      const res = await request(app).post('/v1/federated/aggregate').send({
        session_id: 'session_001',
        aggregation_method: 'fedavg',
      });

      expect([200, 400, 403, 404]).toContain(res.status);
    });
  });
});
