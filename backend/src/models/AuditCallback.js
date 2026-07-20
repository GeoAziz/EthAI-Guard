const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope');

const AuditCallbackSchema = new mongoose.Schema({
  tenantId: { type: String, index: true },

  callbackId: { type: String, required: true, unique: true, index: true },

  // Webhook configuration
  name: { type: String, required: true },
  url: { type: String, required: true },
  description: String,

  // Authentication
  auth: {
    type: {
      type: String,
      enum: ['none', 'basic', 'bearer', 'api_key', 'hmac_sha256'],
      default: 'none',
    },
    credentials: mongoose.Schema.Types.Mixed, // Encrypted in production
  },

  // Event filtering
  eventFilters: {
    eventTypes: [String], // e.g., ['compliance_check', 'model_deployed', 'approval_completed']
    entityTypes: [String], // e.g., ['model_version', 'deployment']
    statuses: [String], // e.g., ['PASS', 'FAIL']
    tags: [String],
  },

  // Custom headers
  headers: {
    type: Map,
    of: String,
  },

  // Delivery settings
  delivery: {
    maxRetries: { type: Number, default: 3 },
    retryDelaySeconds: { type: Number, default: 300 }, // 5 minutes
    timeoutSeconds: { type: Number, default: 30 },
    batchSize: Number,
    batchWindowSeconds: Number,
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'disabled', 'error'],
    default: 'active',
    index: true,
  },

  errorCount: { type: Number, default: 0 },
  lastErrorMessage: String,
  lastErrorTime: Date,

  // Delivery history
  deliveryHistory: [{
    deliveryId: String,
    eventId: String,
    eventType: String,
    entityType: String,
    entityId: String,
    timestamp: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'delivered', 'failed', 'timeout', 'error'],
    },
    statusCode: Number,
    attempts: { type: Number, default: 0 },
    lastAttemptTime: Date,
    nextRetryTime: Date,
    error: String,
    response: mongoose.Schema.Types.Mixed,
  }],

  // Metrics
  metrics: {
    totalDeliveryAttempts: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 },
    lastDeliveryTime: Date,
    averageResponseTimeMs: Number,
  },

  // Test configuration
  testMode: { type: Boolean, default: false },
  testResponse: mongoose.Schema.Types.Mixed,

  // Metadata
  createdBy: String,
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  lastTestTime: Date,
  disabledAt: Date,
  disabledReason: String,

  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
}, { collection: 'audit_callbacks', timestamps: true });

AuditCallbackSchema.index({ status: 1, createdAt: -1 });
AuditCallbackSchema.index({ 'eventFilters.eventTypes': 1 });
AuditCallbackSchema.index({ tenantId: 1, status: 1 });

AuditCallbackSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

AuditCallbackSchema.methods.isApplicable = function(event) {
  const filters = this.eventFilters;

  if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.eventType)) {
    return false;
  }

  if (filters.entityTypes.length > 0 && !filters.entityTypes.includes(event.entityType)) {
    return false;
  }

  if (filters.statuses.length > 0 && !filters.statuses.includes(event.status)) {
    return false;
  }

  if (filters.tags.length > 0) {
    const eventTags = event.tags || [];
    const hasMatchingTag = filters.tags.some(tag => eventTags.includes(tag));
    if (!hasMatchingTag) {
      return false;
    }
  }

  return true;
};

AuditCallbackSchema.methods.shouldRetry = function(delivery) {
  if (delivery.status === 'delivered') {
    return false;
  }

  if (delivery.attempts >= this.delivery.maxRetries) {
    return false;
  }

  return true;
};

AuditCallbackSchema.methods.getDeliveryStatus = function() {
  const total = this.deliveryHistory.length;
  const delivered = this.deliveryHistory.filter(d => d.status === 'delivered').length;
  const failed = this.deliveryHistory.filter(d => d.status === 'failed').length;
  const pending = this.deliveryHistory.filter(d => d.status === 'pending').length;

  return {
    total,
    delivered,
    failed,
    pending,
    successRate: total > 0 ? (delivered / total) * 100 : 0,
  };
};

AuditCallbackSchema.statics.getApplicable = async function(event) {
  const callbacks = await this.find({
    status: 'active',
  });

  return callbacks.filter(cb => cb.isApplicable(event));
};

AuditCallbackSchema.statics.getPendingDeliveries = function() {
  return this.find({
    'deliveryHistory.status': 'pending',
    'deliveryHistory.nextRetryTime': { $lte: new Date() },
  });
};

AuditCallbackSchema.statics.getUnhealthy = function() {
  return this.find({
    status: 'error',
  }).sort({ lastErrorTime: -1 });
};

AuditCallbackSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('AuditCallback', AuditCallbackSchema);
