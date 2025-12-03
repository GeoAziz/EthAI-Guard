/* eslint-env jest */
// Tests for POST /auth/firebase/exchange

process.env.USE_IN_MEMORY = '1'; // force in-memory mode for tests

const request = require('supertest');

// Mock firebase-admin before loading the app
const mockVerify = jest.fn();
const mockAuth = {
  verifyIdToken: mockVerify,
};

jest.mock('firebase-admin', () => ({
  auth: () => mockAuth,
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
}));

describe('POST /auth/firebase/exchange', () => {
  let app;

  beforeAll(() => {
    // require app after mocks
    app = require('../server');
  });

  afterEach(() => {
    mockVerify.mockReset();
  });

  test('returns 400 when idToken missing', async () => {
    const res = await request(app).post('/auth/firebase/exchange').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'id_token_required');
  });

  test('exchanges valid id token and returns access + refresh tokens', async () => {
    const decoded = { uid: 'firebase-uid-1', email: 'user@example.com', name: 'User', role: 'admin' };
    mockVerify.mockResolvedValue(decoded);

    const res = await request(app).post('/auth/firebase/exchange').send({ idToken: 'fake.token' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    // accessToken should be a string (JWT)
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });
});
