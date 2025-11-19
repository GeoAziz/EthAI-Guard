const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/server');

function signToken(userId, role = 'user') {
  const secret = process.env.SECRET_KEY || 'secret';
  return jwt.sign({ sub: userId, role }, secret, { expiresIn: '15m' });
}

describe('RBAC protections', () => {
  test('reports: owner can list, other user forbidden, admin allowed', async () => {
    // create user A
    const regA = await request(app).post('/auth/register').send({ name: 'A', email: 'a@ex.com', password: 'passaaaa' });
    expect(regA.statusCode).toBe(200);
    const userA = regA.body.userId;
    const tokenA = signToken(userA, 'user');

    // create user B
    const regB = await request(app).post('/auth/register').send({ name: 'B', email: 'b@ex.com', password: 'passbbbb' });
    expect(regB.statusCode).toBe(200);
    const userB = regB.body.userId;
    const tokenB = signToken(userB, 'user');

    // owner access (A -> A) ok
    const r1 = await request(app).get(`/reports/${userA}`).set('Authorization', `Bearer ${tokenA}`);
    expect([200, 204]).toContain(r1.statusCode);

    // other user (B -> A) forbidden
    const r2 = await request(app).get(`/reports/${userA}`).set('Authorization', `Bearer ${tokenB}`);
    expect(r2.statusCode).toBe(403);

    // admin access
    const adminToken = signToken(userB, 'admin');
    const r3 = await request(app).get(`/reports/${userA}`).set('Authorization', `Bearer ${adminToken}`);
    expect([200, 204]).toContain(r3.statusCode);
  });

  test('model actions require admin', async () => {
    // Non-auth should be 401 (disable test-mode bypass with header)
    const m1 = await request(app).post('/v1/models/model-123/trigger-retrain').set('x-enforce-auth', '1').send({ reason: 'test' });
    expect(m1.statusCode).toBe(401);

    // User token should be 403
    const reg = await request(app).post('/auth/register').send({ name: 'U', email: 'u@ex.com', password: 'passcccc' });
    const userId = reg.body.userId;
    const userToken = signToken(userId, 'user');

    const m2 = await request(app)
      .post('/v1/models/model-123/trigger-retrain')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: 'test' });
    expect(m2.statusCode).toBe(403);

    // Admin token — may still fail downstream, but should not be 401/403
    const adminToken = signToken(userId, 'admin');
    const m3 = await request(app)
      .post('/v1/models/model-123/trigger-retrain')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'test' });
    expect([200, 400, 404, 500]).toContain(m3.statusCode);
  });
});
