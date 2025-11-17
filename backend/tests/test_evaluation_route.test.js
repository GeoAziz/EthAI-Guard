const request = require('supertest');
const app = require('../src/server');

describe('POST /v1/evaluate', () => {
  it('returns validation error for missing fields', async () => {
    const res = await request(app).post('/v1/evaluate').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_failed');
  });

  it('evaluates and returns structured response', async () => {
    const payload = {
      user_id: 'user123',
      model_id: 'modelABC',
      input_features: { feature_a: [1,2,3], sensitive: ['A','A','B'] },
      context: { sensitive_attribute: 'sensitive' }
    };
    const res = await request(app).post('/v1/evaluate').send(payload);
    expect(res.status).toBe(200);
    expect(res.body.risk).toBeDefined();
    expect(res.body.simulation).toBeDefined();
    expect(res.body.rules.fairness).toBeDefined();
    expect(['low','medium','high']).toContain(res.body.risk.level);
  });

  it('flags high risk when fairness imbalance and extreme output combine', async () => {
    const payload = {
      user_id: 'user999',
      model_id: 'modelHIGH',
      input_features: { feature_a: [9999,9999,9999], sensitive: ['X','X','X','X','X','X','X','X'] },
      context: { sensitive_attribute: 'sensitive' }
    };
    const res = await request(app).post('/v1/evaluate').send(payload);
    expect(res.status).toBe(200);
    expect(res.body.risk.level).toBe('high');
    expect(res.body.risk.reasons.length).toBeGreaterThan(0);
  });
});
