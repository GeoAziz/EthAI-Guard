# Monitoring Schemas

**EthixAI Model Monitoring System**  
**Version**: 1.0  
**Last Updated**: November 18, 2025

## Overview

This document defines all MongoDB/Mongoose schemas for the monitoring system, including indexes, TTL policies, and validation rules.

---

## Schema 1: prediction_logs

**Purpose**: Store every prediction for future drift analysis.

### Schema Definition

```javascript
const mongoose = require('mongoose');

const PredictionLogSchema = new mongoose.Schema({
  // Identifiers
  model_id: {
    type: String,
    required: true,
    index: true
  },
  model_version: {
    type: String,
    required: true
  },
  
  // Timing
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Input features
  features: {
    type: mongoose.Schema.Types.Mixed,  // Flexible object
    required: true
  },
  
  // Model output
  prediction: {
    class: {
      type: String,
      required: true
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    probabilities: {
      type: Map,
      of: Number  // e.g., { approve: 0.87, reject: 0.11, ... }
    }
  },
  
  // Metadata
  metadata: {
    user_id: String,
    session_id: String,
    api_version: String,
    latency_ms: Number,
    protected_attributes: {
      gender: String,
      age_group: String,
      race: String
    }
  },
  
  // Ground truth (if available later)
  ground_truth: {
    type: String,
    default: null
  },
  ground_truth_timestamp: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,  // Adds created_at, updated_at
  collection: 'prediction_logs'
});

// Indexes
PredictionLogSchema.index({ model_id: 1, timestamp: -1 });
PredictionLogSchema.index({ timestamp: -1 });  // For cleanup queries
PredictionLogSchema.index({ 'metadata.user_id': 1 });  // For user-specific analysis

// TTL Index: Auto-delete after 90 days
PredictionLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 7776000 }  // 90 days = 90 * 24 * 60 * 60
);

module.exports = mongoose.model('PredictionLog', PredictionLogSchema);
```

### Storage Estimates

| Volume | Daily Storage | 90-Day Storage |
|--------|---------------|----------------|
| 100 predictions/day | 200 KB | 18 MB |
| 1,000 predictions/day | 2 MB | 180 MB |
| 10,000 predictions/day | 20 MB | 1.8 GB |

**MongoDB Atlas M0 Limit**: 512 MB (supports ~2,800 predictions/day with 90-day retention)

---

## Schema 2: drift_snapshots

**Purpose**: Store baseline distributions for drift detection.

### Schema Definition

```javascript
const DriftSnapshotSchema = new mongoose.Schema({
  // Identifiers
  snapshot_id: {
    type: String,
    required: true,
    unique: true
  },
  model_id: {
    type: String,
    required: true,
    index: true
  },
  model_version: {
    type: String,
    required: true
  },
  
  // Activation
  is_active: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  },
  
  // Feature distributions
  feature_distributions: {
    type: Map,
    of: new mongoose.Schema({
      // For numerical features
      mean: Number,
      std: Number,
      median: Number,
      quantiles: [Number],  // [p5, p25, p50, p75, p95]
      min: Number,
      max: Number,
      
      // For categorical features
      frequencies: {
        type: Map,
        of: Number  // e.g., { 'approve': 0.55, 'reject': 0.40, ... }
      },
      
      // Metadata
      dtype: {
        type: String,
        enum: ['numerical', 'categorical', 'boolean']
      },
      sample_count: Number
    }, { _id: false })
  },
  
  // Fairness metrics
  fairness_metrics: {
    type: Map,
    of: new mongoose.Schema({
      // Per protected attribute (gender, age_group, race)
      demographic_parity: Number,
      equal_opportunity: Number,
      disparate_impact: Number,
      
      // Per-group metrics
      group_metrics: {
        type: Map,
        of: new mongoose.Schema({
          selection_rate: Number,
          true_positive_rate: Number,
          false_positive_rate: Number,
          sample_count: Number
        }, { _id: false })
      }
    }, { _id: false })
  },
  
  // Prediction distribution
  prediction_distribution: {
    type: Map,
    of: Number  // e.g., { 'approve': 0.55, 'reject': 0.40, ... }
  },
  
  // SHAP distributions
  shap_distributions: {
    type: Map,
    of: new mongoose.Schema({
      mean: Number,
      std: Number,
      median: Number
    }, { _id: false })
  },
  
  // Metadata
  sample_count: {
    type: Number,
    required: true
  },
  created_by: String,
  created_at: {
    type: Date,
    required: true,
    default: Date.now
  },
  archived_at: Date,
  
  // Versioning
  dataset_version: String,
  training_date: Date
}, {
  collection: 'drift_snapshots'
});

// Indexes
DriftSnapshotSchema.index({ model_id: 1, is_active: 1 });  // Find active baseline
DriftSnapshotSchema.index({ snapshot_id: 1 }, { unique: true });

module.exports = mongoose.model('DriftSnapshot', DriftSnapshotSchema);
```

