/* eslint-env jest */
// Integration test: promote -> should call firebase-admin.setCustomUserClaims

process.env.USE_IN_MEMORY = '1'; // force in-memory mode for tests

const request = require('supertest');

// Prepare mocks for firebase-admin
const mockSetCustomUserClaims = jest.fn().mockResolvedValue(true);
const mockGetUserByEmail = jest.fn().mockResolvedValue({ uid: 'mock-uid-123' });

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  auth: () => ({
    setCustomUserClaims: mockSetCustomUserClaims,
    getUserByEmail: mockGetUserByEmail,
  }),
}));

describe('POST /v1/users/promote', () => {
  let app;

  beforeAll(() => {
    // require app after mocks are set
    app = require('../server');
  });

  beforeEach(() => {
    mockSetCustomUserClaims.mockClear();
    mockGetUserByEmail.mockClear();
  });

  test('promotes user and sets custom claims when firebase-admin available', async () => {
    // In in-memory mode maybeAuth will inject an admin user if no Authorization header is provided
    const res = await request(app)
      .post('/v1/users/promote')
      .send({ email: 'promote-test@example.com', role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('claimsSync');
    expect(res.body.claimsSync).toHaveProperty('status', 'success');

    // ensure firebase-admin was called to get user and set claims
    expect(mockGetUserByEmail).toHaveBeenCalledWith('promote-test@example.com');
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('mock-uid-123', { role: 'admin' });
  });
});
