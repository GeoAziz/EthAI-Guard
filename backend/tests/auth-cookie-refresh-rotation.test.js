jest.setTimeout(15000);
process.env.USE_COOKIE_REFRESH = '1';
process.env.NODE_ENV = 'test';
process.env.AUTH_PROVIDER = 'firebase';

// Mock firebase-admin verifyIdToken for successful exchange
const mockVerify = jest.fn(async (idToken) => {
  return { uid: 'fb-789', email: 'refresh-rotation@example.com', name: 'Refresh Rotation', role: 'user' };
});

jest.mock('firebase-admin', () => ({
  auth: () => ({ verifyIdToken: mockVerify }),
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
}));

const request = require('supertest');
const app = require('../src/server');

describe('Refresh token rotation and replay handling', () => {
  it('rotates refresh token and rejects replay of old token', async () => {
  // 1) Exchange using an agent so cookies are stored automatically
  const agent = request.agent(app);
  const exch = await agent.post('/auth/firebase/exchange').send({ idToken: 'token-rot' });
  expect(exch.status).toBe(200);
  const setCookies = exch.headers['set-cookie'] || [];
  const refreshCookie = setCookies.find(c => c.startsWith('refreshToken='));
  expect(refreshCookie).toBeDefined();
  const oldRefresh = refreshCookie.split(';')[0].split('=')[1];

  // 2) Perform a refresh using the same agent (cookies present)
  const firstRefresh = await agent.post('/auth/refresh').send({});
    expect(firstRefresh.status).toBe(200);
    expect(firstRefresh.body).toHaveProperty('accessToken');
    const newCookies = firstRefresh.headers['set-cookie'] || [];
    const newRefreshCookie = newCookies.find(c => c.startsWith('refreshToken='));
    expect(newRefreshCookie).toBeDefined();
    const newRefresh = newRefreshCookie.split(';')[0].split('=')[1];
    expect(newRefresh).not.toBe(oldRefresh);

    // 3) Replay: attempt to call /auth/refresh using the old refresh token (simulate replay)
    const replayResp = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${oldRefresh}`)
      .send({});

    // Expect failure (401) due to invalid/ revoked/ rotated token
    expect(replayResp.status).toBe(401);
  });
});
