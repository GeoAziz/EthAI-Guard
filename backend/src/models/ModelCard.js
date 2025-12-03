const mongoose = require('mongoose');

/**
 * Model Card Schema
 * Stores comprehensive AI model documentation per the Model Cards design spec
 */
const ModelCardSchema = new mongoose.Schema({
  // Section 1: Model Metadata
  model_metadata: {
    model_id: {
      type: String,
      required: true,
      index: true,
      description: 'Unique identifier for the model',
    },
    model_name: {
      type: String,
      required: true,
      description: 'Human-readable model name',
    },
    version: {
      type: String,
      required: true,
      description: 'Semantic version (e.g., 2.1.0)',
    },
    model_type: {
      type: String,
      required: true,
      enum: ['classification', 'regression', 'clustering', 'ranking', 'other'],
      description: 'Type of ML task',
    },
    framework: {
      type: String,
      description: 'ML framework used (e.g., LightGBM, TensorFlow, PyTorch)',
    },
    created_date: {
      type: Date,
      required: true,
      default: Date.now,
      description: 'Model creation timestamp',
    },
    last_updated: {
      type: Date,
      default: Date.now,
      description: 'Last update timestamp',
    },
    authors: [{
      type: String,
      description: 'Model developers/data scientists',
    }],
    owner: {
      type: String,
      required: true,
      description: 'Business owner or team responsible',
    },
  },

  // Section 2: Intended Use
  intended_use: {
    primary_use: {
      type: String,
      required: true,
      description: 'Main purpose of the model',
    },
    intended_users: [{
      type: String,
      description: 'Target user groups',
    }],
    out_of_scope_uses: [{
      type: String,
      description: 'Explicitly prohibited use cases',
    }],
    geographic_scope: [{
      type: String,
      description: 'Countries/regions where model is deployed',
    }],
  },

  // Section 3: Performance Metrics
  performance: {
    overall_accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      description: 'Overall classification accuracy',
    },
    precision: {
      type: Number,
      min: 0,
      max: 1,
    },
    recall: {
      type: Number,
      min: 0,
      max: 1,
    },
    f1_score: {
      type: Number,
      min: 0,
      max: 1,
    },
    auc_roc: {
      type: Number,
      min: 0,
      max: 1,
      description: 'Area Under ROC Curve',
    },
    confusion_matrix: {
      type: mongoose.Schema.Types.Mixed,
      description: 'Confusion matrix for classification',
    },
    confidence_intervals: {
      type: mongoose.Schema.Types.Mixed,
      description: '95% confidence intervals for metrics',
    },
    evaluation_dataset: {
      name: String,
      size: Number,
      date: Date,
    },
  },

  // Section 4: Fairness Metrics
  fairness_metrics: {
    demographic_parity: {
      type: mongoose.Schema.Types.Mixed,
      description: 'Difference in positive outcome rates across groups',
    },
    disparate_impact: {
      type: mongoose.Schema.Types.Mixed,
      description: 'Ratio of positive outcome rates (protected/reference)',
    },
    equal_opportunity: {
      type: mongoose.Schema.Types.Mixed,
      description: 'Difference in TPR across protected groups',
    },
    protected_attributes: [{
      type: String,
      description: 'Attributes monitored for fairness (gender, age, etc.)',
    }],
    bias_mitigation: {
      technique: String,
      effectiveness: Number,
      description: String,
    },
  },

  // Section 5: Explainability
  explainability: {
    interpretability_score: {
      type: Number,
      min: 0,
      max: 1,
      description: 'Model interpretability score (0-1)',
    },
    explanation_method: {
      type: String,
      description: 'Explanation technique used (SHAP, LIME, etc.)',
    },
    feature_importance: [{
      feature: String,
      importance: Number,
      rank: Number,
    }],
    global_explanations: {
      type: String,
      description: 'High-level model behavior summary',
    },
    local_explanations_available: {
      type: Boolean,
      default: true,
      description: 'Whether per-prediction explanations are available',
    },
  },

  // Section 6: Ethical Considerations
  ethical_considerations: {
    potential_harms: [{
      type: String,
      description: 'Identified potential negative impacts',
    }],
    mitigation_strategies: [{
      type: String,
      description: 'Actions taken to reduce harms',
    }],
    human_oversight: {
      required: Boolean,
      description: String,
    },
    contestability: {
      mechanism: String,
      description: 'How users can challenge decisions',
    },
  },

  // Section 7: Compliance Status
  compliance: {
    regulations: [{
      name: String,
      status: {
        type: String,
        enum: ['COMPLIANT', 'NON_COMPLIANT', 'PENDING_REVIEW'],
      },
      last_checked: Date,
      details: String,
    }],
    audit_trail: [{
      event: String,
      timestamp: Date,
      actor: String,
      result: String,
    }],
    certifications: [{
      name: String,
      issuer: String,
      date_issued: Date,
      expiry_date: Date,
    }],
  },

  // Section 8: Training Data
  training_data: {
    source: {
      type: String,
      required: true,
      description: 'Origin of training data',
    },
    size: {
      type: Number,
      required: true,
      description: 'Number of training samples',
    },
    time_period: {
      start: Date,
      end: Date,
    },
    preprocessing: [{
      type: String,
      description: 'Data preprocessing steps',
    }],
    sensitive_data: {
      present: Boolean,
      categories: [String],
      protection_measures: [String],
    },
    data_quality: {
      completeness: Number,
      consistency: Number,
      accuracy: Number,
    },
  },

  // Section 9: Model Architecture
  model_architecture: {
    algorithm: {
      type: String,
      required: true,
      description: 'ML algorithm used',
    },
    hyperparameters: {
      type: mongoose.Schema.Types.Mixed,
      description: 'Key hyperparameters and their values',
    },
    features_count: {
      type: Number,
      description: 'Number of input features',
    },
    training_time: {
      type: String,
      description: 'Model training duration',
    },
    computational_requirements: {
      cpu: String,
      memory: String,
      gpu: String,
    },
  },

  // Section 10: Version History
  version_history: [{
    version: String,
    date: Date,
    changes: String,
    author: String,
    performance_delta: mongoose.Schema.Types.Mixed,
  }],

  // Additional metadata
  compliance_report: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Latest compliance check report',
  },

  uploaded_at: {
    type: Date,
    default: Date.now,
    description: 'Timestamp of MongoDB upload',
  },

  status: {
    type: String,
    enum: ['DRAFT', 'REVIEW', 'APPROVED', 'PRODUCTION', 'DEPRECATED'],
    default: 'DRAFT',
    index: true,
  },
}, {
  timestamps: true,
  collection: 'model_cards',
});

