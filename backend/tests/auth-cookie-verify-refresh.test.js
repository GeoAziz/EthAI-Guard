jest.setTimeout(10000);
process.env.USE_COOKIE_REFRESH = '1';
process.env.NODE_ENV = 'test';
process.env.AUTH_PROVIDER = 'firebase';

// Mock firebase-admin verifyIdToken for successful exchange
const mockVerify = jest.fn(async (idToken) => {
  return { uid: 'fb-456', email: 'verify-refresh@example.com', name: 'Verify Refresh', role: 'user' };
});

jest.mock('firebase-admin', () => ({
  auth: () => ({ verifyIdToken: mockVerify }),
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
}));

const request = require('supertest');
const app = require('../src/server');

describe('Verify endpoint with only refresh cookie', () => {
  it('accepts refresh cookie, issues new access cookie and returns role', async () => {
    const agent = request.agent(app);
    const exch = await agent.post('/auth/firebase/exchange').send({ idToken: 'good-token' });
    expect(exch.status).toBe(200);

    // Extract refresh token cookie value
    const setCookies = exch.headers['set-cookie'] || [];
    const refreshCookie = setCookies.find(c => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    const refreshValue = refreshCookie.split(';')[0].split('=')[1];

    // Call /auth/verify but only send refresh cookie (no accessToken)
    const resp = await request(app)
      .get('/auth/verify')
      .set('Cookie', `refreshToken=${refreshValue}`)
      .send();

    expect(resp.status).toBe(200);
    expect(resp.body).toHaveProperty('userId');
    expect(resp.body).toHaveProperty('role');
    expect(resp.body.role).toBe('user');

    // Ensure accessToken cookie was set in response
    const respCookies = resp.headers['set-cookie'] || [];
    const hasAccess = respCookies.some(c => c.startsWith('accessToken='));
    expect(hasAccess).toBe(true);
  });
});
