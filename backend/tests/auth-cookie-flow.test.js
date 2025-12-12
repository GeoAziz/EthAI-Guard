// auth-cookie-flow.test.js
// Integration test for cookie-based auth flow: /auth/firebase/exchange -> sets cookies,
// /auth/verify -> returns role, /auth/refresh -> rotates refresh cookie and returns access token.

jest.setTimeout(10000);

// Ensure cookie mode is enabled for the server under test
process.env.USE_COOKIE_REFRESH = '1';
process.env.NODE_ENV = 'test';
process.env.AUTH_PROVIDER = 'firebase';

// Mock firebase-admin before requiring app so server's exchange uses the mock
const mockVerify = jest.fn(async (idToken) => {
  // return a decoded Firebase token payload
  return {
    uid: 'fb-123',
    email: 'test@example.com',
    name: 'Test User',
    // include a role claim for testing
    role: 'user',
  };
});

jest.mock('firebase-admin', () => {
  return {
    auth: () => ({ verifyIdToken: mockVerify }),
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
  };
});

const request = require('supertest');
const app = require('../src/server');

describe('Cookie-based auth flow', () => {
  it('exchange sets HttpOnly cookies, verify returns role, refresh rotates token', async () => {
    const agent = request.agent(app);

    // 1) Exchange: client sends idToken and server should set accessToken+refreshToken cookies
    const exch = await agent.post('/auth/firebase/exchange').send({ idToken: 'fake-id-token-123' });
    expect(exch.status).toBe(200);
    // In cookie mode the response body is minimal
    expect(exch.body).toHaveProperty('status', 'ok');

    // Cookies should be set
    const cookies = exch.headers['set-cookie'] || [];
    expect(Array.isArray(cookies)).toBe(true);
    const hasAccess = cookies.some(c => c.startsWith('accessToken='));
    const hasRefresh = cookies.some(c => c.startsWith('refreshToken='));
    expect(hasAccess).toBe(true);
    expect(hasRefresh).toBe(true);

    // 2) Verify: call /auth/verify with agent (cookies forwarded)
    const ver = await agent.get('/auth/verify');
    expect(ver.status).toBe(200);
    expect(ver.body).toHaveProperty('userId');
    expect(ver.body).toHaveProperty('role');
    expect(ver.body.role).toBe('user');

    // 3) Refresh: call /auth/refresh; server should accept cookie and return new accessToken
    const ref = await agent.post('/auth/refresh').send({});
    expect(ref.status).toBe(200);
    // In cookie mode, refresh returns { accessToken }
    expect(ref.body).toHaveProperty('accessToken');
    const refreshCookies = ref.headers['set-cookie'] || [];
    const refreshed = refreshCookies.some(c => c.startsWith('refreshToken='));
    expect(refreshed).toBe(true);
  });
});
