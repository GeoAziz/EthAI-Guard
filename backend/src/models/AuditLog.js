/**
 * Audit Log Mongoose Model
 *
 * Immutable audit trail for all governance events.
 * TTL index automatically deletes logs after 7 years (regulatory requirement).
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    index: true,
    immutable: true,  // Cannot be changed after creation
  },

  event_type: {
    type: String,
    required: true,
    enum: [
      'model_card_generated',
      'model_card_updated',
      'compliance_check',
      'policy_violation',
      'model_deployed',
      'model_deprecated',
      'compliance_audit',
      'threshold_updated',
      'policy_updated',
      'baseline_created',
    ],
    index: true,
  },

  // Model identification
  model_id: {
    type: String,
    required: true,
    index: true,
  },

  model_version: {
    type: String,
    required: true,
  },

  // Actor (who performed the action)
  actor: {
    type: String,
    required: true,
    default: 'system',
    // Values: 'system', user email, 'github-actions'
  },

  actor_type: {
    type: String,
    enum: ['human', 'system', 'ci_cd'],
    default: 'system',
  },

  // Action details
  action: {
    type: String,
    required: true,
    // Human-readable description
  },

  status: {
    type: String,
    required: true,
    enum: ['PASS', 'WARNING', 'FAIL', 'INFO'],
    index: true,
  },

  // Detailed event data
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
    // Flexible schema for event-specific data
  },

  // Compliance-specific fields
  compliance_status: {
    type: String,
    enum: ['COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW', null],
    required: false,
    index: true,
  },

  policy_violations: [{
    policy_name: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    threshold_value: Number,
    actual_value: Number,
    regulation: String,  // e.g., "EU AI Act Article 10"
  }],

  // Metadata for traceability
  metadata: {
    ip_address: String,      // Hashed for privacy
    user_agent: String,
    session_id: String,
    git_commit: String,      // GitHub SHA
    ci_run_id: String,       // GitHub Actions run ID
    workflow: String,        // GitHub Actions workflow name
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'production',
    },
  },

  // Related entities
  related_entities: [{
    entity_type: {
      type: String,
      enum: ['model_card', 'compliance_report', 'drift_record', 'alert'],
    },
    entity_id: String,
  }],
}, {
  timestamps: true,  // Adds createdAt, updatedAt
  collection: 'audit_logs',
});

// Compound indexes for fast queries
auditLogSchema.index({ model_id: 1, timestamp: -1 });
auditLogSchema.index({ event_type: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });
auditLogSchema.index({ compliance_status: 1, timestamp: -1 });
auditLogSchema.index({ actor: 1, timestamp: -1 });

// TTL index: Auto-delete after 7 years (220752000 seconds)
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 220752000 },  // 7 years (financial services requirement)
);

// Immutability enforcement: Prevent updates after creation
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are immutable and cannot be updated'));
  }
  next();
});

// Prevent findOneAndUpdate, updateOne, updateMany
auditLogSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], (next) => {
  return next(new Error('Audit logs are immutable and cannot be updated'));
});

// Prevent deletion (except TTL automatic deletion)
auditLogSchema.pre(['findOneAndDelete', 'deleteOne', 'deleteMany'], (next) => {
  return next(new Error('Audit logs cannot be manually deleted (TTL auto-deletion only)'));
});

// Virtual for easier access to violation count
auditLogSchema.virtual('violation_count').get(function () {
  return this.policy_violations ? this.policy_violations.length : 0;
});

// Virtual for critical violations only
auditLogSchema.virtual('critical_violations').get(function () {
  return this.policy_violations
    ? this.policy_violations.filter(v => v.severity === 'CRITICAL')
    : [];
});

// Method to check if event is critical
auditLogSchema.methods.isCritical = function () {
  return this.status === 'FAIL' && this.critical_violations.length > 0;
};

// Static method to get recent violations
auditLogSchema.statics.getRecentViolations = async function (days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    event_type: 'policy_violation',
    timestamp: { $gte: startDate },
  }).sort({ timestamp: -1 });
};

// Static method to get compliance rate
auditLogSchema.statics.getComplianceRate = async function (days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const checks = await this.find({
    event_type: 'compliance_check',
    timestamp: { $gte: startDate },
  });

  if (checks.length === 0) {
    return 1.0;
  }

  const passed = checks.filter(c => c.status === 'PASS').length;
  return passed / checks.length;
};

module.exports = mongoose.models?.AuditLog || mongoose.model('AuditLog', auditLogSchema);
