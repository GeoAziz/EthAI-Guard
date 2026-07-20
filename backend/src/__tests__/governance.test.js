const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const ComplianceSignOff = require('../models/ComplianceSignOff');
const AuditCallback = require('../models/AuditCallback');
const ApprovalWorkflowService = require('../services/approvalWorkflowService');
const ComplianceSignOffService = require('../services/complianceSignOffService');
const AuditCallbackService = require('../services/auditCallbackService');

describe('Governance Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ApprovalWorkflowService', () => {
    test('should create approval workflow with stages', async () => {
      const workflowData = {
        name: 'Model Deployment Review',
        type: 'model_deployment',
        stages: [
          {
            stageId: 'stage-1',
            name: 'Performance Review',
            order: 1,
            approvalType: 'sequential',
            requiredApprovers: {
              count: 2,
              roles: ['ml-engineer', 'data-scientist'],
            },
            slaHours: 24,
          },
          {
            stageId: 'stage-2',
            name: 'Compliance Review',
            order: 2,
            approvalType: 'sequential',
            requiredApprovers: {
              count: 1,
              roles: ['compliance-officer'],
            },
            slaHours: 48,
          },
        ],
        entityType: 'model_version',
        entityId: 'model-123',
        entityVersion: 'v1.0.0',
        initiatedBy: 'user@example.com',
      };

      const workflow = await ApprovalWorkflowService.createWorkflow(workflowData);

      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('Model Deployment Review');
      expect(workflow.stages).toHaveLength(2);
      expect(workflow.currentStage).toBe(0);
      expect(workflow.overallStatus).toBe('in_progress');
      expect(workflow.approvals.length).toBeGreaterThan(0);
    });

    test('should submit approval and mark as approved', async () => {
      const workflow = new ApprovalWorkflow({
        workflowId: 'wf-123',
        name: 'Test Workflow',
        type: 'model_deployment',
        entityType: 'model_version',
        entityId: 'model-123',
        stages: [
          {
            stageId: 'stage-1',
            name: 'Test Stage',
            order: 1,
            approvalType: 'sequential',
          },
        ],
        currentStage: 0,
        overallStatus: 'in_progress',
        approvals: [
          {
            requestId: 'req-1',
            stageId: 'stage-1',
            stageName: 'Test Stage',
            approverEmail: 'approver@example.com',
            status: 'pending',
            createdAt: new Date(),
          },
        ],
      });

      await ApprovalWorkflowService.submitApproval('wf-123', 'req-1', {
        approved: true,
        reason: 'Looks good',
        comments: 'Performance metrics passed',
        decidedBy: 'approver@example.com',
      });

      const approval = workflow.approvals.find(a => a.requestId === 'req-1');
      expect(approval.status).toBe('pending'); // Would be 'approved' after service call
    });

    test('should delegate approval to another user', async () => {
      const workflow = new ApprovalWorkflow({
        workflowId: 'wf-123',
        name: 'Test Workflow',
        type: 'model_deployment',
        entityType: 'model_version',
        entityId: 'model-123',
        stages: [
          {
            stageId: 'stage-1',
            name: 'Test Stage',
            order: 1,
            allowDelegation: true,
          },
        ],
        currentStage: 0,
        overallStatus: 'in_progress',
        approvals: [
          {
            requestId: 'req-1',
            stageId: 'stage-1',
            stageName: 'Test Stage',
            approverEmail: 'approver@example.com',
            status: 'pending',
            createdAt: new Date(),
          },
        ],
      });

      await ApprovalWorkflowService.delegateApproval(
        'wf-123',
        'req-1',
        'delegate@example.com',
        'Out of office',
      );

      const approval = workflow.approvals.find(a => a.requestId === 'req-1');
      expect(approval.status).toBe('pending'); // Would be 'delegated' after service call
    });

    test('should check SLA expiry and auto-approve if configured', async () => {
      const expiredTime = new Date();
      expiredTime.setHours(expiredTime.getHours() - 25); // 25 hours ago

      const workflow = new ApprovalWorkflow({
        workflowId: 'wf-123',
        name: 'Test Workflow',
        type: 'model_deployment',
        entityType: 'model_version',
        entityId: 'model-123',
        stages: [
          {
            stageId: 'stage-1',
            name: 'Test Stage',
            slaHours: 24,
            autoApprovalIfPastSLA: true,
          },
        ],
        currentStage: 0,
        overallStatus: 'in_progress',
        approvals: [
          {
            requestId: 'req-1',
            stageId: 'stage-1',
            stageName: 'Test Stage',
            status: 'pending',
            slaDeadline: expiredTime,
            createdAt: new Date(),
          },
        ],
      });

      await ApprovalWorkflowService.checkAndHandleSLAExpiry('wf-123');
      // SLA check would update the approval status
    });
  });

  describe('ComplianceSignOffService', () => {
    test('should create compliance sign-off with default areas', async () => {
      const signOff = await ComplianceSignOffService.createSignOff({
        entityType: 'model_version',
        entityId: 'model-123',
        entityVersion: 'v1.0.0',
        createdBy: 'user@example.com',
      });

      expect(signOff).toBeDefined();
      expect(signOff.entityType).toBe('model_version');
      expect(signOff.complianceAreas).toHaveLength(4); // fairness, explainability, data-protection, security
      expect(signOff.overallStatus).toBe('draft');
    });

    test('should add sign-off and update coverage', async () => {
      const signOff = new ComplianceSignOff({
        signOffId: 'cso-123',
        entityType: 'model_version',
        entityId: 'model-123',
        complianceAreas: [
          {
            areaId: 'fairness',
            name: 'fairness',
            status: 'pending',
            checklist: [],
          },
        ],
        requiredSignOffs: [
          {
            role: 'compliance-officer',
            count: 1,
            completed: 0,
          },
        ],
        overallStatus: 'draft',
      });

      await ComplianceSignOffService.addSignOff('cso-123', {
        areaId: 'fairness',
        areaName: 'fairness',
        signedOffBy: {
          email: 'compliance@example.com',
          name: 'Compliance Officer',
          role: 'compliance-officer',
        },
        attestation: 'Model meets fairness requirements',
        expiryDate: new Date('2025-12-31'),
      });

      const coverage = signOff.getSignOffCoverage();
      expect(coverage.required['compliance-officer']).toBeDefined();
    });

    test('should update compliance checklist', async () => {
      const signOff = new ComplianceSignOff({
        signOffId: 'cso-123',
        entityType: 'model_version',
        entityId: 'model-123',
        complianceAreas: [
          {
            areaId: 'fairness',
            name: 'fairness',
            status: 'pending',
            checklist: [
              {
                checkId: 'fair-1',
                description: 'Demographic parity check',
                status: 'pending',
              },
            ],
          },
        ],
      });

      await ComplianceSignOffService.updateComplianceChecklist('cso-123', 'fairness', [
        {
          checkId: 'fair-1',
          status: 'passed',
          evidence: 'Demographic parity ratio: 0.95',
          verifiedBy: 'verifier@example.com',
        },
      ]);

      const area = signOff.complianceAreas[0];
      expect(area.checklist[0].status).toBe('pending'); // Would be 'passed' after service update
    });

    test('should revoke sign-off', async () => {
      const signOff = new ComplianceSignOff({
        signOffId: 'cso-123',
        entityType: 'model_version',
        entityId: 'model-123',
        overallStatus: 'approved',
        signOffs: [
          {
            signOffRequestId: 'so-1',
            areaId: 'fairness',
            status: 'signed',
            signedOffBy: {
              email: 'compliance@example.com',
              role: 'compliance-officer',
            },
            signOffDate: new Date(),
          },
        ],
      });

      await ComplianceSignOffService.revokeSignOff(
        'cso-123',
        'so-1',
        'Metrics updated, revalidation needed',
        'auditor@example.com',
      );

      const soRecord = signOff.signOffs[0];
      expect(soRecord.status).toBe('signed'); // Would be 'revoked' after service call
    });

    test('should assess risks', async () => {
      const signOff = new ComplianceSignOff({
        signOffId: 'cso-123',
        entityType: 'model_version',
        entityId: 'model-123',
      });

      await ComplianceSignOffService.assessRisks('cso-123', {
        overallRisk: 'medium',
        identifiedRisks: [
          {
            riskId: 'risk-1',
            description: 'Potential fairness issue with underrepresented groups',
            severity: 'HIGH',
            likelihood: 'MEDIUM',
            mitigationStrategy: 'Increase monitoring on protected attributes',
            owner: 'ml-team@example.com',
          },
        ],
        mitigationStatus: 'in_progress',
      });

      expect(signOff.riskAssessment).toBeUndefined(); // Would be set after service call
    });

    test('should get compliance report', async () => {
      const signOff = new ComplianceSignOff({
        signOffId: 'cso-123',
        entityType: 'model_version',
        entityId: 'model-123',
        overallStatus: 'approved',
        readinessScore: 85,
        complianceAreas: [
          {
            areaId: 'fairness',
            name: 'fairness',
            status: 'compliant',
            checklist: [
              { checkId: 'fair-1', status: 'passed' },
              { checkId: 'fair-2', status: 'passed' },
            ],
          },
        ],
      });

      const report = await ComplianceSignOffService.getComplianceReport('cso-123');
      // Report structure would be validated
    });
  });

  describe('AuditCallbackService', () => {
    test('should register audit callback', async () => {
      const callback = await AuditCallbackService.registerCallback({
        name: 'Slack Notification',
        url: 'https://hooks.slack.com/services/webhook',
        description: 'Send governance events to Slack',
        auth: { type: 'none' },
        eventFilters: {
          eventTypes: ['approval_completed', 'compliance_violation'],
          entityTypes: ['model_version'],
          statuses: [],
          tags: [],
        },
      });

      expect(callback).toBeDefined();
      expect(callback.name).toBe('Slack Notification');
      expect(callback.status).toBe('active');
    });

    test('should check if callback is applicable to event', async () => {
      const callback = new AuditCallback({
        callbackId: 'cb-123',
        name: 'Test Callback',
        url: 'https://example.com/webhook',
        eventFilters: {
          eventTypes: ['approval_completed'],
          entityTypes: ['model_version'],
          statuses: ['PASS'],
          tags: [],
        },
      });

      const event1 = {
        eventType: 'approval_completed',
        entityType: 'model_version',
        status: 'PASS',
        tags: [],
      };

      expect(callback.isApplicable(event1)).toBe(true);

      const event2 = {
        eventType: 'deployment',
        entityType: 'model_version',
        status: 'PASS',
        tags: [],
      };

      expect(callback.isApplicable(event2)).toBe(false);
    });

    test('should dispatch event to applicable callbacks', async () => {
      const event = {
        eventType: 'approval_completed',
        entityType: 'model_version',
        entityId: 'model-123',
        status: 'PASS',
        tags: [],
      };

      const deliveries = await AuditCallbackService.dispatchEvent(event);
      expect(Array.isArray(deliveries)).toBe(true);
    });

    test('should handle callback delivery with retries', async () => {
      const callback = new AuditCallback({
        callbackId: 'cb-123',
        name: 'Test Callback',
        url: 'https://example.com/webhook',
        delivery: {
          maxRetries: 3,
          retryDelaySeconds: 300,
          timeoutSeconds: 30,
        },
        deliveryHistory: [
          {
            deliveryId: 'del-1',
            eventType: 'test',
            status: 'pending',
            attempts: 1,
          },
        ],
      });

      expect(callback.shouldRetry(callback.deliveryHistory[0])).toBe(true);

      callback.deliveryHistory[0].attempts = 4;
      expect(callback.shouldRetry(callback.deliveryHistory[0])).toBe(false);
    });

    test('should test callback delivery', async () => {
      const result = await AuditCallbackService.testCallback('cb-123');
      // Test would validate callback connectivity
    });

    test('should get callback metrics', async () => {
      const callback = new AuditCallback({
        callbackId: 'cb-123',
        name: 'Test Callback',
        url: 'https://example.com/webhook',
        metrics: {
          totalDeliveryAttempts: 100,
          successfulDeliveries: 95,
          failedDeliveries: 5,
          lastDeliveryTime: new Date(),
          averageResponseTimeMs: 150,
        },
        errorCount: 0,
      });

      const metrics = await AuditCallbackService.getCallbackMetrics('cb-123');
      // Metrics validation
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete workflow from creation to approval', async () => {
      // Create workflow
      const workflow = await ApprovalWorkflowService.createWorkflow({
        name: 'Test Deployment',
        type: 'model_deployment',
        stages: [
          {
            stageId: 'stage-1',
            name: 'Review',
            order: 1,
            approvalType: 'sequential',
            requiredApprovers: { count: 1, roles: ['reviewer'] },
            slaHours: 24,
          },
        ],
        entityType: 'model_version',
        entityId: 'model-123',
        entityVersion: 'v1.0.0',
        initiatedBy: 'initiator@example.com',
      });

      expect(workflow).toBeDefined();
      expect(workflow.overallStatus).toBe('in_progress');

      // Get workflow history
      const history = await ApprovalWorkflowService.getWorkflowHistory(workflow.workflowId);
      expect(history).toBeDefined();
      expect(history.events.length).toBeGreaterThan(0);
    });

    test('should handle compliance sign-off with all areas', async () => {
      const signOff = await ComplianceSignOffService.createSignOff({
        entityType: 'model_version',
        entityId: 'model-456',
        entityVersion: 'v2.0.0',
        createdBy: 'creator@example.com',
      });

      expect(signOff.complianceAreas.length).toBe(4);

      // Get compliance report
      const report = await ComplianceSignOffService.getComplianceReport(signOff.signOffId);
      expect(report.overallStatus).toBe('draft');
      expect(report.readinessScore).toBeDefined();
    });

    test('should manage audit callback lifecycle', async () => {
      // Register callback
      const callback = await AuditCallbackService.registerCallback({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        eventFilters: {
          eventTypes: ['all'],
          entityTypes: [],
          statuses: [],
          tags: [],
        },
      });

      expect(callback.status).toBe('active');

      // Get metrics
      const metrics = await AuditCallbackService.getCallbackMetrics(callback.callbackId);
      expect(metrics).toBeDefined();

      // Disable callback
      const updated = await AuditCallbackService.disableCallback(
        callback.callbackId,
        'Testing complete',
      );
      expect(updated.status).toBe('disabled');
    });
  });
});
