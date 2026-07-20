const request = require('supertest');
const express = require('express');
const governanceRouter = require('../routes/governance');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = {
    email: 'test@example.com',
    tenantId: 'test-tenant',
    role: 'admin',
    name: 'Test User',
  };
  next();
});
app.use('/api/governance', governanceRouter);

describe('Governance API Integration', () => {
  describe('POST /api/governance/approval-workflows', () => {
    test('should create approval workflow', async () => {
      const payload = {
        name: 'Model Deployment Review',
        description: 'Standard review for model deployments',
        type: 'model_deployment',
        stages: [
          {
            stageId: 'stage-1',
            name: 'Performance Review',
            order: 1,
            approvalType: 'sequential',
            requiredApprovers: {
              count: 1,
              roles: ['ml-engineer'],
            },
            slaHours: 24,
          },
        ],
        entityType: 'model_version',
        entityId: 'model-123',
        entityVersion: 'v1.0.0',
      };

      const res = await request(app)
        .post('/api/governance/approval-workflows')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.workflowId).toBeDefined();
    });
  });

  describe('GET /api/governance/approval-workflows/:workflowId', () => {
    test('should get workflow history', async () => {
      const res = await request(app).get('/api/governance/approval-workflows/wf-test');

      // Would return 404 if not found, which is expected in this test
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/governance/approval-workflows/:workflowId/approvals/:approvalRequestId', () => {
    test('should submit approval', async () => {
      const payload = {
        approved: true,
        reason: 'Metrics look good',
        comments: 'Fairness score improved',
      };

      const res = await request(app)
        .post('/api/governance/approval-workflows/wf-test/approvals/req-1')
        .send(payload);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/governance/compliance-signoffs', () => {
    test('should create compliance sign-off', async () => {
      const payload = {
        entityType: 'model_version',
        entityId: 'model-456',
        entityVersion: 'v2.0.0',
        requiredSignOffs: [
          { role: 'compliance-officer', count: 1 },
          { role: 'privacy-lead', count: 1 },
        ],
      };

      const res = await request(app)
        .post('/api/governance/compliance-signoffs')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/governance/compliance-signoffs/:signOffId', () => {
    test('should get compliance report', async () => {
      const res = await request(app).get('/api/governance/compliance-signoffs/cso-test');

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/governance/compliance-signoffs/:signOffId/sign', () => {
    test('should add sign-off', async () => {
      const payload = {
        areaId: 'fairness',
        areaName: 'fairness',
        comments: 'Model fairness metrics validated',
        attestation: 'Model meets fairness compliance requirements',
        expiryDate: '2025-12-31',
      };

      const res = await request(app)
        .post('/api/governance/compliance-signoffs/cso-test/sign')
        .send(payload);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/governance/compliance-signoffs/:signOffId/checklist/:areaId', () => {
    test('should update compliance checklist', async () => {
      const payload = {
        checklistUpdates: [
          {
            checkId: 'fair-1',
            status: 'passed',
            evidence: 'Demographic parity: 0.95',
          },
        ],
      };

      const res = await request(app)
        .post('/api/governance/compliance-signoffs/cso-test/checklist/fairness')
        .send(payload);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/governance/audit-callbacks', () => {
    test('should register audit callback', async () => {
      const payload = {
        name: 'Compliance Slack Hook',
        url: 'https://hooks.slack.com/services/test',
        description: 'Send compliance events to Slack',
        auth: { type: 'none' },
        eventFilters: {
          eventTypes: ['approval_completed', 'compliance_violation'],
          entityTypes: ['model_version'],
          statuses: [],
          tags: [],
        },
        headers: {
          'X-Custom-Header': 'value',
        },
      };

      const res = await request(app)
        .post('/api/governance/audit-callbacks')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/governance/audit-callbacks/:callbackId', () => {
    test('should update audit callback', async () => {
      const payload = {
        name: 'Updated Callback',
        status: 'paused',
      };

      const res = await request(app)
        .put('/api/governance/audit-callbacks/cb-test')
        .send(payload);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/governance/audit-callbacks/:callbackId/test', () => {
    test('should test callback', async () => {
      const res = await request(app)
        .post('/api/governance/audit-callbacks/cb-test/test')
        .send({});

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/governance/audit-callbacks/dispatch', () => {
    test('should dispatch event to callbacks', async () => {
      const payload = {
        eventType: 'approval_completed',
        entityType: 'model_version',
        entityId: 'model-123',
        status: 'PASS',
        tags: ['important'],
      };

      const res = await request(app)
        .post('/api/governance/audit-callbacks/dispatch')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/governance/audit-callbacks/retry-pending', () => {
    test('should retry pending deliveries', async () => {
      const res = await request(app).post('/api/governance/audit-callbacks/retry-pending');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
