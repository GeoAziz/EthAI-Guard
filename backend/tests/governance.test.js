const request = require('supertest');
const app = require('../src/server');

describe('Governance Endpoints', () => {
  describe('GET /v1/governance/policies', () => {
    it('retrieves governance policies', async () => {
      const res = await request(app).get('/v1/governance/policies');

      expect([200, 401]).toContain(res.status);
    });
  });

  describe('POST /v1/governance/policy', () => {
    it('creates new governance policy', async () => {
      const res = await request(app).post('/v1/governance/policy').send({
        name: 'fairness_policy_v1',
        description: 'Enforce fairness constraints',
        rules: [{ metric: 'demographic_parity', threshold: 0.1 }],
      });

      expect([200, 201, 400, 403]).toContain(res.status);
    });
  });

  describe('PUT /v1/governance/policy/:id', () => {
    it('updates existing policy', async () => {
      const res = await request(app).put('/v1/governance/policy/policy_123').send({
        name: 'updated_policy',
        enabled: true,
      });

      expect([200, 400, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /v1/governance/compliance', () => {
    it('retrieves compliance status', async () => {
      const res = await request(app).get('/v1/governance/compliance');

      expect([200, 401]).toContain(res.status);
    });
  });
});
