const mongoose = require('mongoose');

const policySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: String,
    version: {
      type: Number,
      default: 1,
    },
    createdBy: {
      type: String,
      required: true,
    },
    updatedBy: String,
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
    },
    rules: {
      fairness_metrics: mongoose.Schema.Types.Mixed,
      thresholds: mongoose.Schema.Types.Mixed,
      enforcement: mongoose.Schema.Types.Mixed,
      protected_attributes: [String],
    },
    templates: [String],
    tags: [String],
    metadata: mongoose.Schema.Types.Mixed,
    activatedAt: Date,
    archivedAt: Date,
  },
  { timestamps: true }
);

policySchema.index({ status: 1, createdAt: -1 });
policySchema.index({ name: 1 });
policySchema.index({ tags: 1 });

module.exports = mongoose.model('Policy', policySchema);