### Storage Estimates

- **Per Snapshot**: ~50-100 KB (depends on feature count)
- **Retention**: Indefinite (compliance requirement)
- **Typical Count**: 1 active + 3-5 archived per model = ~500 KB per model

---

## Schema 3: monitoring_records

**Purpose**: Store computed drift metrics from each analysis run.

### Schema Definition

```javascript
const MonitoringRecordSchema = new mongoose.Schema({
  // Identifiers
  record_id: {
    type: String,
    required: true,
    unique: true
  },
  model_id: {
    type: String,
    required: true,
    index: true
  },
  
  // Analysis period
  analysis_period: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Sample info
  sample_count: {
    type: Number,
    required: true
  },
  baseline_snapshot_id: String,
  
  // Metrics
  metrics: {
    // Data drift
    data_drift: {
      psi: {
        type: Map,
        of: new mongoose.Schema({
          value: Number,
          severity: {
            type: String,
            enum: ['INFO', 'WARNING', 'CRITICAL']
          }
        }, { _id: false })
      },
      kl_divergence: {
        value: Number,
        severity: String
      },
      wasserstein_distance: {
        value: Number,
        severity: String
      },
      category_frequency_shift: {
        type: Map,
        of: new mongoose.Schema({
          value: Number,
          severity: String
        }, { _id: false })
      },
      missing_value_density_change: {
        type: Map,
        of: Number
      }
    },
    
    // Fairness drift
    fairness_drift: {
      demographic_parity: {
        value: Number,
        baseline_value: Number,
        severity: String,
        affected_groups: [String]
      },
      equal_opportunity: {
        value: Number,
        baseline_value: Number,
        severity: String,
        affected_groups: [String]
      },
      disparate_impact: {
        value: Number,
        baseline_value: Number,
        severity: String,
        affected_groups: [String]
      }
    },
    
    // Model drift
    model_drift: {
      prediction_distribution_shift: {
        value: Number,
        severity: String
      },
      accuracy_drop: {
        value: Number,
        severity: String,
        available: Boolean  // False if no ground truth
      },
      output_entropy_change: {
        value: Number,
        severity: String
      },
      prediction_volatility: {
        value: Number,
        severity: String
      }
    },
    
    // Explanation drift
    explanation_drift: {
      shap_kl_divergence: {
        value: Number,
        severity: String
      },
      top_features_change: {
        old: [String],
        new: [String],
        severity: String
      },
      rank_correlation: {
        value: Number,
        severity: String
      }
    },
    
    // Data quality
    data_quality: {
      schema_violations: Number,
      type_mismatches: Number,
      range_violations: Number
    }
  },
  
  // Aggregated score
  aggregated_score: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  max_severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    required: true,
    index: true
  },
  
  // Incidents triggered
  incident_ids: [String],
  
  // Metadata
  analyzer_version: String,
  execution_time_ms: Number
}, {
  timestamps: true,
  collection: 'monitoring_records'
});

// Indexes
MonitoringRecordSchema.index({ model_id: 1, timestamp: -1 });
MonitoringRecordSchema.index({ max_severity: 1, timestamp: -1 });
MonitoringRecordSchema.index({ 'analysis_period.start': 1, 'analysis_period.end': 1 });

// TTL: Retain for 5 years (compliance)
MonitoringRecordSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 157680000 }  // 5 years
);

module.exports = mongoose.model('MonitoringRecord', MonitoringRecordSchema);
```

