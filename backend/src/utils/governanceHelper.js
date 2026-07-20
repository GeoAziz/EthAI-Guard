const ApprovalWorkflowService = require('../services/approvalWorkflowService');
const ComplianceSignOffService = require('../services/complianceSignOffService');
const AuditCallbackService = require('../services/auditCallbackService');
const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

class GovernanceHelper {
  /**
   * Initiate approval workflow for a model deployment
   */
  static async initiateDeploymentApproval(modelVersion, initiatedBy, tenantId) {
    try {
      const workflow = await ApprovalWorkflowService.createWorkflow({
        name: `Deployment Review: ${modelVersion}`,
        description: `Standard approval workflow for model deployment`,
        type: 'model_deployment',
        stages: [
          {
            stageId: 'performance-review',
            name: 'Performance Review',
            order: 1,
            approvalType: 'sequential',
            requiredApprovers: {
              count: 1,
              roles: ['ml-engineer'],
            },
            slaHours: 24,
            allowDelegation: true,
          },
          {
            stageId: 'fairness-review',
            name: 'Fairness Review',
            order: 2,
            approvalType: 'sequential',
            requiredApprovers: {
              count: 1,
              roles: ['fairness-reviewer'],
            },
            slaHours: 24,
            allowDelegation: true,
          },
          {
            stageId: 'compliance-review',
            name: 'Compliance Sign-Off',
            order: 3,
            approvalType: 'sequential',
            requiredApprovers: {
              count: 1,
              roles: ['compliance-officer'],
            },
            slaHours: 48,
            allowDelegation: false,
          },
        ],
        entityType: 'model_version',
        entityId: modelVersion,
        initiatedBy,
        tenantId,
      });

      await this._auditGovernanceEvent(modelVersion, 'deployment_approval_initiated', 'PASS', {
        workflowId: workflow.workflowId,
        stages: workflow.stages.length,
      });

      return workflow;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_initiate_deployment_approval', modelVersion });
      throw err;
    }
  }

  /**
   * Create compliance sign-off for model promotion
   */
  static async createModelComplianceSignOff(modelVersion, tenantId, createdBy) {
    try {
      const signOff = await ComplianceSignOffService.createSignOff({
        entityType: 'model_version',
        entityId: modelVersion,
        entityVersion: modelVersion,
        complianceAreas: undefined, // Use defaults
        requiredSignOffs: [
          { role: 'compliance-officer', count: 1 },
          { role: 'privacy-lead', count: 1 },
        ],
        regulatoryRequirements: [
          { regulation: 'EU AI Act', article: '6', section: 'High-Risk AI', status: 'pending' },
          { regulation: 'GDPR', article: '22', section: 'Automated Decision Making', status: 'pending' },
        ],
        createdBy,
        tenantId,
      });

      await this._auditGovernanceEvent(modelVersion, 'compliance_signoff_created', 'PASS', {
        signOffId: signOff.signOffId,
      });

      return signOff;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_create_model_compliance_signoff', modelVersion });
      throw err;
    }
  }

  /**
   * Register governance event callbacks
   */
  static async registerGovernanceCallbacks(tenantId, config = {}) {
    try {
      const callbacks = [];

      // Slack notification callback
      if (config.slackWebhook) {
        const slackCallback = await AuditCallbackService.registerCallback({
          name: 'Governance Slack Notifications',
          url: config.slackWebhook,
          description: 'Sends governance events to Slack',
          auth: { type: 'none' },
          eventFilters: {
            eventTypes: [
              'approval_completed',
              'approval_rejected',
              'compliance_violation',
              'sla_expired',
            ],
            entityTypes: ['model_version'],
            statuses: [],
            tags: [],
          },
          tenantId,
          createdBy: 'system',
        });
        callbacks.push(slackCallback);
      }

      // Email notification callback
      if (config.emailWebhook) {
        const emailCallback = await AuditCallbackService.registerCallback({
          name: 'Governance Email Notifications',
          url: config.emailWebhook,
          description: 'Sends governance events via email',
          auth: { type: 'api_key', credentials: { headerName: 'X-API-Key', token: config.emailApiKey } },
          eventFilters: {
            eventTypes: [
              'approval_completed',
              'approval_rejected',
              'compliance_violation',
            ],
            entityTypes: ['model_version'],
            statuses: [],
            tags: [],
          },
          tenantId,
          createdBy: 'system',
        });
        callbacks.push(emailCallback);
      }

      logger.info({
        msg: 'governance_callbacks_registered',
        tenantId,
        count: callbacks.length,
      });

      return callbacks;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_register_governance_callbacks', tenantId });
      throw err;
    }
  }

