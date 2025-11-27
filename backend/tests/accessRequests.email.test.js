const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg-1' });

describe('accessRequests email hooks', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('approve flow sends email when emailUser=true', async () => {
    // Mock notifications orchestrator to include sendAlertEmail (no real nodemailer)
    const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
    jest.doMock('../src/notifications', () => ({ sendAlert: jest.fn().mockResolvedValue({}), sendAlertEmail: mockSendEmail }));

    // Mock User & AccessRequest models
    const userStub = { _id: 'user-1', email: 'u@example.com', role: 'admin', firebase_uid: null, save: jest.fn() };
    jest.doMock('../src/models/User', () => ({ findOne: jest.fn().mockResolvedValue(userStub), create: jest.fn().mockResolvedValue(userStub) }));
    const arStub = { _id: 'ar-1', email: 'u@example.com', status: 'pending', save: jest.fn() };
    jest.doMock('../src/models/AccessRequest', () => ({ findById: jest.fn().mockResolvedValue(arStub) }));

    // Mock firebaseAdmin (user not found)
    jest.doMock('../src/services/firebaseAdmin', () => ({ getUserByEmail: jest.fn().mockResolvedValue(null), setCustomUserClaims: jest.fn().mockResolvedValue(true) }));

    // Load router with non-test env to hit non in-memory branches
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const router = require('../src/routes/accessRequests');
    process.env.NODE_ENV = orig;

    const layer = router.stack.find(l => l.route && l.route.path === '/v1/access-requests/:id/approve');
    const handler = layer.route.stack[layer.route.stack.length - 1].handle;

    const req = { params: { id: 'ar-1' }, user: { sub: 'admin-1' }, body: { emailUser: true } };
    const res = { status: () => ({ json: () => ({}) }), json: () => ({}) };

    await handler(req, res);

    expect(require('../src/notifications').sendAlertEmail).toHaveBeenCalled();
  });

  test('reject flow sends email when emailUser=true', async () => {
    const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
    jest.doMock('../src/notifications', () => ({ sendAlert: jest.fn().mockResolvedValue({}), sendAlertEmail: mockSendEmail }));

    const arStub = { _id: 'ar-2', email: 'u2@example.com', status: 'pending', save: jest.fn() };
    jest.doMock('../src/models/AccessRequest', () => ({ findById: jest.fn().mockResolvedValue(arStub) }));

    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const router = require('../src/routes/accessRequests');
    process.env.NODE_ENV = orig;

    const layer = router.stack.find(l => l.route && l.route.path === '/v1/access-requests/:id/reject');
    const handler = layer.route.stack[layer.route.stack.length - 1].handle;

    const req = { params: { id: 'ar-2' }, user: { sub: 'admin-1' }, body: { emailUser: true } };
    const res = { status: () => ({ json: () => ({}) }), json: () => ({}) };

    await handler(req, res);

    expect(require('../src/notifications').sendAlertEmail).toHaveBeenCalled();
  });
});