### Storage Estimates

- **Per Record**: ~10-20 KB
- **Frequency**: 4× daily (every 6 hours) = ~80 KB/day per model
- **5-Year Retention**: ~146 MB per model

---

## Schema 4: incidents

**Purpose**: Track monitoring incidents requiring investigation.

### Schema Definition

```javascript
const IncidentSchema = new mongoose.Schema({
  // Identifiers
  incident_id: {
    type: String,
    required: true,
    unique: true
  },
  model_id: {
    type: String,
    required: true,
    index: true
  },
  
  // Severity & Status
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'accepted_risk'],
    required: true,
    default: 'open',
    index: true
  },
  
  // Triggered metrics
  metrics_triggered: [{
    metric_name: {
      type: String,
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    threshold: {
      type: Number,
      required: true
    },
    severity: String
  }],
  
  // Affected groups (for fairness incidents)
  affected_groups: [String],
  
  // Root cause
  root_cause: String,
  root_cause_category: {
    type: String,
    enum: ['data_quality', 'concept_drift', 'model_issue', 'pipeline_error', 'other']
  },
  
  // Response actions
  response_actions: [{
    action: {
      type: String,
      required: true
    },
    taken_by: {
      type: String,
      required: true
    },
    taken_at: {
      type: Date,
      required: true,
      default: Date.now
    },
    notes: String
  }],
  
  // Assignment
  assigned_to: String,
  assigned_at: Date,
  
  // Resolution
  resolved_by: String,
  resolved_at: Date,
  resolution_notes: String,
  resolution_category: {
    type: String,
    enum: ['retrained', 'data_fixed', 'baseline_updated', 'accepted_risk', 'false_positive']
  },
  
  // Related records
  monitoring_record_id: String,
  alert_ids: [String],
  
  // Compliance
  compliance_reported: {
    type: Boolean,
    default: false
  },
  compliance_report_id: String,
  
  // Timestamps
  created_at: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  updated_at: Date,
  
  // SLA tracking
  acknowledged_at: Date,
  time_to_acknowledge_minutes: Number,
  time_to_resolve_minutes: Number
}, {
  timestamps: true,
  collection: 'incidents'
});

// Indexes
IncidentSchema.index({ status: 1, severity: 1, created_at: -1 });
IncidentSchema.index({ model_id: 1, created_at: -1 });
IncidentSchema.index({ assigned_to: 1, status: 1 });
IncidentSchema.index({ incident_id: 1 }, { unique: true });

// No TTL: Indefinite retention for compliance

module.exports = mongoose.model('Incident', IncidentSchema);
```

### Storage Estimates

- **Per Incident**: ~5-10 KB
- **Typical Rate**: 1-5 incidents/week = ~2-10 KB/week
- **Annual Storage**: ~100-500 KB/year
- **Indefinite Retention**: Not a storage concern

---

## Schema 5: alerts

**Purpose**: Track alert notifications sent to users.

### Schema Definition

