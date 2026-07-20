const express = require('express');
const { authGuard, requireRole } = require('../middleware/authGuard');
const { verifyTenantIsolation, auditLog } = require('../middleware/tenantGuard');
const ApprovalWorkflowService = require('../services/approvalWorkflowService');
const ComplianceSignOffService = require('../services/complianceSignOffService');
const AuditCallbackService = require('../services/auditCallbackService');
const NotificationsService = require('../services/notificationsService');
const logger = require('../utils/logger');

const router = express.Router();

// ============ APPROVAL WORKFLOWS ============

router.post('/approval-workflows', authGuard, verifyTenantIsolation, auditLog('create_workflow', 'approval'), async (req, res, next) => {
  try {
    const { name, description, type, stages, entityType, entityId, entityVersion } = req.body;
    const initiatedBy = req.user?.email || 'system';

    const workflow = await ApprovalWorkflowService.createWorkflow({
      name,
      description,
      type,
      stages,
      entityType,
      entityId,
      entityVersion,
      initiatedBy,
      tenantId: req.user?.tenantId,
    });

    // Notify approvers about new workflow
    if (stages && stages.length > 0) {
      const approverEmails = stages.flatMap(stage => stage.approvers || []);
      const approverIds = approverEmails.map(email => email);
      NotificationsService.createBulk(approverIds, req.user?.tenantId, {
        title: 'New Approval Request',
        body: `A new approval workflow "${name}" requires your attention`,
        type: 'info',
        link: `/dashboard/reviewer/approvals/${workflow._id}`,
        metadata: {
          entityType: 'approval_workflow',
          entityId: workflow._id,
          source: 'governance',
        },
      }).catch(err => {
        logger.warn({ err }, 'approval_notification_create_failed');
      });
    }

    res.status(201).json({
      success: true,
      message: 'Approval workflow created',
      data: workflow,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/approval-workflows/:workflowId', authGuard, verifyTenantIsolation, auditLog('get_workflow', 'approval'), async (req, res, next) => {
  try {
    const workflow = await ApprovalWorkflowService.getWorkflowHistory(req.params.workflowId);
    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/approval-workflows/:workflowId/approvals/:approvalRequestId', async (req, res, next) => {
  try {
    const { approved, reason, comments } = req.body;
    const decidedBy = req.user?.email || 'system';

    const workflow = await ApprovalWorkflowService.submitApproval(
      req.params.workflowId,
      req.params.approvalRequestId,
      {
        approved,
        reason,
        comments,
        decidedBy,
      },
    );

    // Notify workflow initiator about decision
    if (workflow && workflow.initiatedBy) {
      NotificationsService.create(workflow.initiatedBy, req.user?.tenantId, {
        title: approved ? 'Approval Granted' : 'Approval Rejected',
        body: `${decidedBy} has ${approved ? 'approved' : 'rejected'} your approval request`,
        type: approved ? 'success' : 'error',
        link: `/dashboard/analyst/approvals/${req.params.workflowId}`,
        metadata: {
          entityType: 'approval_decision',
          entityId: req.params.workflowId,
          source: 'governance',
        },
      }).catch(err => {
        logger.warn({ err }, 'approval_decision_notification_create_failed');
      });
    }

    res.json({
      success: true,
      message: approved ? 'Approval submitted' : 'Rejection submitted',
      data: workflow,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/approval-workflows/:workflowId/approvals/:approvalRequestId/delegate', async (req, res, next) => {
  try {
    const { delegateTo, reason } = req.body;

    const workflow = await ApprovalWorkflowService.delegateApproval(
      req.params.workflowId,
      req.params.approvalRequestId,
      delegateTo,
      reason,
    );

    res.json({
      success: true,
      message: 'Approval delegated',
      data: workflow,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/approval-workflows/pending/:userEmail', async (req, res, next) => {
  try {
    const workflows = await ApprovalWorkflowService.getPendingApprovalsForUser(
      req.params.userEmail,
      req.query.role,
    );

    res.json({
      success: true,
      data: workflows,
      count: workflows.length,
    });
  } catch (err) {
    next(err);
  }
});

// ============ COMPLIANCE SIGN-OFFS ============

router.post('/compliance-signoffs', async (req, res, next) => {
  try {
    const { entityType, entityId, entityVersion, requiredSignOffs, reviewDeadline } = req.body;
    const createdBy = req.user?.email || 'system';

    const signOff = await ComplianceSignOffService.createSignOff({
      entityType,
      entityId,
      entityVersion,
      requiredSignOffs,
      reviewDeadline,
      createdBy,
      tenantId: req.user?.tenantId,
    });

    res.status(201).json({
      success: true,
      message: 'Compliance sign-off created',
      data: signOff,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/compliance-signoffs/:signOffId', async (req, res, next) => {
  try {
    const report = await ComplianceSignOffService.getComplianceReport(req.params.signOffId);

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/compliance-signoffs/:signOffId/sign', async (req, res, next) => {
  try {
    const { areaId, areaName, comments, attestation, expiryDate } = req.body;
    const email = req.user?.email || 'system';
    const name = req.user?.name || 'System User';
    const role = req.user?.role || 'system';

    const signOff = await ComplianceSignOffService.addSignOff(req.params.signOffId, {
      areaId,
      areaName,
      comments,
      attestation,
      expiryDate,
      signedOffBy: { email, name, role },
    });

    res.json({
      success: true,
      message: 'Sign-off submitted',
      data: signOff,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/compliance-signoffs/:signOffId/checklist/:areaId', async (req, res, next) => {
  try {
    const { checklistUpdates } = req.body;
    const verifiedBy = req.user?.email || 'system';

    const updatedChecklist = checklistUpdates.map(update => ({
      ...update,
      verifiedBy,
    }));

    const signOff = await ComplianceSignOffService.updateComplianceChecklist(
      req.params.signOffId,
      req.params.areaId,
      updatedChecklist,
    );

    res.json({
      success: true,
      message: 'Checklist updated',
      data: signOff,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/compliance-signoffs/:signOffId/revoke/:signOffRequestId', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const revokedBy = req.user?.email || 'system';

    const signOff = await ComplianceSignOffService.revokeSignOff(
      req.params.signOffId,
      req.params.signOffRequestId,
      reason,
      revokedBy,
    );

    res.json({
      success: true,
      message: 'Sign-off revoked',
      data: signOff,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/compliance-signoffs/:signOffId/risk-assessment', async (req, res, next) => {
  try {
    const { overallRisk, identifiedRisks, mitigationStatus } = req.body;

    const signOff = await ComplianceSignOffService.assessRisks(req.params.signOffId, {
      overallRisk,
      identifiedRisks,
      mitigationStatus,
    });

    res.json({
      success: true,
      message: 'Risk assessment updated',
      data: signOff,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/compliance-signoffs/pending', async (req, res, next) => {
  try {
    const signOffs = await ComplianceSignOffService.getNearingExpiry(
      req.user?.tenantId,
      req.query.daysThreshold || 30,
    );

    res.json({
      success: true,
      data: signOffs,
      count: signOffs.length,
    });
  } catch (err) {
    next(err);
  }
});

// ============ AUDIT CALLBACKS ============

router.post('/audit-callbacks', authGuard, requireRole('admin'), verifyTenantIsolation, async (req, res, next) => {
  try {
    const { name, url, description, auth, headers, eventFilters, delivery, tags } = req.body;
    const createdBy = req.user?.email || 'system';

    const callback = await AuditCallbackService.registerCallback({
      name,
      url,
      description,
      auth,
      headers,
      eventFilters,
      delivery,
      tags,
      createdBy,
      tenantId: req.user?.tenantId,
    });

    res.status(201).json({
      success: true,
      message: 'Audit callback registered',
      data: callback,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/audit-callbacks/:callbackId', authGuard, requireRole('admin'), verifyTenantIsolation, async (req, res, next) => {
  try {
    const { name, url, description, auth, headers, eventFilters, delivery, status, tags } = req.body;

    const callback = await AuditCallbackService.updateCallback(req.params.callbackId, {
      name,
      url,
      description,
      auth,
      headers,
      eventFilters,
      delivery,
      status,
      tags,
    });

    res.json({
      success: true,
      message: 'Audit callback updated',
      data: callback,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/audit-callbacks/:callbackId/test', authGuard, requireRole('admin'), verifyTenantIsolation, async (req, res, next) => {
  try {
    const result = await AuditCallbackService.testCallback(req.params.callbackId, req.body);

    res.json({
      success: result.success,
      message: result.success ? 'Test successful' : result.error,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/audit-callbacks/:callbackId/disable', authGuard, requireRole('admin'), verifyTenantIsolation, async (req, res, next) => {
  try {
    const { reason } = req.body;

    const callback = await AuditCallbackService.disableCallback(req.params.callbackId, reason);

    res.json({
      success: true,
      message: 'Audit callback disabled',
      data: callback,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/audit-callbacks/:callbackId/metrics', authGuard, requireRole('admin'), verifyTenantIsolation, async (req, res, next) => {
  try {
    const metrics = await AuditCallbackService.getCallbackMetrics(req.params.callbackId);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/audit-callbacks/dispatch', authGuard, requireRole('admin'), verifyTenantIsolation, async (req, res, next) => {
  try {
    const { eventType, entityType, entityId, status, tags } = req.body;

    const deliveries = await AuditCallbackService.dispatchEvent({
      eventType,
      entityType,
      entityId,
      status,
      tags,
    });

    res.json({
      success: true,
      message: 'Event dispatched to callbacks',
      data: { deliveries },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/audit-callbacks/retry-pending', authGuard, requireRole('admin'), async (req, res, next) => {
  try {
    const count = await AuditCallbackService.retryPendingDeliveries();

    res.json({
      success: true,
      message: `${count} deliveries retried`,
      data: { retriedCount: count },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
