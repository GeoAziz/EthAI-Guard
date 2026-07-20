const mongoose = require('mongoose');

const ModelVersionSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  modelHash: { type: String, required: true, index: true },
  status: { type: String, enum: ['training', 'evaluating', 'approved', 'deployed', 'archived', 'failed'], default: 'training' },

  training: {
    startedAt: Date,
    completedAt: Date,
    duration_ms: Number,
    dataset: {
      rows: Number,
      features: Number,
      targetDistribution: mongoose.Schema.Types.Mixed,
    },
    config: mongoose.Schema.Types.Mixed,
  },

  evaluation: {
    accuracy: Number,
    precision: Number,
    recall: Number,
    f1Score: Number,
    auc_roc: Number,
    fairnessMetrics: {
      demographic_parity_difference: Number,
      equal_opportunity_difference: Number,
      equalized_odds_difference: Number,
      disparate_impact_ratio: Number,
    },
    fairnessViolations: [String],
    performanceViolations: [String],
    evaluatedAt: Date,
    evaluationDuration_ms: Number,
  },

  comparison: {
    previousVersion: String,
    performanceImprovement: Number,
    fairnessImprovement: Number,
    latencyImprovement_ms: Number,
  },

  deployment: {
    deployedAt: Date,
    deployedBy: String,
    canaryPercentage: { type: Number, default: 0 },
    productionMetrics: mongoose.Schema.Types.Mixed,
  },

  rollback: {
    rolledBackAt: Date,
    rolledBackBy: String,
    reason: String,
    previousVersion: String,
  },

  metadata: {
    framework: String,
    hyperparameters: mongoose.Schema.Types.Mixed,
    trainingDataHash: String,
    dependencies: mongoose.Schema.Types.Mixed,
    tags: [String],
  },

  approvals: {
    performanceReview: {
      approved: Boolean,
      reviewedBy: String,
      reviewedAt: Date,
      comments: String,
    },
    fairnessReview: {
      approved: Boolean,
      reviewedBy: String,
      reviewedAt: Date,
      comments: String,
    },
    securityReview: {
      approved: Boolean,
      reviewedBy: String,
      reviewedAt: Date,
      comments: String,
    },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'model_versions' });

ModelVersionSchema.index({ status: 1, createdAt: -1 });
ModelVersionSchema.index({ version: 1 });
ModelVersionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ModelVersion', ModelVersionSchema);