```javascript
const AlertSchema = new mongoose.Schema({
  // Identifiers
  alert_id: {
    type: String,
    required: true,
    unique: true
  },
  incident_id: {
    type: String,
    required: true,
    index: true
  },
  model_id: {
    type: String,
    required: true,
    index: true
  },
  
  // Metric details
  metric_name: {
    type: String,
    required: true
  },
  metric_value: {
    type: Number,
    required: true
  },
  threshold: {
    type: Number,
    required: true
  },
  
  // Severity & Status
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'resolved'],
    required: true,
    default: 'pending',
    index: true
  },
  
  // Notification tracking
  channels_notified: [{
    type: String,
    enum: ['slack', 'email', 'sms', 'pagerduty']
  }],
  slack_message_ts: String,  // Slack thread timestamp for updates
  email_message_id: String,
  
  // Acknowledgment
  acknowledged_by: String,
  acknowledged_at: Date,
  acknowledgment_notes: String,
  
  // Resolution
  resolved_by: String,
  resolved_at: Date,
  resolution_notes: String,
  
  // Deduplication tracking
  deduplicated_from: String,  // If suppressed, which alert was original
  deduplicated_count: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  created_at: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  updated_at: Date
}, {
  timestamps: true,
  collection: 'alerts'
});

// Indexes
AlertSchema.index({ model_id: 1, metric_name: 1, severity: 1, created_at: -1 });
AlertSchema.index({ status: 1, severity: 1, created_at: -1 });
AlertSchema.index({ alert_id: 1 }, { unique: true });

// TTL: Retain for 1 year (unless CRITICAL, then indefinite)
AlertSchema.index(
  { created_at: 1 },
  { 
    expireAfterSeconds: 31536000,  // 1 year
    partialFilterExpression: { severity: { $ne: 'CRITICAL' } }
  }
);

module.exports = mongoose.model('Alert', AlertSchema);
```

### Storage Estimates

- **Per Alert**: ~2-5 KB
- **Typical Rate**: 5-10 alerts/week = ~10-50 KB/week
- **1-Year Retention**: ~0.5-2.5 MB/year

---

## Schema 6: alert_suppressions

**Purpose**: Manage alert suppression rules (maintenance windows, accepted risks).

### Schema Definition

```javascript
const AlertSuppressionSchema = new mongoose.Schema({
  // Identifiers
  suppression_id: {
    type: String,
    required: true,
    unique: true
  },
  model_id: {
    type: String,
    required: true,
    index: true
  },
  
  // Suppression scope
  metric_name: {
    type: String,
    default: null  // If null, suppresses all metrics
  },
  suppress_severities: [{
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL']
  }],
  
  // Time window
  start_time: {
    type: Date,
    required: true,
    index: true
  },
  end_time: {
    type: Date,
    required: true,
    index: true
  },
  
  // Justification
  reason: {
    type: String,
    required: true
  },
  suppression_type: {
    type: String,
    enum: ['maintenance', 'accepted_risk', 'false_positive', 'other'],
    required: true
  },
  
  // Approval
  created_by: {
    type: String,
    required: true
  },
  approved_by: String,  // Required for fairness metric suppressions
  
  // Timestamps
  created_at: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  collection: 'alert_suppressions'
});

// Indexes
AlertSuppressionSchema.index({ model_id: 1, start_time: 1, end_time: 1 });
AlertSuppressionSchema.index({ end_time: 1 });  // For cleanup of expired suppressions

module.exports = mongoose.model('AlertSuppression', AlertSuppressionSchema);
```

---

## Schema 7: audit_logs (Monitoring-Specific)

**Purpose**: Track all monitoring system actions for compliance.

### Schema Definition

```javascript
const MonitoringAuditLogSchema = new mongoose.Schema({
  // Event details
  event_type: {
    type: String,
    enum: [
      'baseline_created',
      'baseline_updated',
      'baseline_archived',
      'analysis_run',
      'incident_created',
      'incident_acknowledged',
      'incident_resolved',
      'alert_sent',
      'alert_suppressed',
      'manual_analysis_triggered'
    ],
    required: true,
    index: true
  },
  
  // Actor
  actor: {
    user_id: String,
    user_email: String,
    system: Boolean  // True if automated action
  },
  
  // Target
  target: {
    model_id: String,
    incident_id: String,
    alert_id: String,
    snapshot_id: String,
    record_id: String
  },
  
  // Details
  details: mongoose.Schema.Types.Mixed,  // Flexible object with event-specific data
  
  // Timestamp
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Metadata
  ip_address: String,
  user_agent: String
}, {
  collection: 'monitoring_audit_logs'
});

// Indexes
MonitoringAuditLogSchema.index({ event_type: 1, timestamp: -1 });
MonitoringAuditLogSchema.index({ 'target.model_id': 1, timestamp: -1 });
MonitoringAuditLogSchema.index({ 'actor.user_id': 1, timestamp: -1 });

// TTL: Retain for 5 years (compliance)
MonitoringAuditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 157680000 }
);

module.exports = mongoose.model('MonitoringAuditLog', MonitoringAuditLogSchema);
```

