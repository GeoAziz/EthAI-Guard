const request = require('supertest');
const app = require('../src/server');

jest.mock('axios');
const axios = require('axios');

describe('Integration: analyze flow (backend -> ai_core)', () => {
  test('authenticated /analyze forwards to ai_core and persists report', async () => {
    // register
  const strongPassword = 'StrongPass123!';
  const reg = await request(app).post('/auth/register').send({ name: 'Int', email: 'i@example.com', password: strongPassword });
  expect(reg.statusCode).toBe(200);

  // login
  const login = await request(app).post('/auth/login').send({ email: 'i@example.com', password: strongPassword });
    expect(login.statusCode).toBe(200);
    const accessToken = login.body.accessToken;
    expect(accessToken).toBeTruthy();

    // mock ai_core response
    const fakeAiResp = { data: { analysis_id: 'ai_123', summary: { n_rows: 3, fairness_score: 88.2 } } };
    axios.post.mockResolvedValueOnce(fakeAiResp);

    // call analyze
    const payload = { dataset_name: 'demo', data: { age: [20, 30], income: [100, 200] } };
    const res = await request(app)
      .post('/analyze')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('reportId');
    expect(res.body).toHaveProperty('analysisId', 'ai_123');
    expect(res.body.summary).toHaveProperty('n_rows', 3);
  });
});
