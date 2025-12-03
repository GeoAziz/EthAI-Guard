const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  analysisId: String,
  summary: Object,
  visualizationURL: String,
  complianceScore: Number,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Report', ReportSchema);
