const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const ComplianceSignOff = require('../models/ComplianceSignOff');
const AuditCallbackService = require('../services/auditCallbackService');
const ApprovalWorkflowService = require('../services/approvalWorkflowService');
const logger = require('../utils/logger');

class GovernanceWorker {
  constructor(options = {}) {
    this.intervalMs = options.intervalMs || 60000; // 1 minute
    this.slaCheckIntervalMs = options.slaCheckIntervalMs || 300000; // 5 minutes
    this.callbackRetryIntervalMs = options.callbackRetryIntervalMs || 60000; // 1 minute
    this.complianceExpiryCheckMs = options.complianceExpiryCheckMs || 3600000; // 1 hour

    this.isRunning = false;
    this.timers = [];
  }

  start() {
    if (this.isRunning) {
      logger.warn({ msg: 'governance_worker_already_running' });
      return;
    }

    this.isRunning = true;
    logger.info({ msg: 'governance_worker_started' });

    // Check SLA expirations
    this.timers.push(
      setInterval(() => this._checkSLAExpirations(), this.slaCheckIntervalMs),
    );

    // Retry pending callback deliveries
    this.timers.push(
      setInterval(() => this._retryPendingCallbacks(), this.callbackRetryIntervalMs),
    );

    // Check for expiring compliance sign-offs
    this.timers.push(
      setInterval(() => this._checkExpiringSignOffs(), this.complianceExpiryCheckMs),
    );

    // Update governance metrics
    this.timers.push(
      setInterval(() => this._updateGovernanceMetrics(), this.intervalMs),
    );
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    this.timers.forEach(timer => clearInterval(timer));
    this.timers = [];
    this.isRunning = false;

    logger.info({ msg: 'governance_worker_stopped' });
  }

  // ============ PRIVATE METHODS ============

  async _checkSLAExpirations() {
    try {
      const workflows = await ApprovalWorkflow.find({
        overallStatus: { $in: ['pending', 'in_progress'] },
      });

      let processedCount = 0;
      for (const workflow of workflows) {
        await ApprovalWorkflowService.checkAndHandleSLAExpiry(workflow.workflowId);
        processedCount++;
      }

      if (processedCount > 0) {
        logger.debug({
          msg: 'sla_expiration_check_completed',
          workflowsChecked: processedCount,
        });
      }
    } catch (err) {
      logger.error({ err, msg: 'sla_expiration_check_failed' });
    }
  }

  async _retryPendingCallbacks() {
    try {
      const retryCount = await AuditCallbackService.retryPendingDeliveries();

      if (retryCount > 0) {
        logger.debug({
          msg: 'callback_delivery_retries_processed',
          count: retryCount,
        });
      }
    } catch (err) {
      logger.error({ err, msg: 'callback_delivery_retry_failed' });
    }
  }

  async _checkExpiringSignOffs() {
    try {
      const signOffs = await ComplianceSignOff.getNearingExpiry(30);

      for (const signOff of signOffs) {
        logger.warn({
          msg: 'compliance_signoff_expiring',
          signOffId: signOff.signOffId,
          entityId: signOff.entityId,
          expiringIn: '30 days',
        });

        // Could dispatch notification event here
      }

      if (signOffs.length > 0) {
        logger.debug({
          msg: 'compliance_expiry_check_completed',
          expiringCount: signOffs.length,
        });
      }
    } catch (err) {
      logger.error({ err, msg: 'compliance_expiry_check_failed' });
    }
  }

  async _updateGovernanceMetrics() {
    try {
      const [totalWorkflows, pendingWorkflows, approvedWorkflows, rejectedWorkflows] = await Promise.all([
        ApprovalWorkflow.countDocuments(),
        ApprovalWorkflow.countDocuments({ overallStatus: 'in_progress' }),
        ApprovalWorkflow.countDocuments({ overallStatus: 'approved' }),
        ApprovalWorkflow.countDocuments({ overallStatus: 'rejected' }),
      ]);

      const [totalSignOffs, pendingSignOffs, approvedSignOffs] = await Promise.all([
        ComplianceSignOff.countDocuments(),
        ComplianceSignOff.countDocuments({ overallStatus: { $in: ['draft', 'pending_review'] } }),
        ComplianceSignOff.countDocuments({ overallStatus: 'approved' }),
      ]);

      logger.debug({
        msg: 'governance_metrics_updated',
        workflows: {
          total: totalWorkflows,
          pending: pendingWorkflows,
          approved: approvedWorkflows,
          rejected: rejectedWorkflows,
        },
        signOffs: {
          total: totalSignOffs,
          pending: pendingSignOffs,
          approved: approvedSignOffs,
        },
      });
    } catch (err) {
      logger.error({ err, msg: 'governance_metrics_update_failed' });
    }
  }
}

module.exports = GovernanceWorker;
