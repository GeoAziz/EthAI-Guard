jest.setTimeout(10000);
process.env.USE_COOKIE_REFRESH = '1';
process.env.NODE_ENV = 'test';
process.env.AUTH_PROVIDER = 'firebase';

// Mock firebase-admin to throw on verifyIdToken
jest.mock('firebase-admin', () => {
  return {
    auth: () => ({ verifyIdToken: jest.fn(async () => { throw new Error('invalid token'); }) }),
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
  };
});

const request = require('supertest');
const app = require('../src/server');

describe('Exchange failure when Firebase token invalid', () => {
  it('returns 401 for invalid id token', async () => {
    const res = await request(app).post('/auth/firebase/exchange').send({ idToken: 'bad-token' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});
