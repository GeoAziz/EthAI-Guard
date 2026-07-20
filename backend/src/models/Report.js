const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope');

const ReportSchema = new mongoose.Schema({
  analysisId: String,
  summary: Object,
  visualizationURL: String,
  complianceScore: Number,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tenantId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
});

ReportSchema.plugin(tenantScopePlugin);

module.exports = mongoose.models?.Report || mongoose.model('Report', ReportSchema);
