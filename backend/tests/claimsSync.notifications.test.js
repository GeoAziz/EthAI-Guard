const mockSend = jest.fn().mockResolvedValue(true);

describe('claims-sync notifications (unit)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('approve handler sends claims_sync_failed alert when firebase user not found', async () => {
    // Mock notifications
    jest.doMock('../src/notifications', () => ({ sendAlert: mockSend }));

    // Mock firebaseAdmin to return no user
    jest.doMock('../src/services/firebaseAdmin', () => ({
      getUserByEmail: jest.fn().mockResolvedValue(null),
      setCustomUserClaims: jest.fn().mockResolvedValue(true)
    }));

    // Mock User model used in approve flow
    const userStub = {
      _id: 'user-1',
      email: 'no-fb@example.com',
      role: 'admin',
      firebase_uid: null,
      save: jest.fn()
    };
    jest.doMock('../src/models/User', () => ({
      findOne: jest.fn().mockResolvedValue(userStub),
      create: jest.fn().mockResolvedValue(userStub)
    }));

    // Mock AccessRequest model so approve handler can load the record
    const arStub = { _id: 'ar-1', email: 'no-fb@example.com', status: 'pending', save: jest.fn() };
    jest.doMock('../src/models/AccessRequest', () => ({
      findById: jest.fn().mockResolvedValue(arStub)
    }));

  // Force non-test mode so the route uses the non in-memory branches
  const origNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  // Now require the router module (it will use the mocked modules above)
  const router = require('../src/routes/accessRequests');
  // restore original env
  process.env.NODE_ENV = origNodeEnv;

    // Find the approve route layer and extract the handler function
    const layer = router.stack.find(l => l.route && l.route.path === '/v1/access-requests/:id/approve');
    expect(layer).toBeDefined();
    // last stack item is the actual handler
    const handlerLayer = layer.route.stack[layer.route.stack.length - 1];
    expect(handlerLayer).toBeDefined();
    const handler = handlerLayer.handle;
    expect(typeof handler).toBe('function');

    // Prepare mock req/res
    const req = {
      params: { id: 'ar-1' },
      user: { sub: 'admin-1' }
    };
    let statusCode = 200;
    const res = {
      status: function(s) { statusCode = s; return this; },
      json: function(j) { this._body = j; return this; },
      _body: null
    };

    // Call the handler (it's async)
    await handler(req, res);

    // The approve flow always sends an approve notification; since firebase user is not found
    // it should also send a claims_sync_failed alert. Verify at least one call with that type.
    expect(mockSend).toHaveBeenCalled();
    const found = mockSend.mock.calls.find(c => c[0] && c[0].type === 'claims_sync_failed');
    expect(found).toBeDefined();
  });
});
