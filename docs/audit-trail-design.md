# Audit Trail Design - Day 18

## Purpose

The audit trail system provides a compliance-grade, immutable record of all ethical evaluations for:

1. **Regulatory Compliance**: GDPR Article 22 (automated decision-making), EU AI Act requirements
2. **Risk Management**: Identify patterns of high-risk decisions, model drift, fairness violations
3. **Incident Response**: Trace decision provenance when issues arise
4. **Accountability**: Link decisions to specific models, users, timestamps
5. **Explainability**: Provide human-readable explanations for auditors/regulators

## Audit Record Structure

### Minimal Audit Record

Every evaluation creates an audit record containing:

```javascript
{
  // WHO
  user_id: string,           // Actor (human or system) who initiated evaluation
  
  // WHAT
  model_id: string,          // Model used for decision
  input_features: object,    // Input data (may contain sensitive attributes)
  
  // WHEN
  timestamp: ISO8601,        // Evaluation execution time
  created_at: Timestamp,     // Server-side persistence time
  
  // OUTCOME
  risk_score: number,        // 0-100 quantitative risk
  risk_level: enum,          // low/medium/high categorical risk
  triggered_rules: array,    // Policy violations (e.g., ['fairness_imbalance'])
  
  // WHY
  explanation: {
    summary: string,               // One-sentence risk summary
    details: array<string>,        // Itemized reasoning
    recommended_action: string     // Compliance action (log/monitor/review)
  },
  
  // SUPPORTING DATA
  full_simulation: object,   // Raw model output
  full_rules: object,        // Detailed rule check results
  full_risk: object,         // Risk amplification breakdown
  context: object            // Additional metadata (e.g., decision_timestamp)
}
```

### Audit Record Lifecycle

```
1. Evaluation Request (POST /v1/evaluate)
   ↓
2. Pipeline Execution (simulation → rules → risk → explanation)
   ↓
3. Audit Record Creation (saveEvaluation)
   ↓
4. Firestore Persistence (ethical_evaluations collection)
   ↓
5. Audit Record Retrieval (GET /v1/evaluations, /v1/evaluations/:id)
   ↓
6. Audit Review (compliance dashboard, regulator access)
```

## Compliance Workflow

### High-Risk Decision Process

When a high-risk evaluation is detected (`risk_level === 'high'`):

1. **Immediate Notification**:
   - Prometheus metric `evaluations_high_risk_total` incremented
   - Log entry (info level): `{ route: '/v1/evaluate', user_id, model_id, risk_score, risk_level: 'high' }`
   - Future: Real-time alert to compliance team (email, Slack, PagerDuty)

2. **Automated Actions**:
   - Audit record flagged with `risk_level: 'high'` for priority review
   - Explanation includes `recommended_action: "IMMEDIATE REVIEW REQUIRED..."`

3. **Manual Review Workflow** (future feature):
   - Compliance officer views history dashboard, filters by `risk_level: high`
   - Drills into evaluation detail page, reviews:
     - Triggered rules (which policies violated)
     - Explanation narrative (why high-risk)
     - Input features (fairness attribute distribution)
     - Model output (bias threshold exceeded?)
   - Decision: Approve, reject, or escalate
   - Record approval/rejection in audit trail (new field: `review_status`)

### Medium-Risk Decision Process

- **Action**: Periodic monitoring (weekly compliance report)
- **Recommended action**: "Monitor this decision and collect feedback"
- **Audit trail**: Preserved for compliance review but no immediate alert

### Low-Risk Decision Process

- **Action**: Log only, no active monitoring
- **Recommended action**: "Decision logged in audit trail"
- **Audit trail**: Available for historical analysis, compliance spot-checks

## Severity Markers

### Triggered Rule Severity

Rules are categorized by severity for audit prioritization:

| Rule | Severity | Threshold | Impact |
|------|----------|-----------|--------|
| `fairness_imbalance` | HIGH | max_group_ratio > 0.7 | Discriminatory pattern detected |
| `extreme_output_bias` | HIGH | normalized_output > 90 | Biased prediction (extreme confidence) |
| `compliance_missing_fields` | MEDIUM | Missing user_id/model_id/timestamp | Incomplete audit trail metadata |

