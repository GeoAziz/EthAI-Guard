const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ApprovalWorkflowService {
  static async createWorkflow(workflowData) {
    try {
      const workflow = new ApprovalWorkflow({
        workflowId: workflowData.workflowId || `wf-${Date.now()}-${uuidv4().slice(0, 8)}`,
        name: workflowData.name,
        description: workflowData.description,
        type: workflowData.type,
        stages: workflowData.stages || [],
        entityType: workflowData.entityType,
        entityId: workflowData.entityId,
        entityVersion: workflowData.entityVersion,
        initiatedBy: workflowData.initiatedBy,
        tenantId: workflowData.tenantId,
      });

      // Initialize approval requests for first stage
      if (workflow.stages.length > 0) {
        const firstStage = workflow.stages[0];
        const approvals = this._generateApprovalsForStage(firstStage);
        workflow.approvals = approvals;
        workflow.currentStage = 0;
        workflow.overallStatus = 'in_progress';

        workflow.events.push({
          type: 'workflow_initiated',
          actor: workflowData.initiatedBy,
          details: { stageCount: workflow.stages.length },
        });
      }

      await workflow.save();

      logger.info({
        msg: 'approval_workflow_created',
        workflowId: workflow.workflowId,
        type: workflow.type,
      });

      return workflow;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_create_approval_workflow' });
      throw err;
    }
  }

  static async submitApproval(workflowId, approvalRequestId, decision) {
    try {
      const workflow = await ApprovalWorkflow.findOne({ workflowId });
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const approval = workflow.approvals.find(a => a.requestId === approvalRequestId);
      if (!approval) {
        throw new Error('Approval request not found');
      }

      if (approval.status !== 'pending') {
        throw new Error(`Cannot approve: current status is ${approval.status}`);
      }

      // Update approval
      approval.status = decision.approved ? 'approved' : 'rejected';
      approval.decision = {
        approved: decision.approved,
        reason: decision.reason,
        comments: decision.comments,
        decisionTime: new Date(),
        decidedBy: decision.decidedBy,
      };

      workflow.events.push({
        type: 'approval_submitted',
        actor: decision.decidedBy,
        details: {
          approvalRequestId,
          approved: decision.approved,
          reason: decision.reason,
        },
      });

      // Check if stage is complete
      if (await this._isStageComplete(workflow)) {
        if (decision.approved) {
          await this._advanceToNextStage(workflow);
        } else {
          workflow.overallStatus = 'rejected';
          workflow.rejectionReason = decision.reason;
          workflow.rejectedAt = new Date();
          workflow.rejectedBy = decision.decidedBy;
        }
      }

      await workflow.save();

      logger.info({
        msg: 'approval_submitted',
        workflowId,
        approved: decision.approved,
      });

      return workflow;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_submit_approval', workflowId });
      throw err;
    }
  }

  static async delegateApproval(workflowId, approvalRequestId, delegateTo, reason) {
    try {
      const workflow = await ApprovalWorkflow.findOne({ workflowId });
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const approval = workflow.approvals.find(a => a.requestId === approvalRequestId);
      if (!approval || !approval.createdAt) {
        throw new Error('Approval request not found');
      }

      const stage = workflow.stages[workflow.currentStage];
      if (!stage || !stage.allowDelegation) {
        throw new Error('Delegation not allowed for this stage');
      }

      approval.status = 'delegated';
      approval.delegatedTo = {
        email: delegateTo,
        reason,
        delegatedAt: new Date(),
      };

      // Create new approval for delegated approver
      const newApproval = {
        requestId: `${approvalRequestId}-delegated-${uuidv4().slice(0, 8)}`,
        stageId: approval.stageId,
        stageName: approval.stageName,
        approverEmail: delegateTo,
        approverRole: approval.approverRole,
        status: 'pending',
        createdAt: new Date(),
        slaDeadline: this._calculateSLADeadline(stage.slaHours),
      };

      workflow.approvals.push(newApproval);

      workflow.events.push({
        type: 'approval_delegated',
        actor: approval.approverEmail,
        details: { delegatedTo: delegateTo, reason },
      });

      await workflow.save();

      logger.info({
        msg: 'approval_delegated',
        workflowId,
        delegatedTo: delegateTo,
      });

      return workflow;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_delegate_approval', workflowId });
      throw err;
    }
  }

  static async checkAndHandleSLAExpiry(workflowId) {
    try {
      const workflow = await ApprovalWorkflow.findOne({ workflowId });
      if (!workflow || !workflow.isPending()) {
        return;
      }

      const now = new Date();
      let hasExpired = false;

      workflow.approvals.forEach(approval => {
        if (approval.status === 'pending' && approval.slaDeadline && now > approval.slaDeadline) {
          approval.status = 'sla_expired';
          hasExpired = true;

          workflow.events.push({
            type: 'sla_expired',
            actor: 'system',
            details: {
              approvalRequestId: approval.requestId,
              deadline: approval.slaDeadline,
            },
          });

          // Auto-approve if configured
          const stage = workflow.stages.find(s => s.stageId === approval.stageId);
          if (stage && stage.autoApprovalIfPastSLA) {
            approval.status = 'approved';
            approval.decision = {
              approved: true,
              reason: 'Auto-approved due to SLA expiry',
              decisionTime: new Date(),
              decidedBy: 'system',
            };
          }
        }
      });

      if (hasExpired) {
        if (this._isStageComplete(workflow)) {
          await this._advanceToNextStage(workflow);
        }
        await workflow.save();
      }

      return workflow;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_check_sla', workflowId });
      throw err;
    }
  }

  static async getWorkflowHistory(workflowId) {
    try {
      const workflow = await ApprovalWorkflow.findOne({ workflowId });
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      return {
        workflow: workflow.toObject(),
        events: workflow.events,
        approvalsSummary: workflow.getApprovalsSummary(),
        slaStatus: workflow.getSLAStatus(),
      };
    } catch (err) {
      logger.error({ err, msg: 'failed_to_get_workflow_history', workflowId });
      throw err;
    }
  }

  static async getPendingApprovalsForUser(userEmail, userRole) {
    try {
      return await ApprovalWorkflow.getPendingForApprover(userEmail, userRole);
    } catch (err) {
      logger.error({ err, msg: 'failed_to_get_pending_approvals', userEmail });
      throw err;
    }
  }

  // Private helper methods
  static _generateApprovalsForStage(stage) {
    const approvals = [];
    const { count, roles } = stage.requiredApprovers;

    // In real implementation, would look up users with these roles
    for (let i = 0; i < count; i++) {
      approvals.push({
        requestId: `${stage.stageId}-${uuidv4().slice(0, 8)}`,
        stageId: stage.stageId,
        stageName: stage.name,
        approverEmail: `approver-${i}@company.com`,
        approverRole: roles[i % roles.length],
        status: 'pending',
        createdAt: new Date(),
        slaDeadline: this._calculateSLADeadline(stage.slaHours),
      });
    }

    return approvals;
  }

  static _calculateSLADeadline(slaHours = 24) {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + slaHours);
    return deadline;
  }

  static async _isStageComplete(workflow) {
    if (workflow.currentStage === undefined) {
      return false;
    }

    const stage = workflow.stages[workflow.currentStage];
    const stageApprovals = workflow.approvals.filter(a => a.stageId === stage.stageId);

    if (stage.approvalType === 'sequential') {
      return stageApprovals.every(a => a.status !== 'pending');
    } else if (stage.approvalType === 'parallel') {
      return stageApprovals.every(a => a.status !== 'pending');
    } else if (stage.approvalType === 'any-of') {
      return stageApprovals.some(a => a.status === 'approved');
    }

    return false;
  }

  static async _advanceToNextStage(workflow) {
    const nextStage = workflow.currentStage + 1;

    if (nextStage >= workflow.stages.length) {
      workflow.overallStatus = 'approved';
      workflow.approvedAt = new Date();
      workflow.completedAt = new Date();

      workflow.events.push({
        type: 'workflow_approved',
        actor: 'system',
        details: { completedAt: new Date() },
      });
    } else {
      const stage = workflow.stages[nextStage];
      const approvals = this._generateApprovalsForStage(stage);
      workflow.approvals.push(...approvals);
      workflow.currentStage = nextStage;

      workflow.events.push({
        type: 'stage_advanced',
        actor: 'system',
        details: { stageId: stage.stageId, stageName: stage.name },
      });
    }
  }

  static async handleWorkflowCompletion(workflow) {
    try {
      // Audit log the completion
      if (workflow.overallStatus === 'approved') {
        await AuditLog.create({
          timestamp: new Date(),
          event_type: 'approval_completed',
          model_id: workflow.entityId,
          model_version: workflow.entityVersion,
          actor: 'system',
          actor_type: 'system',
          action: `Approval workflow completed for ${workflow.type}`,
          status: 'PASS',
          details: {
            workflowId: workflow.workflowId,
            approvalsSummary: workflow.getApprovalsSummary(),
          },
        });
      }
    } catch (err) {
      logger.error({ err, msg: 'failed_to_audit_workflow_completion' });
    }
  }
}

module.exports = ApprovalWorkflowService;
