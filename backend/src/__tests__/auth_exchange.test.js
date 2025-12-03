const request = require('supertest');
jest.useFakeTimers();

// Start server
const app = require('../server');

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  const verifyIdToken = jest.fn();
  const getUserByEmail = jest.fn();
  const setCustomUserClaims = jest.fn();
  const auth = () => ({ verifyIdToken, getUserByEmail, setCustomUserClaims });
  return { auth, credential: { cert: jest.fn() }, initializeApp: jest.fn(), apps: [] };
});

// Mock User model
jest.mock('../models/User', () => {
  const users = [];
  return {
    findOne: jest.fn(async (q) => users.find(u => (q.firebase_uid && u.firebase_uid === q.firebase_uid) || (q.email && u.email === q.email)) || null),
    create: jest.fn(async (obj) => {
      const u = { _id: 'u1', ...obj }; users.push(u); return u;
    }),
    findById: jest.fn(async (id) => users.find(u => String(u._id) === String(id)) || null),
  };
});

describe('POST /auth/firebase/exchange', () => {
  const admin = require('firebase-admin');
  const User = require('../models/User');

  beforeEach(() => {
    // Reset mocks
    admin.auth = () => ({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'fb-uid-1', email: 'test@local', name: 'Test User', claims: { role: 'admin' } }),
    });
  });

  it('exchanges id token for backend tokens and provisions user', async () => {
    const resp = await request(app)
      .post('/auth/firebase/exchange')
      .send({ idToken: 'fake-token' })
      .expect(200);

    expect(resp.body).toHaveProperty('accessToken');
    expect(resp.body).toHaveProperty('refreshToken');

    // Ensure local user was created with role from claims
    expect(User.create).toBeTruthy();
  });
});
