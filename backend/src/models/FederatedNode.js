const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope');

const FederatedNodeSchema = new mongoose.Schema({
  nodeId: { type: String, required: true, index: true },
  tenantId: { type: String, index: true },
  nodeName: String,
  nodeType: {
    type: String,
    enum: ['edge', 'central', 'regional'],
    default: 'edge',
  },
  status: {
    type: String,
    enum: ['healthy', 'stale', 'offline', 'failed'],
    default: 'healthy',
  },
  endpoint: String, // URL for reaching this node
  location: {
    region: String,
    latitude: Number,
    longitude: Number,
  },
  lastHeartbeat: { type: Date, default: Date.now },
  epsilonBudget: { type: Number, default: 1.0 },
  epsilonUsed: { type: Number, default: 0.0 },
  datasetSize: { type: Number, default: 0 },
  protectedAttributes: [String],
  metricsHistory: [
    {
      timestamp: Date,
      metrics: mongoose.Schema.Types.Mixed,
      dataHash: String,
    },
  ],
  certificateFingerprint: String,
  verificationStatus: {
    type: String,
    enum: ['verified', 'pending', 'failed'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

FederatedNodeSchema.plugin(tenantScopePlugin);

module.exports = mongoose.models?.FederatedNode || mongoose.model('FederatedNode', FederatedNodeSchema);