**Severity Mapping**:
- HIGH: Regulatory violation risk, immediate review required
- MEDIUM: Policy non-compliance, periodic review
- LOW: Best practice deviation, informational only

### Risk Score Thresholds

- **Low Risk**: 0-33 (green badge, no action)
- **Medium Risk**: 34-66 (yellow badge, monitor)
- **High Risk**: 67-100 (red badge, immediate review)

Thresholds calibrated based on:
- Base score from simulation (model output)
- Amplifiers: +15 fairness, +20 bias, +10 compliance
- Industry standards (e.g., FICO credit scores use similar tiering)

## Chronological Sorting Logic

### Primary Sort Order

Audit records displayed in **reverse chronological order** (most recent first):

```javascript
collection('ethical_evaluations')
  .where('user_id', '==', user_id)
  .orderBy('timestamp', 'desc')  // Newest evaluations first
```

**Rationale**: Auditors/compliance teams care about recent decisions most. Historical analysis uses filters/pagination.

### Timestamp Fields

- **`timestamp`** (ISO8601 string): Evaluation execution time (client-provided or server-generated)
  - Used for: Sorting, date range filters, compliance reports
  - Source: `new Date().toISOString()` at evaluation time

- **`created_at`** (Firestore Timestamp): Server-side persistence time
  - Used for: Detecting audit trail tampering (if timestamp != created_at by >5 seconds)
  - Source: `admin.firestore.FieldValue.serverTimestamp()`

### Pagination Logic

For large audit trails (>20 evaluations):

```javascript
// Page 1 (offset=0, limit=20)
GET /v1/evaluations?limit=20&offset=0

// Page 2 (offset=20, limit=20)
GET /v1/evaluations?limit=20&offset=20
```

Frontend shows: "Showing 1-20" → "Next" button → "Showing 21-40"

**Performance**: Offset pagination (not cursor) for simplicity. For >1000 docs, migrate to cursor-based (Firestore `startAfter`).

## Audit Trail Immutability

### Write-Once Pattern

Evaluation records are **never updated or deleted** after creation:

- No PUT /v1/evaluations/:id endpoint
- No DELETE /v1/evaluations/:id endpoint
- Firestore security rules: `allow update: false; allow delete: false;`

**Exception**: Compliance officer may add review annotations (future feature) via separate `audit_reviews` collection, preserving original record.

### Tamper Detection

**Mechanism**:
1. Compare `timestamp` (client-provided) vs `created_at` (server-generated)
2. If delta >5 seconds, log warning: `audit_timestamp_mismatch`
3. Use `request_id` to correlate evaluation with backend logs (cross-reference)

**Future**: Cryptographic signatures (SHA-256 hash of evaluation + HMAC secret) stored in `signature` field.

## Data Retention Policy

### Regulatory Requirements

- **GDPR**: 6 years minimum for financial decisions
- **EU AI Act**: 10 years for high-risk AI systems
- **Internal Policy**: Retain all high-risk indefinitely, medium/low for 90 days

### Retention Strategy

**Phase 1 (Day 18)**: No automatic deletion (indefinite retention)

**Phase 2 (Future)**:
```javascript
// Firestore TTL policy (requires Blaze plan)
// Delete low-risk evaluations older than 90 days
collection('ethical_evaluations')
  .where('risk_level', '==', 'low')
  .where('created_at', '<', Date.now() - 90 * 24 * 60 * 60 * 1000)
  .delete()

// Archive high-risk to BigQuery for 10-year retention
exportToBigQuery(collection('ethical_evaluations').where('risk_level', '==', 'high'))
```

### User Deletion (GDPR Right to Erasure)