// Compound indexes for common queries
ModelCardSchema.index({ 'model_metadata.model_id': 1, 'model_metadata.version': 1 }, { unique: true });
ModelCardSchema.index({ 'model_metadata.created_date': -1 });
ModelCardSchema.index({ 'compliance.regulations.status': 1 });
ModelCardSchema.index({ status: 1 });

// Virtual for full model identifier
ModelCardSchema.virtual('full_identifier').get(function () {
  return `${this.model_metadata.model_id}_v${this.model_metadata.version.replace(/\./g, '_')}`;
});

// Method to check if model is compliant
ModelCardSchema.methods.isCompliant = function () {
  if (!this.compliance || !this.compliance.regulations) {
    return false;
  }

  return this.compliance.regulations.every(reg =>
    reg.status === 'COMPLIANT' || reg.status === 'PENDING_REVIEW',
  );
};

// Method to get compliance summary
ModelCardSchema.methods.getComplianceSummary = function () {
  if (!this.compliance_report) {
    return {
      status: 'UNKNOWN',
      total_checks: 0,
      passed: 0,
      warnings: 0,
      failures: 0,
    };
  }

  return {
    status: this.compliance_report.overall_status || 'UNKNOWN',
    total_checks: this.compliance_report.summary?.total_checks || 0,
    passed: this.compliance_report.summary?.passed || 0,
    warnings: this.compliance_report.summary?.warnings || 0,
    failures: this.compliance_report.summary?.failures || 0,
  };
};

// Static method to get all production models
ModelCardSchema.statics.getProductionModels = function () {
  return this.find({ status: 'PRODUCTION' })
    .sort({ 'model_metadata.created_date': -1 });
};

// Static method to get models needing review
ModelCardSchema.statics.getModelsNeedingReview = function () {
  return this.find({
    $or: [
      { status: 'REVIEW' },
      { 'compliance.regulations.status': 'PENDING_REVIEW' },
    ],
  }).sort({ 'model_metadata.last_updated': -1 });
};

// Static method to get compliance statistics
ModelCardSchema.statics.getComplianceStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$compliance_report.overall_status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    PASS: 0,
    WARNING: 0,
    FAIL: 0,
    UNKNOWN: 0,
  };

  stats.forEach(stat => {
    result[stat._id || 'UNKNOWN'] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// Pre-save hook to update last_updated timestamp
ModelCardSchema.pre('save', function (next) {
  if (!this.isNew) {
    this.model_metadata.last_updated = new Date();
  }
  next();
});

const ModelCard = mongoose.model('ModelCard', ModelCardSchema);

module.exports = ModelCard;
