const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const TenantSchema = new mongoose.Schema({
  tenantId: { type: String, unique: true, default: () => uuidv4() },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  status: { type: String, enum: ['trial', 'active', 'suspended', 'cancelled'], default: 'trial' },
  plan: { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' },
  billingEmail: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models?.Tenant || mongoose.model('Tenant', TenantSchema);