When user requests data deletion:
1. Query all evaluations: `collection('ethical_evaluations').where('user_id', '==', user_id)`
2. Anonymize: Replace `user_id` with `[deleted_user]`, hash `input_features`
3. Preserve: Keep risk_score, risk_level, triggered_rules (aggregate anonymized data)
4. Log: Record deletion in `audit_deletions` collection for compliance

## Access Control

### Role-Based Access

| Role | Permissions | Use Case |
|------|-------------|----------|
| User | Read own evaluations | View personal history |
| Compliance Officer | Read all evaluations | Audit review, regulatory reports |
| Admin | Read all, export | System management, compliance export |
| Auditor (External) | Read-only export | Regulatory inspection |

**Implementation** (future):
- Add `role` field to user JWT/Firebase claims
- Middleware checks role before granting access
- Firestore rules enforce user_id filtering for non-privileged roles

### API Endpoints Authorization

- **POST /v1/evaluate**: Authenticated users only (authMiddleware)
- **GET /v1/evaluations**: Returns only requesting user's evaluations (filters by user_id)
- **GET /v1/evaluations/:id**: Authorization check (evaluation.user_id === requesting user)

### Audit Log of Audit Access

**Future Feature**: Log who accessed which evaluation records:

```javascript
collection('audit_access_logs').add({
  accessed_by_user_id: string,
  evaluation_id: string,
  accessed_at: Timestamp,
  action: 'view_list' | 'view_detail' | 'export'
})
```

Ensures accountability for auditors ("who audited the auditors?").

## Reporting & Analytics

### Compliance Reports

**Weekly High-Risk Summary**:
```javascript
// Query all high-risk evaluations in past 7 days
const report = await db.collection('ethical_evaluations')
  .where('risk_level', '==', 'high')
  .where('timestamp', '>=', sevenDaysAgo)
  .orderBy('timestamp', 'desc')
  .get()

// Generate CSV: evaluation_id, user_id, model_id, risk_score, triggered_rules, timestamp
exportToCSV(report.docs.map(doc => doc.data()))
```

**Monthly Fairness Report**:
```javascript
// Count evaluations with fairness_imbalance per model
const fairnessCounts = {}
const evals = await db.collection('ethical_evaluations')
  .where('triggered_rules', 'array-contains', 'fairness_imbalance')
  .where('timestamp', '>=', thirtyDaysAgo)
  .get()

evals.forEach(doc => {
  const model = doc.data().model_id
  fairnessCounts[model] = (fairnessCounts[model] || 0) + 1
})

// Output: { modelA: 15, modelB: 3, modelC: 0 }
```

### Analytics Dashboard (Future)

Grafana panels showing:
- Evaluations/day (time series)
- Risk level distribution (pie chart)
- Top 5 models by high-risk count (bar chart)
- Fairness rule trigger rate (percentage)
- Average risk score trend (line chart)

Data source: Prometheus metrics OR Firestore aggregations exported to BigQuery.

## Integration with Existing Systems

### Prometheus Metrics

Already instrumented in Day 17:

- `evaluations_total` (counter): Total evaluations (all risk levels)
- `evaluations_high_risk_total` (counter): High-risk subset
- `http_requests_total` (counter): API request volume
- `http_request_duration_seconds` (histogram): Latency tracking

**New Metrics for Day 18**:
- `evaluations_saved_total` (counter): Successful Firestore writes
- `evaluations_save_failed_total` (counter): Failed Firestore writes
- `evaluation_storage_duration_seconds` (histogram): Write latency

### Structured Logging

Pino logger (JSON format) already logs:

- `evaluation_completed` (info): user_id, model_id, risk_score, risk_level
- `evaluation_failed` (error): err object, user_id

**New Logs for Day 18**:
- `evaluation_saved` (info): evaluation_id, user_id, risk_level
- `save_evaluation_failed` (error): err object, user_id
- `evaluations_listed` (info): user_id, count (GET /v1/evaluations)
- `evaluation_retrieved` (info): evaluation_id, user_id (GET /v1/evaluations/:id)
- `unauthorized_access_attempt` (warn): evaluation_id, user_id, owner (403 error)

### Frontend History Dashboard

