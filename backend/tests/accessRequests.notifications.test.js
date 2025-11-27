const request = require('supertest');

describe('accessRequests notifications', () => {
  let app;
  const mockSend = jest.fn().mockResolvedValue({ success: true });

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // mock notifications module before requiring app/routes
    jest.doMock('../src/notifications', () => ({
      sendAlert: mockSend
    }));
    app = require('../src/server');
  });

  afterAll(() => {
    jest.resetModules();
  });

  test('approve triggers notification sendAlert (best-effort)', async () => {
    const agent = request(app);

    // create request as normal user
    const createRes = await agent.post('/v1/access-requests').send({ reason: 'I need access to dashboard' });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;

    // approve as admin (test mode header)
    const approveRes = await agent.post(`/v1/access-requests/${id}/approve`).set('x-test-user-role', 'admin').send();
    expect(approveRes.status).toBe(200);
    // ensure notification was attempted
    expect(mockSend).toHaveBeenCalled();
    const callArg = mockSend.mock.calls[0][0];
    expect(callArg).toBeDefined();
    expect(callArg.type).toBe('access_request_approved');
    expect(callArg.details).toBeDefined();
  });

  test('reject triggers notification sendAlert (best-effort)', async () => {
    const agent = request(app);

    const createRes = await agent.post('/v1/access-requests').send({ reason: 'please reject' });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;

    const rejectRes = await agent.post(`/v1/access-requests/${id}/reject`).set('x-test-user-role', 'admin').send();
    expect(rejectRes.status).toBe(200);
    expect(mockSend).toHaveBeenCalled();
    const lastCall = mockSend.mock.calls[mockSend.mock.calls.length - 1][0];
    expect(lastCall.type).toBe('access_request_rejected');
  });
});