---

## Schema Relationships

```
┌──────────────────┐
│ DriftSnapshot    │
│ (baseline)       │
└────────┬─────────┘
         │
         │ referenced_by
         ↓
┌──────────────────┐       ┌──────────────────┐
│ PredictionLog    │──────>│ MonitoringRecord │
│ (raw data)       │ feeds │ (computed metrics)│
└──────────────────┘       └────────┬─────────┘
                                    │
                                    │ triggers
                                    ↓
                           ┌──────────────────┐
                           │ Incident         │
                           │                  │
                           └────────┬─────────┘
                                    │
                                    │ creates
                                    ↓
                           ┌──────────────────┐
                           │ Alert            │
                           │                  │
                           └──────────────────┘

         ┌──────────────────┐
         │ AlertSuppression │
         │ (rules)          │
         └──────────────────┘

         ┌──────────────────┐
         │ MonitoringAuditLog│
         │ (all actions)    │
         └──────────────────┘
```

---

## Collection Size Summary

| Collection | Per-Doc Size | Retention | Est. Annual Size (1k predictions/day) |
|------------|-------------|-----------|--------------------------------------|
| **prediction_logs** | 2 KB | 90 days | 180 MB (with TTL) |
| **drift_snapshots** | 75 KB | Indefinite | ~500 KB (few per model) |
| **monitoring_records** | 15 KB | 5 years | ~22 MB |
| **incidents** | 7 KB | Indefinite | ~500 KB (low volume) |
| **alerts** | 3 KB | 1 year | ~1.5 MB |
| **alert_suppressions** | 1 KB | Indefinite | ~50 KB (low volume) |
| **monitoring_audit_logs** | 2 KB | 5 years | ~3 MB |
| **TOTAL** | | | **~207 MB/year** |

**MongoDB Atlas M0 (512 MB)**: Supports system for **~2 years** before needing upgrade.

---

## Validation Rules

### Example: Incident Creation Validation

```javascript
IncidentSchema.pre('save', function(next) {
  // Ensure CRITICAL incidents have assigned_to
  if (this.severity === 'CRITICAL' && !this.assigned_to) {
    return next(new Error('CRITICAL incidents must have assigned_to field'));
  }
  
  // Ensure fairness incidents have affected_groups
  const fairnessMetrics = ['demographic_parity_drift', 'equal_opportunity_drift', 'disparate_impact'];
  const hasFairnessMetric = this.metrics_triggered.some(m => 
    fairnessMetrics.includes(m.metric_name)
  );
  if (hasFairnessMetric && (!this.affected_groups || this.affected_groups.length === 0)) {
    return next(new Error('Fairness incidents must specify affected_groups'));
  }
  
  next();
});
```

---

## Migration Scripts

### Creating Indexes

```javascript
// backend/scripts/setup-monitoring-indexes.js

async function setupMonitoringIndexes() {
  const collections = [
    'prediction_logs',
    'drift_snapshots',
    'monitoring_records',
    'incidents',
    'alerts',
    'alert_suppressions',
    'monitoring_audit_logs'
  ];
  
  for (const collectionName of collections) {
    const model = mongoose.model(collectionName);
    await model.createIndexes();
    console.log(`✓ Created indexes for ${collectionName}`);
  }
}
```

### Seeding Test Data

```javascript
// backend/scripts/seed-monitoring-data.js

async function seedMonitoringData() {
  // Create baseline snapshot
  await DriftSnapshot.create({
    snapshot_id: 'SNAP-TEST-001',
    model_id: 'loan-approval-v2.3',
    model_version: '2.3.0',
    is_active: true,
    feature_distributions: new Map([
      ['credit_score', {
        mean: 680,
        std: 85,
        quantiles: [550, 640, 680, 720, 800],
        dtype: 'numerical'
      }]
    ]),
    fairness_metrics: new Map([
      ['gender', {
        demographic_parity: 0.02,
        equal_opportunity: 0.01,
        disparate_impact: 0.92
      }]
    ]),
    sample_count: 10000,
    created_by: 'system'
  });
  
  console.log('✓ Created test baseline snapshot');
}
```

