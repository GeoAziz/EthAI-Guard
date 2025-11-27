const jwt = require('jsonwebtoken');

describe('authGuard middleware (unit)', () => {
  let origEnv;

  beforeAll(() => {
    origEnv = { ...process.env };
  });

  afterAll(() => {
    process.env = origEnv;
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('test-mode bypass attaches test user and calls next', () => {
    process.env.NODE_ENV = 'test';
    jest.resetModules();
    const { authGuard } = require('../src/middleware/authGuard');

    const req = { headers: {}, cookies: {} };
    const res = {};
    const next = jest.fn();

    authGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.sub).toBe('user123');
    expect(req.role).toBeDefined();
    expect(req.userId).toBeDefined();
  });

  test('honors x-test-user-id and x-test-user-role in test mode', () => {
    process.env.NODE_ENV = 'test';
    jest.resetModules();
    const { authGuard } = require('../src/middleware/authGuard');

    const req = { headers: { 'x-test-user-id': 'abc', 'x-test-user-role': 'analyst' }, cookies: {} };
    const next = jest.fn();
    authGuard(req, {}, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.sub).toBe('abc');
    expect(req.user.role).toBe('analyst');
    expect(req.role).toBe('analyst');
  });

  test('JWT fallback verifies token from Authorization header', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_PROVIDER;
    jest.resetModules();
    const { authGuard } = require('../src/middleware/authGuard');

    const token = jwt.sign({ sub: 'jwt-user', role: 'user' }, process.env.SECRET_KEY || 'secret');
    const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const next = jest.fn();

    authGuard(req, {}, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.sub).toBe('jwt-user');
    expect(req.role).toBe('user');
  });

  test('cookie fallback verifies token from accessToken cookie', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_PROVIDER;
    jest.resetModules();
    const { authGuard } = require('../src/middleware/authGuard');

    const token = jwt.sign({ sub: 'cookie-user', role: 'user' }, process.env.SECRET_KEY || 'secret');
    const req = { headers: {}, cookies: { accessToken: token } };
    const next = jest.fn();

    authGuard(req, {}, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.sub).toBe('cookie-user');
    expect(req.userId).toBe('cookie-user');
  });

  test('delegates to firebaseAuth when AUTH_PROVIDER=firebase', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_PROVIDER = 'firebase';

    // Mock the firebaseAuth middleware and the firebaseAdmin init
    jest.doMock('../src/middleware/firebaseAuth', () => ({
      firebaseAuth: (req, res, next) => {
        req.user = { sub: 'fb-uid', role: 'user' };
        req.userId = 'fb-uid';
        req.role = 'user';
        return next();
      }
    }));
    jest.doMock('../src/services/firebaseAdmin', () => ({
      initFirebase: jest.fn()
    }));

    jest.resetModules();
    const { authGuard } = require('../src/middleware/authGuard');

    const req = { headers: {}, cookies: {} };
    const next = jest.fn();

    await authGuard(req, {}, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.sub).toBe('fb-uid');
    expect(req.userId).toBe('fb-uid');
  });
});
