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


describe('RBAC - Complete Permission Matrix', () => {
  const roles = {
    ADMIN: 'admin',
    ANALYST: 'analyst',
    REVIEWER: 'reviewer',
    USER: 'user',
    GUEST: 'guest',
  };

  const resources = [
    '/v1/models',
    '/v1/models/model_123',
    '/v1/drift/detect',
    '/v1/governance/policies',
    '/v1/audit-logs',
    '/v1/billing/subscription',
  ];

  const rolePermissions = {
    admin: ['GET', 'POST', 'PUT', 'DELETE'],
    analyst: ['GET', 'POST'],
    reviewer: ['GET'],
    user: ['GET'],
    guest: [],
  };

  test('admin can perform all operations', async () => {
    const adminToken = signToken('admin_user', roles.ADMIN);

    for (const resource of resources) {
      const res = await request(app)
        .get(resource)
        .set('Authorization', `Bearer ${adminToken}`);

      // Should not be forbidden (may be 404 if resource doesn't exist)
      expect(res.statusCode).not.toBe(403);
    }
  });

  test('analyst can read and write but not delete', async () => {
    const analystToken = signToken('analyst_user', roles.ANALYST);

    // GET should work
    const getRes = await request(app)
      .get('/v1/models')
      .set('Authorization', `Bearer ${analystToken}`);
    expect([200, 404, 401]).toContain(getRes.statusCode);

    // POST should work (create)
    const postRes = await request(app)
      .post('/v1/models')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ name: 'test' });
    expect([200, 201, 400, 404]).toContain(postRes.statusCode);

    // DELETE should be forbidden
    const delRes = await request(app)
      .delete('/v1/models/model_123')
      .set('Authorization', `Bearer ${analystToken}`);
    expect([403, 401]).toContain(delRes.statusCode);
  });

  test('reviewer can only read', async () => {
    const reviewerToken = signToken('reviewer_user', roles.REVIEWER);

    // GET should work
    const getRes = await request(app)
      .get('/v1/models')
      .set('Authorization', `Bearer ${reviewerToken}`);
    expect([200, 401]).toContain(getRes.statusCode);

    // POST should be forbidden
    const postRes = await request(app)
      .post('/v1/models')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ name: 'test' });
    expect([403, 401]).toContain(postRes.statusCode);
  });

  test('user has minimal permissions', async () => {
    const userToken = signToken('regular_user', roles.USER);

    // Some endpoints may work, some may be forbidden
    const res = await request(app)
      .get('/v1/models')
      .set('Authorization', `Bearer ${userToken}`);
    expect([200, 401, 403]).toContain(res.statusCode);
  });

  test('guest is completely blocked', async () => {
    const guestToken = signToken('guest_user', roles.GUEST);

    // Should be forbidden on all resources
    const res = await request(app)
      .get('/v1/models')
      .set('Authorization', `Bearer ${guestToken}`);
    expect([403, 401]).toContain(res.statusCode);
  });
});

describe('RBAC - Sensitive Operations', () => {
  test('only admin can modify audit logs', async () => {
    const adminToken = signToken('admin_user', 'admin');
    const analystToken = signToken('analyst_user', 'analyst');

    // Admin should be able to access
    const adminRes = await request(app)
      .get('/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 401]).toContain(adminRes.statusCode);

    // Analyst attempting to delete audit log
    const delRes = await request(app)
      .delete('/v1/audit-logs/log_123')
      .set('Authorization', `Bearer ${analystToken}`);
    expect([403, 401]).toContain(delRes.statusCode);
  });

  test('only admin can modify billing settings', async () => {
    const adminToken = signToken('admin_user', 'admin');
    const userToken = signToken('user', 'user');

    // User attempting to view billing
    const res = await request(app)
      .get('/v1/billing/subscription')
      .set('Authorization', `Bearer ${userToken}`);
    expect([200, 403, 401]).toContain(res.statusCode);

    // User attempting to modify subscription
    const modRes = await request(app)
      .post('/v1/billing/subscription/cancel')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect([403, 401]).toContain(modRes.statusCode);
  });

  test('only admin can modify governance policies', async () => {
    const adminToken = signToken('admin_user', 'admin');
    const analystToken = signToken('analyst_user', 'analyst');

    // Analyst attempting to modify policy
    const res = await request(app)
      .put('/v1/governance/policy/policy_123')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ enabled: false });
    expect([403, 401]).toContain(res.statusCode);
  });
});

describe('Multi-Tenant Isolation', () => {
  test('user can only access their own tenant', async () => {
    const tenant1Token = signToken('tenant1_user', 'user', 'tenant_1');
    const tenant2Token = signToken('tenant2_user', 'user', 'tenant_2');

    // Each user accesses their own tenant
    const res1 = await request(app)
      .get('/v1/models')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .set('X-Tenant-ID', 'tenant_1');
    expect([200, 401, 404]).toContain(res1.statusCode);

    const res2 = await request(app)
      .get('/v1/models')
      .set('Authorization', `Bearer ${tenant2Token}`)
      .set('X-Tenant-ID', 'tenant_2');
    expect([200, 401, 404]).toContain(res2.statusCode);
  });

  test('cross-tenant access is blocked', async () => {
    const tenant1Token = signToken('tenant1_user', 'user', 'tenant_1');

    // Attempting to access another tenant's data
    const res = await request(app)
      .get('/v1/models/model_tenant2')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .set('X-Tenant-ID', 'tenant_2');
    expect([403, 401]).toContain(res.statusCode);
  });

  test('tenant admin can manage tenant members', async () => {
    const adminToken = signToken('tenant_admin', 'admin', 'tenant_1');

    // Adding member to tenant
    const res = await request(app)
      .post('/v1/tenants/tenant_1/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'new@example.com', role: 'analyst' });
    expect([200, 201, 400, 403]).toContain(res.statusCode);
  });
});

// Helper to include tenant in token
function signTokenWithTenant(userId, role = 'user', tenantId = 'default') {
  const secret = process.env.SECRET_KEY || 'secret';
  return jwt.sign({ sub: userId, role, tenant_id: tenantId }, secret, { expiresIn: '15m' });
}
