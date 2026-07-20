const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope');

const ApprovalWorkflowSchema = new mongoose.Schema({
  tenantId: { type: String, index: true },

  workflowId: { type: String, required: true, unique: true, index: true },

  // Workflow definition
  name: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['model_deployment', 'model_retirement', 'policy_change', 'config_update', 'data_change'],
    required: true,
    index: true,
  },

  // Approval stages
  stages: [{
    stageId: String,
    name: String,
    order: Number,
    approvalType: {
      type: String,
      enum: ['sequential', 'parallel', 'any-of'],
      default: 'sequential',
    },
    requiredApprovers: {
      count: { type: Number, default: 1 },
      roles: [String], // e.g., ['compliance-officer', 'model-owner']
    },
    slaHours: { type: Number, default: 24 },
    autoApprovalIfPastSLA: Boolean,
    allowDelegation: { type: Boolean, default: true },
    comments: {
      required: Boolean,
      minChars: Number,
    },
  }],

  // Current state
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'draft',
    index: true,
  },

  // Entity being approved
  entityType: {
    type: String,
    enum: ['model_version', 'model_card', 'policy', 'retraining_job'],
    required: true,
  },
  entityId: { type: String, required: true, index: true },
  entityVersion: String,

  // Approval requests within this workflow
  approvals: [{
    requestId: String,
    stageId: String,
    stageName: String,
    approverEmail: String,
    approverRole: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'delegated', 'sla_expired'],
      default: 'pending',
    },
    decision: {
      approved: Boolean,
      reason: String,
      comments: String,
      decisionTime: Date,
      decidedBy: String,
    },
    delegatedTo: {
      email: String,
      reason: String,
      delegatedAt: Date,
    },
    createdAt: { type: Date, default: Date.now },
    slaDeadline: Date,
  }],

  // Overall workflow state
  currentStage: Number,
  overallStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'approved', 'rejected', 'blocked'],
    default: 'pending',
    index: true,
  },

  rejectionReason: String,
  rejectedAt: Date,
  rejectedBy: String,

  approvedAt: Date,
  approvedBy: String,

  // Audit trail
  events: [{
    type: String,
    actor: String,
    actorRole: String,
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed,
  }],

  // Metadata
  initiatedBy: String,
  initiatedAt: { type: Date, default: Date.now },
  completedAt: Date,

  metadata: mongoose.Schema.Types.Mixed,
  tags: [String],

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'approval_workflows', timestamps: true });

ApprovalWorkflowSchema.index({ entityType: 1, entityId: 1, status: 1 });
ApprovalWorkflowSchema.index({ 'approvals.approverEmail': 1, 'approvals.status': 1 });
ApprovalWorkflowSchema.index({ createdAt: -1 });

ApprovalWorkflowSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

ApprovalWorkflowSchema.methods.isPending = function() {
  return this.overallStatus === 'pending' || this.overallStatus === 'in_progress';
};

ApprovalWorkflowSchema.methods.getApprovalsSummary = function() {
  const summary = {
    total: this.approvals.length,
    approved: 0,
    pending: 0,
    rejected: 0,
    delegated: 0,
  };
  this.approvals.forEach(a => {
    summary[a.status.replace('_', '')] = (summary[a.status.replace('_', '')] || 0) + 1;
  });
  return summary;
};

ApprovalWorkflowSchema.methods.getCurrentStageApprovals = function() {
  if (this.currentStage === undefined) return [];
  const stage = this.stages[this.currentStage];
  if (!stage) return [];
  return this.approvals.filter(a => a.stageId === stage.stageId);
};

ApprovalWorkflowSchema.methods.getSLAStatus = function() {
  const status = {};
  this.approvals.forEach(a => {
    if (a.slaDeadline) {
      const now = new Date();
      const isExpired = now > a.slaDeadline;
      status[a.requestId] = {
        deadline: a.slaDeadline,
        isExpired,
        hoursRemaining: (a.slaDeadline - now) / (1000 * 60 * 60),
      };
    }
  });
  return status;
};

ApprovalWorkflowSchema.statics.getPendingForApprover = function(approverEmail, role) {
  return this.find({
    'approvals.approverEmail': approverEmail,
    'approvals.status': 'pending',
    overallStatus: { $in: ['pending', 'in_progress'] },
  }).sort({ 'approvals.slaDeadline': 1 });
};

ApprovalWorkflowSchema.statics.getByEntity = function(entityType, entityId) {
  return this.find({ entityType, entityId }).sort({ createdAt: -1 });
};

ApprovalWorkflowSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('ApprovalWorkflow', ApprovalWorkflowSchema);
