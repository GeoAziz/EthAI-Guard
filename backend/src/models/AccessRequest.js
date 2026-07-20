const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope');

const AccessRequestSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, index: true },
  reason: { type: String },
  requesterId: { type: String }, // optional user id
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  handledBy: { type: String, default: null },
  handledAt: { type: Date, default: null },
  tenantId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

AccessRequestSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

AccessRequestSchema.plugin(tenantScopePlugin);

module.exports = mongoose.models?.AccessRequest || mongoose.model('AccessRequest', AccessRequestSchema);
