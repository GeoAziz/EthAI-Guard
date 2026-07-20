const mongoose = require('mongoose');

const policyEvaluationSchema = new mongoose.Schema(
  {
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Policy',
      required: true,
    },
    modelId: String,
    reportId: mongoose.Schema.Types.ObjectId,
    userId: String,
    results: {
      passed: Boolean,
      violations: [
        {
          metric: String,
          expected: String,
          actual: String,
          severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        },
      ],
      score: Number,
      recommendations: [String],
    },
    simulationType: {
      type: String,
      enum: ['actual', 'what-if'],
      default: 'actual',
    },
    whatIfScenario: mongoose.Schema.Types.Mixed,
    enforcementAction: {
      type: String,
      enum: ['none', 'alert', 'review_required', 'deployment_blocked'],
      default: 'none',
    },
  },
  { timestamps: true }
);

policyEvaluationSchema.index({ policyId: 1, createdAt: -1 });
policyEvaluationSchema.index({ modelId: 1 });
policyEvaluationSchema.index({ userId: 1 });

module.exports = mongoose.model('PolicyEvaluation', policyEvaluationSchema);
