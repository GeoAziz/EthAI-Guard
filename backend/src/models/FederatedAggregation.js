const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope');

const FederatedAggregationSchema = new mongoose.Schema({
  aggregationId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, index: true },
  coordinatorId: String,
  participatingNodes: [String],
  aggregationMethod: {
    type: String,
    enum: ['weighted_average', 'median', 'krum'],
    default: 'weighted_average',
  },
  nodeWeights: mongoose.Schema.Types.Mixed,
  byzantineNodesCount: { type: Number, default: 0 },
  aggregatedMetrics: mongoose.Schema.Types.Mixed,
  confidenceScores: mongoose.Schema.Types.Mixed,
  nodeContributions: mongoose.Schema.Types.Mixed, // Per-node metrics before aggregation
  privacyConfig: {
    epsilon: Number,
    delta: Number,
    noiseMechanism: String,
  },
  violations: [
    {
      metricName: String,
      value: Number,
      threshold: Number,
      severityLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
      },
    },
  ],
  complianceStatus: {
    type: String,
    enum: ['compliant', 'non_compliant', 'warning'],
    default: 'compliant',
  },
  dataHash: String,
  integrityVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
  completedAt: Date,
});

FederatedAggregationSchema.plugin(tenantScopePlugin);

// Index for querying recent aggregations
FederatedAggregationSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.models?.FederatedAggregation || mongoose.model('FederatedAggregation', FederatedAggregationSchema);
