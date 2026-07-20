const mongoose = require('mongoose');

const RetrainingJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  scheduleId: { type: String, index: true },

  status: {
    type: String,
    enum: ['scheduled', 'running', 'completed', 'failed', 'cancelled'],
    default: 'scheduled',
    index: true
  },

  triggerType: { type: String, enum: ['scheduled', 'manual', 'drift-detected', 'performance-degradation'], default: 'manual' },

  training: {
    startedAt: Date,
    completedAt: Date,
    duration_ms: Number,
    datasetVersion: String,
    samplingPercentage: { type: Number, default: 100 },
    errors: [String],
    warnings: [String],
  },

  model: {
    modelVersion: String,
    modelHash: String,
    framework: String,
  },

  evaluation: {
    status: { type: String, enum: ['pending', 'running', 'passed', 'failed'] },
    startedAt: Date,
    completedAt: Date,
    metrics: mongoose.Schema.Types.Mixed,
    baselineComparison: mongoose.Schema.Types.Mixed,
    errors: [String],
  },

  approval: {
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: String,
    approvalTime: Date,
    rejectionReason: String,
    autoApprovalThreshold: mongoose.Schema.Types.Mixed,
  },

  deployment: {
    status: { type: String, enum: ['pending', 'in-progress', 'complete', 'failed'] },
    startedAt: Date,
    completedAt: Date,
    canaryPercentage: { type: Number, default: 0 },
    targetPercentage: { type: Number, default: 100 },
    rolloutStartTime: Date,
    rolloutEndTime: Date,
    errors: [String],
  },

  metrics: {
    performanceScore: Number,
    fairnessScore: Number,
    recommendedForProduction: Boolean,
  },

  rollback: {
    isRolledBack: { type: Boolean, default: false },
    rolledBackAt: Date,
    reason: String,
    previousModelVersion: String,
  },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  scheduledFor: { type: Date, index: true },
}, { collection: 'retraining_jobs' });

RetrainingJobSchema.index({ status: 1, createdAt: -1 });
RetrainingJobSchema.index({ jobId: 1 });
RetrainingJobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('RetrainingJob', RetrainingJobSchema);