---

## Query Optimization Examples

### Query 1: Get Recent Drift Trends

```javascript
// Optimized with composite index
const records = await MonitoringRecord.find({
  model_id: 'loan-approval-v2.3',
  timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
})
.select('timestamp aggregated_score max_severity')
.sort({ timestamp: -1 })
.lean();  // Returns plain JS objects, faster
```

**Index Used**: `{ model_id: 1, timestamp: -1 }`

### Query 2: Find Open Critical Incidents

```javascript
// Optimized with composite index
const incidents = await Incident.find({
  status: 'open',
  severity: 'CRITICAL'
})
.sort({ created_at: -1 })
.limit(50)
.lean();
```

**Index Used**: `{ status: 1, severity: 1, created_at: -1 }`

### Query 3: Check for Duplicate Alerts

```javascript
// Used by deduplication logic
const recentAlert = await Alert.findOne({
  model_id: modelId,
  metric_name: metricName,
  severity: severity,
  created_at: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }
})
.select('alert_id')
.lean();
```

**Index Used**: `{ model_id: 1, metric_name: 1, severity: 1, created_at: -1 }`

---

## Backup & Recovery

### Backup Strategy

1. **Automated Backups**: MongoDB Atlas M0 includes daily backups (retained 2 days)
2. **Manual Exports**: Weekly export of critical collections
   ```bash
   mongodump --uri="$MONGO_URI" --collection=incidents --out=/backups/
   mongodump --uri="$MONGO_URI" --collection=drift_snapshots --out=/backups/
   ```
3. **Compliance Archives**: Quarterly export of all incidents + monitoring records

### Recovery Scenarios

| Scenario | Recovery Procedure | RPO | RTO |
|----------|-------------------|-----|-----|
| **Prediction logs lost** | Acceptable, non-critical (TTL data) | 90 days | N/A |
| **Baseline snapshot lost** | Recreate from training data | 0 | 1 hour |
| **Incident data lost** | Restore from Atlas backup | 24 hours | 2 hours |
| **Full database loss** | Restore from Atlas backup + manual archives | 24 hours | 4 hours |

---

## Performance Tuning

### Projection Optimization

```javascript
// Bad: Returns full documents (15 KB each)
const records = await MonitoringRecord.find({ model_id: modelId });

// Good: Returns only needed fields (2 KB each)
const records = await MonitoringRecord.find({ model_id: modelId })
  .select('timestamp aggregated_score max_severity');
```

### Aggregation Pipeline Example

```javascript
// Compute weekly drift summary
const summary = await MonitoringRecord.aggregate([
  {
    $match: {
      model_id: 'loan-approval-v2.3',
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }
  },
  {
    $group: {
      _id: null,
      avg_score: { $avg: '$aggregated_score' },
      max_score: { $max: '$aggregated_score' },
      critical_count: {
        $sum: { $cond: [{ $eq: ['$max_severity', 'CRITICAL'] }, 1, 0] }
      },
      warning_count: {
        $sum: { $cond: [{ $eq: ['$max_severity', 'WARNING'] }, 1, 0] }
      }
    }
  }
]);
```

---

## Future Enhancements

- [ ] Add `model_deployment_logs` collection (track all deployments)
- [ ] Add `retraining_jobs` collection (track triggered retraining)
- [ ] Add `compliance_reports` collection (quarterly regulatory reports)
- [ ] Add `user_feedback` collection (false positive/negative reports from users)
- [ ] Implement sharding for `prediction_logs` if volume exceeds 1M/day

---

## References

- **Architecture**: `monitoring_architecture.md`
- **Data Flows**: `monitoring_data_flow.md`
- **Metrics**: `drift_metrics_spec.md`
- **Mongoose Docs**: https://mongoosejs.com/docs/guide.html

---

**Next**: See `monitoring_infrastructure.md` for deployment architecture.
