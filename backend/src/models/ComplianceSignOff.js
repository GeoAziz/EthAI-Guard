const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope');

const ComplianceSignOffSchema = new mongoose.Schema({
  tenantId: { type: String, index: true },

  signOffId: { type: String, required: true, unique: true, index: true },

  // Entity being signed off
  entityType: {
    type: String,
    enum: ['model_version', 'model_card', 'deployment', 'policy', 'update'],
    required: true,
  },
  entityId: { type: String, required: true, index: true },
  entityVersion: String,

  // Compliance areas
  complianceAreas: [{
    areaId: String,
    name: {
      type: String,
      enum: [
        'fairness',
        'explainability',
        'data_protection',
        'security',
        'regulatory',
        'ethical',
        'operational',
      ],
    },
    status: {
      type: String,
      enum: ['pending', 'compliant', 'non_compliant', 'conditional'],
      default: 'pending',
    },
    checklist: [{
      checkId: String,
      description: String,
      required: Boolean,
      status: {
        type: String,
        enum: ['pending', 'passed', 'failed', 'na'],
        default: 'pending',
      },
      evidence: String,
      verifiedBy: String,
      verifiedAt: Date,
    }],
  }],

  // Sign-offs
  signOffs: [{
    signOffRequestId: String,
    areaId: String,
    areaName: String,
    signedOffBy: {
      email: String,
      name: String,
      role: String, // e.g., 'compliance-officer', 'privacy-lead', 'ethics-reviewer'
    },
    signOffDate: { type: Date, default: Date.now },
    expiryDate: Date,
    status: {
      type: String,
      enum: ['signed', 'revoked', 'expired'],
      default: 'signed',
    },
    comments: String,
    attestation: String, // Statement of compliance
    revokedAt: Date,
    revokedBy: String,
    revokedReason: String,
  }],

  // Requirements
  regulatoryRequirements: [{
    regulation: String, // e.g., 'EU AI Act', 'GDPR', 'FCA Handbook'
    article: String,
    section: String,
    status: {
      type: String,
      enum: ['compliant', 'non_compliant', 'under_review'],
    },
    evidence: String,
    verifiedDate: Date,
  }],

  // Overall status
  overallStatus: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'conditional_approval', 'rejected'],
    default: 'draft',
    index: true,
  },

  readinessScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  // Risk assessment
  riskAssessment: {
    overallRisk: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    identifiedRisks: [{
      riskId: String,
      description: String,
      severity: String,
      likelihood: String,
      mitigationStrategy: String,
      owner: String,
    }],
    mitigationStatus: String,
  },

  // Approvals required
  requiredSignOffs: [{
    role: String,
    count: Number,
    completed: { type: Number, default: 0 },
  }],

  // Audit trail
  auditTrail: [{
    action: String,
    actor: String,
    actorEmail: String,
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed,
  }],

  // Metadata
  createdBy: String,
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  reviewDeadline: Date,
  approvedAt: Date,
  approvedBy: String,

  metadata: mongoose.Schema.Types.Mixed,
  tags: [String],
}, { collection: 'compliance_signoffs', timestamps: true });

ComplianceSignOffSchema.index({ entityType: 1, entityId: 1 });
ComplianceSignOffSchema.index({ overallStatus: 1, createdAt: -1 });
ComplianceSignOffSchema.index({ 'regulatoryRequirements.regulation': 1 });

ComplianceSignOffSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  // Calculate readiness score
  const allChecks = this.complianceAreas.reduce((acc, area) => {
    return acc.concat(area.checklist);
  }, []);

  if (allChecks.length > 0) {
    const passed = allChecks.filter(c => c.status === 'passed' || c.status === 'na').length;
    this.readinessScore = Math.round((passed / allChecks.length) * 100);
  }

  next();
});

ComplianceSignOffSchema.methods.getComplianceSummary = function() {
  return this.complianceAreas.map(area => ({
    name: area.name,
    status: area.status,
    checksPassed: area.checklist.filter(c => c.status === 'passed').length,
    checksTotal: area.checklist.length,
    signedOff: this.signOffs.some(s => s.areaId === area.areaId && s.status === 'signed'),
  }));
};

ComplianceSignOffSchema.methods.allAreasCompliant = function() {
  return this.complianceAreas.every(area =>
    area.status === 'compliant' || area.status === 'conditional'
  );
};

ComplianceSignOffSchema.methods.getSignOffCoverage = function() {
  const requiredByRole = {};
  this.requiredSignOffs.forEach(r => {
    requiredByRole[r.role] = r;
  });

  const signedByRole = {};
  this.signOffs.filter(s => s.status === 'signed').forEach(s => {
    if (!signedByRole[s.role]) {
      signedByRole[s.role] = [];
    }
    signedByRole[s.role].push(s);
  });

  return {
    required: requiredByRole,
    signed: signedByRole,
    complete: Object.keys(requiredByRole).every(role =>
      signedByRole[role] && signedByRole[role].length >= requiredByRole[role].count
    ),
  };
};

ComplianceSignOffSchema.statics.getPendingSignOffs = function() {
  return this.find({
    overallStatus: { $in: ['draft', 'pending_review'] },
  }).sort({ reviewDeadline: 1 });
};

ComplianceSignOffSchema.statics.getByEntity = function(entityType, entityId) {
  return this.find({ entityType, entityId }).sort({ createdAt: -1 });
};

ComplianceSignOffSchema.statics.getNearingExpiry = function(daysThreshold = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysThreshold);

  return this.find({
    'signOffs.expiryDate': {
      $gte: new Date(),
      $lte: futureDate,
    },
    'signOffs.status': 'signed',
  });
};

ComplianceSignOffSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('ComplianceSignOff', ComplianceSignOffSchema);
