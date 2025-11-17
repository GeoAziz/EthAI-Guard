# Storage Architecture - Day 18

## Overview

The ethical evaluation system requires a persistent audit trail for compliance, regulatory review, and historical analysis. This document details the storage architecture using Firebase Firestore (Spark Plan free tier).

## Why Firebase Firestore?

### Rationale
1. **Free Tier Sufficient**: Spark plan provides 1GB storage, 50,000 reads/day, 20,000 writes/day - adequate for evaluation workloads (~100-500 evals/day expected)
2. **Serverless**: No infrastructure management, auto-scaling, high availability
3. **Real-time Capabilities**: Supports future live dashboards or audit monitoring
4. **Firebase Admin SDK Integration**: Already used for authentication, minimal new dependencies
5. **Document Model**: Natural fit for evaluation objects (JSON-like documents)
6. **Security Rules**: Built-in authorization via Firestore security rules (user_id filtering)

### Cost Analysis (Spark Plan Limits)
- Storage: 1GB (each evaluation ~5-15KB → ~70,000-200,000 evaluations capacity)
- Reads: 50,000/day (list queries + detail views)
- Writes: 20,000/day (evaluation persistence)
- Network egress: 10GB/month

For production scaling beyond Spark plan, upgrade to Blaze (pay-as-you-go) triggers at ~2000+ evals/day sustained.

## Collection Structure

### ethical_evaluations Collection

**Collection name**: `ethical_evaluations`

**Document ID**: Auto-generated UUID (evaluation_id)

**Schema**:

```javascript
{
  // Primary identifiers
  evaluation_id: string (UUID),
  user_id: string (Firebase UID or JWT subject),
  model_id: string,
  request_id: string,
  
  // Timestamps
  timestamp: ISO8601 string (evaluation execution time),
  created_at: Firestore Timestamp (server-side creation time),
  
  // Risk assessment
  risk_score: number (0-100),
  risk_level: 'low' | 'medium' | 'high',
  triggered_rules: array<string> (e.g., ['fairness_imbalance', 'extreme_output_bias']),
  
  // Summarized data (for list views)
  input_summary: object (first 5 features, compact representation),
  explanation: {
    summary: string,
    details: array<string>,
    recommended_action: string
  },
  
  // Full audit trail (for detail views)
  full_simulation: object (simulation engine output),
  full_rules: object (rules engine checks),
  full_risk: object (risk scoring output),
  input_features: object (original request features),
  context: object (metadata like decision_timestamp)
}
```

**Document Size**: ~5-15KB typical, ~50KB max (large input vectors)

### Index Strategy

**Composite Indexes** (created via Firebase Console or firestore.indexes.json):

1. `(user_id ASC, timestamp DESC)` - Primary query pattern: user's recent evaluations
2. `(user_id ASC, risk_level ASC, timestamp DESC)` - Filter by risk level
3. `(user_id ASC, model_id ASC, timestamp DESC)` - Filter by model

**Single-field Indexes** (auto-created):
- `user_id` (equality filters)
- `risk_level` (equality filters)
- `model_id` (equality filters)
- `timestamp` (ordering)

## Read/Write Patterns

### Write Pattern (POST /v1/evaluate)

```javascript
// 1. Execute evaluation pipeline (simulation → rules → risk → explanation)
const evaluation = {
  user_id,
  model_id,
  input_features,
  simulation,
  rules,
  risk,
  explanation,
  context,
  timestamp
};

// 2. Persist to Firestore (non-blocking, graceful failure)
const storage_id = await saveEvaluation(evaluation);

// 3. Return evaluation + storage_id to client
response.storage_id = storage_id;
```

**Error Handling**: If Firestore write fails, evaluation results still returned to user. Error logged for ops review. Firestore unavailability doesn't block evaluation flow.

**Frequency**: ~10-100 writes/day typical, ~500/day peak (well under 20k/day limit)

### Read Patterns

#### 1. List Recent Evaluations (GET /v1/evaluations)

```javascript
const filters = { user_id, risk_level?, model_id?, limit: 20, offset: 0 };

// Query:
collection('ethical_evaluations')
  .where('user_id', '==', user_id)
  .where('risk_level', '==', risk_level)  // optional
  .where('model_id', '==', model_id)      // optional
  .orderBy('timestamp', 'desc')
  .limit(20)
  .offset(0)
```

**Use case**: History dashboard, audit list view  
**Frequency**: ~50-200 reads/day per active user  
**Optimization**: Returns summarized data only (input_summary, explanation.summary), not full objects

#### 2. Get Single Evaluation (GET /v1/evaluations/:id)

```javascript
// Query:
collection('ethical_evaluations')
  .doc(evaluation_id)
  .get()

// Authorization check: evaluation.user_id === requesting_user_id
```

**Use case**: Evaluation details page, audit drill-down  
**Frequency**: ~10-50 reads/day  
**Optimization**: Returns full document (~5-15KB) with all audit trail data

#### 3. Aggregate Queries (Future)

Not implemented in Day 18 scope, but architecture supports:
- Count high-risk evaluations per model
- Time-series risk distribution
- Compliance rule trigger frequency

