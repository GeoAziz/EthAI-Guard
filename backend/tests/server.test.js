const request = require('supertest');
const app = require('../src/server');

describe('Auth and dataset flow', () => {
  let refreshToken;
  let accessToken;

  test('register -> login -> upload dataset -> get reports', async () => {
    // register
  const strongPassword = 'StrongPass123!';
  const reg = await request(app).post('/auth/register').send({ name: 'Test', email: 't@example.com', password: strongPassword });
    expect(reg.statusCode).toBe(200);

    // login
  const login = await request(app).post('/auth/login').send({ email: 't@example.com', password: strongPassword });
    expect(login.statusCode).toBe(200);
    accessToken = login.body.accessToken;
    refreshToken = login.body.refreshToken;
    expect(accessToken).toBeTruthy();

    // upload dataset
    const up = await request(app).post('/datasets/upload').set('Authorization', `Bearer ${accessToken}`).send({ name: 'demo', type: 'csv' });
    expect(up.statusCode).toBe(200);

    // get reports (empty)
    const reports = await request(app).get('/reports/1').set('Authorization', `Bearer ${accessToken}`);
    expect(reports.statusCode).toBe(200);
  });
});
