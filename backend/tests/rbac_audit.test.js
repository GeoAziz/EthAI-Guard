describe('RBAC middleware audit logging', () => {
  afterEach(() => jest.resetModules());

  test('requireRole logs authorization_failed when role is insufficient', () => {
    // Mock the logger.withRequest to capture warn calls
    const warnMock = jest.fn();
    const mockLogger = { withRequest: () => ({ warn: warnMock }) };

    jest.doMock('../src/logger', () => mockLogger);

    const { requireRole } = require('../src/middleware/rbac');

    const middleware = requireRole('admin');

    const req = { role: 'user', userId: 'u-123', path: '/v1/admin', method: 'POST' };
    const res = { status: jest.fn(() => ({ json: jest.fn() })) };
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(warnMock).toHaveBeenCalled();
    const callArgs = warnMock.mock.calls[0];
    // First arg is the payload, second arg is the message key
    const payload = callArgs[0];
    const msg = callArgs[1];
    expect(msg).toBe('authorization_failed');
    expect(payload.user_id).toBe('u-123');
    expect(payload.required_roles).toEqual(['admin']);
    expect(payload.actual_role).toBe('user');
  });
});