## Data Retention

**Current Implementation**: Indefinite retention (no TTL)

**Future Considerations**:
- Firestore TTL policies (delete documents older than 90 days for non-high-risk)
- Export high-risk evaluations to BigQuery/Cloud Storage for long-term audit
- Compliance requirement: Retain high-risk for 7 years (regulatory standards)

## Security

### Authorization Model

**Firestore Security Rules** (to be configured in Firebase Console):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ethical_evaluations/{evaluation_id} {
      // Users can only read/write their own evaluations
      allow read: if request.auth != null && resource.data.user_id == request.auth.uid;
      allow write: if request.auth != null && request.resource.data.user_id == request.auth.uid;
    }
  }
}
```

**Backend Implementation**: Express middleware checks user_id matches token before Firestore query (defense-in-depth)

### Data Privacy

- No PII stored in input_summary (first 5 features only, truncated)
- Full input_features stored for audit but access-controlled
- User_id is Firebase UID (opaque) or JWT subject (hashed)

## Migration Path

### From In-Memory (Day 17) to Firestore (Day 18)

**No migration needed**: Day 17 had no persistence. Day 18 adds Firestore writes to existing pipeline.

**Backward Compatibility**: /v1/evaluate response unchanged except for new `storage_id` field (optional, clients ignore if not needed)

### Future: Firestore → Scalable DB (if Spark plan exceeded)

If workload exceeds Spark plan:
1. **Option A**: Upgrade to Blaze plan (pay-as-you-go, $0.18/GB storage, $0.06/100k reads)
2. **Option B**: Migrate to MongoDB (already in stack for datasets) - use same schema, replace Firestore calls with Mongoose models
3. **Option C**: Hybrid - hot data in Firestore (last 30 days), cold data in MongoDB

## Monitoring

### Metrics to Track

1. **Firestore Usage** (Firebase Console):
   - Document writes/day (target: <20k)
   - Document reads/day (target: <50k)
   - Storage size (target: <1GB)

2. **Application Metrics** (Prometheus):
   - `evaluations_saved_total` counter (successful Firestore writes)
   - `evaluations_save_failed_total` counter (failed writes)
   - `evaluation_storage_duration_seconds` histogram (write latency)

3. **Logs** (Structured JSON via pino):
   - `evaluation_saved` (info): evaluation_id, user_id, risk_level
   - `save_evaluation_failed` (error): err, user_id
   - `firestore_unavailable` (warn): graceful degradation

### Alerts

- **Critical**: Firestore write failure rate >10% for 5 minutes
- **Warning**: Approaching Spark plan limits (>80% daily quota)
- **Info**: High-risk evaluation stored (for compliance team notification)

## Performance Characteristics

### Write Performance
- **Latency**: ~50-150ms per write (network + Firestore commit)
- **Non-blocking**: Evaluation results returned before write confirms (fire-and-forget pattern)
- **Throughput**: Limited by Firestore (20k writes/day Spark plan)

### Read Performance
- **List query latency**: ~100-300ms (indexed queries, 20 docs)
- **Single doc latency**: ~50-100ms (direct doc fetch)
- **Caching**: Not implemented (Firestore handles caching internally via Firebase SDK)

## Testing Strategy

### Unit Tests (Jest)
- `saveEvaluation()`: Mock Firestore, verify doc structure
- `getEvaluations()`: Mock query results, verify filtering logic
- `getEvaluationById()`: Mock doc fetch, verify authorization

### Integration Tests
- Write real evaluation to Firestore emulator
- Query back and verify data integrity
- Test pagination/filtering

### Manual Testing
1. Run evaluation → verify storage_id returned
2. Check Firebase Console → document appears in ethical_evaluations
3. Query /v1/evaluations → verify list shows evaluation
4. Query /v1/evaluations/:id → verify full details

## Compliance & Audit

### Regulatory Requirements Met

1. **Immutability**: Firestore documents write-once (updates discouraged in this design)
2. **Chronological Order**: timestamp field + server-side created_at ensures ordering
3. **User Attribution**: user_id field links evaluation to actor
4. **Triggered Rules**: triggered_rules array documents policy violations
5. **Explanation Trail**: explanation object provides human-readable audit narrative

### Audit Report Generation

**Sample Query** (future feature):
```javascript
// Find all high-risk evaluations for model X in date range
db.collection('ethical_evaluations')
  .where('model_id', '==', 'modelX')
  .where('risk_level', '==', 'high')
  .where('timestamp', '>=', startDate)
  .where('timestamp', '<=', endDate)
  .orderBy('timestamp', 'desc')
  .get()
```

**Export Format**: JSON array of full evaluation objects (input, rules, risk, explanation)

## Conclusion

Firestore provides a scalable, serverless, compliance-ready storage layer for ethical evaluations. The Spark plan free tier accommodates expected workloads (100-500 evals/day), with clear migration paths for growth. The schema balances compact summaries (list views) with full audit trails (detail views), meeting regulatory requirements while optimizing read/write patterns.
