const jwt = require('jsonwebtoken');

describe('authGuard edge cases', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.AUTH_PROVIDER;
    process.env.NODE_ENV = 'test';
  });

  test('returns 401 when token missing in production', () => {
    process.env.NODE_ENV = 'production';
    const { authGuard } = require('../src/middleware/authGuard');

    const req = { headers: {}, cookies: {} };
    const jsonMock = jest.fn();
    const res = { status: jest.fn(() => ({ json: jsonMock })) };
    const next = jest.fn();

    authGuard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'No token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization token is invalid', () => {
    process.env.NODE_ENV = 'production';
    const { authGuard } = require('../src/middleware/authGuard');

    const req = { headers: { authorization: 'Bearer not-a-valid-token' }, cookies: {} };
    const jsonMock = jest.fn();
    const res = { status: jest.fn(() => ({ json: jsonMock })) };
    const next = jest.fn();

    authGuard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });
});
