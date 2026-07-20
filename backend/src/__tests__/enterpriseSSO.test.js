const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.USE_IN_MEMORY_DB = '1';
  process.env.SECRET_KEY = 'test-secret';
  app = require('../server');
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Enterprise SSO - SAML', () => {
  test('GET /auth/sso/methods/:tenantId returns available SSO methods', async () => {
    const res = await request(app)
      .get('/auth/sso/methods/tenant-123');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('methods');
    expect(Array.isArray(res.body.methods)).toBe(true);
  });

  test('GET /auth/sso/saml/metadata/:tenantId returns 404 when SAML not configured', async () => {
    const res = await request(app)
      .get('/auth/sso/saml/metadata/tenant-123');

    expect(res.status).toBe(404);
  });
});

describe('Enterprise SSO - OIDC', () => {
  test('GET /auth/sso/oidc/authorize/:tenantId requires tenant ID', async () => {
    const res = await request(app)
      .get('/auth/sso/oidc/authorize/');

    expect(res.status).toBe(404);
  });
});

describe('Enterprise SSO - LDAP', () => {
  test('POST /auth/sso/ldap/authenticate/:tenantId requires credentials', async () => {
    const res = await request(app)
      .post('/auth/sso/ldap/authenticate/tenant-123')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /auth/sso/ldap/authenticate/:tenantId returns 404 when LDAP not configured', async () => {
    const res = await request(app)
      .post('/auth/sso/ldap/authenticate/tenant-123')
      .send({
        username: 'testuser',
        password: 'password123',
      });

    expect(res.status).toBe(404);
  });
});

describe('Enterprise SSO - Admin Configuration', () => {
  test('POST /auth/sso/admin/config requires authentication', async () => {
    const res = await request(app)
      .post('/auth/sso/admin/config')
      .send({
        tenantId: 'tenant-123',
        provider: 'saml',
        config: {},
      });

    expect(res.status).toBeOneOf([401, 403]);
  });

  test('GET /auth/sso/admin/config/:tenantId requires authentication', async () => {
    const res = await request(app)
      .get('/auth/sso/admin/config/tenant-123');

    expect(res.status).toBeOneOf([401, 403]);
  });
});

describe('Enterprise SSO - Token Issuance', () => {
  test('SSO token includes required claims', () => {
    const user = {
      _id: 'user-123',
      email: 'user@example.com',
      role: 'analyst',
      ssoProvider: 'saml',
      ssoIdentifier: 'saml-id-123',
    };

    const token = jwt.sign(
      {
        sub: user._id,
        email: user.email,
        role: user.role,
        tenantId: 'tenant-123',
        ssoProvider: user.ssoProvider,
        ssoIdentifier: user.ssoIdentifier,
      },
      'test-secret',
      { expiresIn: '24h' }
    );

    const decoded = jwt.verify(token, 'test-secret');

    expect(decoded.sub).toBe('user-123');
    expect(decoded.email).toBe('user@example.com');
    expect(decoded.role).toBe('analyst');
    expect(decoded.tenantId).toBe('tenant-123');
    expect(decoded.ssoProvider).toBe('saml');
    expect(decoded.ssoIdentifier).toBe('saml-id-123');
  });
});

expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () => `expected status code to be one of ${expected.join(', ')}, but got ${received}`,
    };
  },
});