- **URL**: `/history` (list), `/history/[id]` (detail)
- **Features**:
  - Filters: risk_level, model_id, date_range
  - Pagination: 20 evals/page
  - Empty state: "When you perform your first evaluation..."
  - Detail view: Full audit record, triggered rules, JSON viewer

## Security & Privacy

### Sensitive Data Handling

- **Input Features**: Stored in full for audit, but access controlled via user_id filter
- **PII Minimization**: `input_summary` field (list view) shows only first 5 features, truncated
- **Encryption**: Firestore encrypts data at rest (AES-256)
- **Transport**: HTTPS/TLS 1.2+ enforced for all API calls

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ethical_evaluations/{evaluation_id} {
      allow read: if request.auth != null && 
                     resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.user_id == request.auth.uid;
      allow update, delete: if false;  // Immutable
    }
  }
}
```

Enforces:
- Only authenticated users access audit trail
- Users see only their own evaluations
- No modifications after creation (immutability)

## Testing & Validation

### Test Cases

1. **Audit Record Creation**: POST /v1/evaluate → verify storage_id returned, doc exists in Firestore
2. **Authorization**: User A cannot access User B's evaluations (403)
3. **Filtering**: Query `risk_level=high` returns only high-risk evals
4. **Pagination**: Page 2 returns different evaluations than Page 1
5. **Immutability**: Attempt PUT /v1/evaluations/:id → 404 (endpoint doesn't exist)
6. **Data Integrity**: Retrieved evaluation matches original evaluation object

### Manual Audit Trail Validation

1. Run 5 evaluations (2 high-risk, 2 medium, 1 low)
2. Check Firebase Console: 5 documents in ethical_evaluations collection
3. GET /v1/evaluations → verify 5 evaluations listed
4. Filter by `risk_level=high` → verify 2 results
5. GET /v1/evaluations/:id for high-risk eval → verify full details, triggered_rules populated
6. Check logs: 5 `evaluation_saved` entries
7. Check Prometheus: `evaluations_saved_total` incremented by 5

## Compliance Checklist

- ✅ **Immutability**: Records write-once, never modified/deleted
- ✅ **Chronological Order**: timestamp field, orderBy desc
- ✅ **User Attribution**: user_id field, linked to authentication
- ✅ **Triggered Rules**: Array of policy violations
- ✅ **Explanation**: Human-readable summary + details
- ✅ **Risk Categorization**: low/medium/high with thresholds
- ✅ **Access Control**: User can only see own evaluations
- ✅ **Logging**: Structured JSON logs for all audit operations
- ✅ **Metrics**: Prometheus counters for high-risk, storage failures
- ✅ **Retention**: Firestore indefinite retention (configurable TTL future)
- ✅ **Encryption**: At-rest (Firestore) and in-transit (HTTPS)

## Future Enhancements

1. **Cryptographic Signatures**: Sign each audit record with HMAC-SHA256 for tamper-proofing
2. **Compliance Officer Dashboard**: Separate UI for viewing all users' evaluations, exporting reports
3. **Real-time Alerts**: Slack/email notification on high-risk evaluation
4. **Audit Review Workflow**: Add review_status field (pending/approved/rejected), approval timestamp, reviewer_id
5. **BigQuery Export**: Nightly job to export Firestore docs to BigQuery for SQL analytics
6. **Model Drift Detection**: Compare risk_score distribution over time per model_id
7. **Fairness Monitoring**: Alert if fairness_imbalance trigger rate >10% for a model
8. **User Deletion Flow**: Anonymize audit records when user requests GDPR erasure

## Conclusion

The audit trail system provides a robust, compliance-grade foundation for tracking ethical evaluations. By storing immutable records with full provenance (who, what, when, why), severity markers (risk levels, triggered rules), and human-readable explanations, the system meets regulatory requirements (GDPR, EU AI Act) while enabling real-time monitoring, historical analysis, and incident response. The Firestore-based implementation balances scalability (serverless, free tier) with security (access control, encryption) and auditability (structured logging, metrics).