  /**
   * Check governance status for model
   */
  static async getModelGovernanceStatus(modelVersion, tenantId) {
    try {
      const ApprovalWorkflow = require('../models/ApprovalWorkflow');
      const ComplianceSignOff = require('../models/ComplianceSignOff');

      const workflows = await ApprovalWorkflow.getByEntity('model_version', modelVersion);
      const signOffs = await ComplianceSignOff.getByEntity('model_version', modelVersion);

      const latestWorkflow = workflows[0];
      const latestSignOff = signOffs[0];

      return {
        modelVersion,
        approval: latestWorkflow ? {
          workflowId: latestWorkflow.workflowId,
          status: latestWorkflow.overallStatus,
          currentStage: latestWorkflow.currentStage,
          stageName: latestWorkflow.stages[latestWorkflow.currentStage]?.name,
          approvalsSummary: latestWorkflow.getApprovalsSummary(),
          slaStatus: latestWorkflow.getSLAStatus(),
        } : null,
        compliance: latestSignOff ? {
          signOffId: latestSignOff.signOffId,
          status: latestSignOff.overallStatus,
          readinessScore: latestSignOff.readinessScore,
          signOffCoverage: latestSignOff.getSignOffCoverage(),
          complianceSummary: latestSignOff.getComplianceSummary(),
        } : null,
        governance: {
          readyForDeployment: this._isReadyForDeployment(latestWorkflow, latestSignOff),
          blockers: this._getBlockers(latestWorkflow, latestSignOff),
        },
      };
    } catch (err) {
      logger.error({ err, msg: 'failed_to_get_model_governance_status', modelVersion });
      throw err;
    }
  }

  /**
   * Dispatch governance event to registered callbacks
   */
  static async dispatchGovernanceEvent(eventType, entityId, entityVersion, details) {
    try {
      await AuditCallbackService.dispatchEvent({
        eventType,
        entityType: 'model_version',
        entityId,
        status: details.status || 'INFO',
        tags: details.tags || [],
      });
    } catch (err) {
      logger.warn({
        msg: 'failed_to_dispatch_governance_event',
        eventType,
        entityId,
        error: err.message,
      });
      // Don't throw - callback dispatch failures shouldn't block main flow
    }
  }

  /**
   * Audit a governance event
   */
  static async _auditGovernanceEvent(entityId, action, status, details) {
    try {
      if (process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === '1') {
        return;
      }

      await AuditLog.create({
        timestamp: new Date(),
        event_type: 'governance_event',
        model_id: entityId,
        model_version: entityId,
        actor: 'system',
        actor_type: 'system',
        action,
        status,
        details,
      });
    } catch (err) {
      logger.warn({ err, msg: 'failed_to_audit_governance_event' });
    }
  }

  static _isReadyForDeployment(workflow, signOff) {
    if (!workflow) {
      return false;
    }

    if (workflow.overallStatus !== 'approved') {
      return false;
    }

    if (signOff && signOff.overallStatus !== 'approved') {
      return false;
    }

    return true;
  }

  static _getBlockers(workflow, signOff) {
    const blockers = [];

    if (workflow && workflow.overallStatus === 'rejected') {
      const stageIndex = workflow.currentStage;
      const stage = workflow.stages[stageIndex];
      blockers.push({
        type: 'approval_rejected',
        stage: stage?.name,
        reason: workflow.rejectionReason,
      });
    }

    if (signOff && signOff.overallStatus === 'rejected') {
      blockers.push({
        type: 'compliance_rejected',
        reason: 'Compliance sign-off not approved',
      });
    }

    const pendingApprovals = workflow?.approvals.filter(a => a.status === 'pending').length || 0;
    if (pendingApprovals > 0) {
      blockers.push({
        type: 'pending_approvals',
        count: pendingApprovals,
      });
    }

    return blockers;
  }
}

module.exports = GovernanceHelper;
