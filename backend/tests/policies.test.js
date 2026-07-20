const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const Policy = require('../src/models/Policy');
const PolicyEvaluation = require('../src/models/PolicyEvaluation');

describe('Policies API', () => {
  const mockPolicy = {
    name: 'Test Policy',
    description: 'A test fairness policy',
    rules: {
      fairness_metrics: {
        statistical_parity: { min: 0.8, max: 1.0 },
        equal_opportunity: { min: 0.7, max: 1.0 },
      },
      thresholds: {
        fairness_score_min: 0.75,
        risk_tolerance_max: 0.25,
      },
      enforcement: {
        auto_alert: true,
        block_deployment: false,
        require_review: true,
      },
    },
  };

  describe('POST /v1/policies', () => {
    it('should create a new policy', async () => {
      const res = await request(app)
        .post('/v1/policies')
        .set('x-user', 'test-user')
        .send(mockPolicy);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(mockPolicy.name);
      expect(res.body.status).toBe('draft');
      expect(res.body.version).toBe(1);
    });

    it('should reject policy without name', async () => {
      const res = await request(app)
        .post('/v1/policies')
        .set('x-user', 'test-user')
        .send({ description: 'No name policy' });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /v1/policies', () => {
    beforeEach(async () => {
      await request(app)
        .post('/v1/policies')
        .set('x-user', 'test-user')
        .send(mockPolicy);
    });

    it('should get all policies', async () => {
      const res = await request(app)
        .get('/v1/policies')
        .set('x-user', 'test-user');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should filter policies by status', async () => {
      const res = await request(app)
        .get('/v1/policies?status=draft')
        .set('x-user', 'test-user');

      expect(res.status).toBe(200);
      expect(res.body.every((p: any) => p.status === 'draft')).toBe(true);
    });
  });

  describe('POST /v1/policies/:id/activate', () => {
    it('should activate a policy', async () => {
      const createRes = await request(app)
        .post('/v1/policies')
        .set('x-user', 'test-user')
        .send(mockPolicy);

      const policyId = createRes.body._id;

      const activateRes = await request(app)
        .post(`/v1/policies/${policyId}/activate`)
        .set('x-user', 'test-user');

      expect(activateRes.status).toBe(200);
      expect(activateRes.body.status).toBe('active');
    });
  });

  describe('POST /v1/policies/:id/evaluate', () => {
    it('should evaluate policy against metrics', async () => {
      const createRes = await request(app)
        .post('/v1/policies')
        .set('x-user', 'test-user')
        .send(mockPolicy);

      const policyId = createRes.body._id;

      const evalRes = await request(app)
        .post(`/v1/policies/${policyId}/evaluate`)
        .set('x-user', 'test-user')
        .send({
          metrics: {
            statistical_parity: 0.85,
            equal_opportunity: 0.75,
          },
        });

      expect(evalRes.status).toBe(200);
      expect(evalRes.body.results).toBeDefined();
      expect(evalRes.body.results.passed).toBeDefined();
    });

    it('should detect policy violations', async () => {
      const createRes = await request(app)
        .post('/v1/policies')
        .set('x-user', 'test-user')
        .send(mockPolicy);

      const policyId = createRes.body._id;

      const evalRes = await request(app)
        .post(`/v1/policies/${policyId}/evaluate`)
        .set('x-user', 'test-user')
        .send({
          metrics: {
            statistical_parity: 0.5, // Below min of 0.8
            equal_opportunity: 0.75,
          },
        });

      expect(evalRes.status).toBe(200);
      expect(evalRes.body.results.passed).toBe(false);
      expect(evalRes.body.results.violations.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /v1/policies/:id', () => {
    it('should update a policy and create version', async () => {
      const createRes = await request(app)
        .post('/v1/policies')
        .set('x-user', 'test-user')
        .send(mockPolicy);

      const policyId = createRes.body._id;

      const updateRes = await request(app)
        .put(`/v1/policies/${policyId}`)
        .set('x-user', 'test-user')
        .send({
          description: 'Updated description',
          rules: {
            ...mockPolicy.rules,
            thresholds: {
              fairness_score_min: 0.8, // Changed from 0.75
              risk_tolerance_max: 0.2,
            },
          },
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.version).toBe(2);
      expect(updateRes.body.description).toBe('Updated description');
    });
  });

  describe('DELETE /v1/policies/:id', () => {
    it('should delete a policy', async () => {
      const createRes = await request(app)
        .post('/v1/policies')
        .set('x-user', 'test-user')
        .send(mockPolicy);

      const policyId = createRes.body._id;

      const deleteRes = await request(app)
        .delete(`/v1/policies/${policyId}`)
        .set('x-user', 'test-user');

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });
  });

  describe('GET /v1/policies/:id/evaluations', () => {
    it('should get policy evaluation history', async () => {
      const createRes = await request(app)
        .post('/v1/policies')
        .set('x-user', 'test-user')
        .send(mockPolicy);

      const policyId = createRes.body._id;

      // Create evaluation
      await request(app)
        .post(`/v1/policies/${policyId}/evaluate`)
        .set('x-user', 'test-user')
        .send({
          metrics: { statistical_parity: 0.85 },
        });

      const evalRes = await request(app)
        .get(`/v1/policies/${policyId}/evaluations`)
        .set('x-user', 'test-user');

      expect(evalRes.status).toBe(200);
      expect(evalRes.body.evaluations).toBeDefined();
      expect(evalRes.body.total).toBeGreaterThan(0);
    });
  });
});
