# Vercel TypeScript Backend Migration - Complete API Endpoints

## Overview
Backend migration from Express on Render to Vercel serverless TypeScript API routes. All endpoints use Next.js `/pages/api` structure with centralized middleware for auth, CORS, and error handling.

## Architecture

### Core Infrastructure Files
- **`lib/db-client.ts`** - MongoDB connection pooling + Mongoose schemas
- **`lib/firebase-admin.ts`** - Firebase Admin SDK wrapper for token verification & custom claims
- **`lib/api-handler.ts`** - Main middleware: `withAuth()` and `withoutAuth()` wrappers
- **.env** - Configuration (Firebase credentials, MongoDB URL)

### Database Models (Schema-defined in `lib/db-client.ts`)
1. **User** - Firebase-synced user profiles with role from custom claims
2. **Dataset** - Data collections uploaded by users
3. **Analysis** - Bias analysis results (status: pending/completed/failed)
4. **Report** - Historical analysis reports
5. **AccessRequest** - Cross-user data access requests (with approval flow)
6. **Evaluation** - Model evaluation records with risk/fairness scores

---

## API Endpoints

### 1. Health & Status
```
GET /api/health
├─ Auth: Public (no token required)
├─ Returns: { status, service, environment, timestamp }
└─ Purpose: k8s/Vercel health check
```

---

### 2. User Management
```
GET /api/v1/users/me
├─ Auth: Required (Bearer token)
├─ Returns: { id, email, name, role, emailVerified }
├─ Auto-provision: Creates user in MongoDB on first login
└─ Role source: Firebase ID token custom claims (read-only in API)
```

---

### 3. Dataset Management
```
POST /api/v1/datasets
├─ Auth: Required
├─ Body: { name, file_url?, rows_count, columns }
├─ Returns: { _id, owner, name, ... created dataset }
└─ Filter: Only user's own datasets visible

GET /api/v1/datasets
├─ Auth: Required
├─ Query: ?limit=50&offset=0 (pagination)
├─ Returns: [{ id, name, owner, columns, rows_count, created_at }]
└─ Filter: owner === user.uid

GET /api/v1/datasets/[id]
├─ Auth: Required
├─ Returns: { full dataset details }
├─ Auth check: Must own dataset or 403
└─ Usage: View specific dataset

DELETE /api/v1/datasets/[id]
├─ Auth: Required
├─ Auth check: Must own dataset or 403
├─ Returns: { status: 'success', message: 'Dataset deleted' }
└─ Cascade: Soft-delete OK (orphan analysis handled in frontend)
```

---

### 4. Analysis & Bias Detection
```
POST /api/v1/analyze
├─ Auth: Required
├─ Body: { datasetId }
├─ Ownership check: User must own dataset
├─ Status: Returns immediately with status='running'
├─ AI Core: TODO - integrate async task queue for long-running analysis
├─ Returns: { _id, dataset_id, status, results, created_at }
└─ Notes: MVP returns status='running' synchronously

GET /api/v1/analyze/:id
├─ Auth: Required
├─ Returns: Full analysis record with results
├─ Ownership check: User must own parent dataset
├─ Status poll: Frontend polls for status='completed'
└─ Results format: { risk_score, findings, metrics, ... }

POST /api/v1/evaluate
├─ Auth: Required
├─ Body: { user_id, model_id, input_features, context?, decision_timestamp? }
├─ Purpose: Evaluate single decision for bias/fairness
├─ AI Core: TODO - integrate model simulation engine
├─ Returns: { request_id, timestamp, simulation, rules, risk, explanation }
├─ Storage: Non-blocking save to MongoDB (graceful failure if DB down)
└─ Risk levels: 'low' | 'medium' | 'high'
```

---

### 5. Validation & Model testing
```
POST /api/v1/validate-model
├─ Auth: Required
├─ Body: { model_name, model_version?, model_description?, num_synthetic_cases?, include_edge_cases?, include_stability_test? }
├─ AI Core: TODO - POST to AI_CORE_URL/validation/validate-model
├─ Status: Returns 201 with results immediately (MVP) or request_id for async
├─ Returns: { report_id, status, overall_score, confidence_score, metrics_summary, recommendations }
└─ Timeout: 120s for large validations

GET /api/v1/validation-reports
├─ Auth: Required
├─ Query: ?limit=50&offset=0
├─ Returns: { reports: [...], count, limit, offset }
├─ Filter: Only user's reports
└─ Order: Descending by created_at

GET /api/v1/validation-reports/[id]
├─ Auth: Required
├─ Returns: { firestore_id, report_id, model_name, status, overall_score, ... }
└─ Ownership: Only user's own reports visible
```

---

### 6. Access Control & Permissions
```
GET /api/v1/access-requests
├─ Auth: Required
├─ Role: admin | reviewer only (403 otherwise)
├─ Returns: [{ _id, requester_uid, dataset_id, access_level, status, ... }]
└─ Purpose: Admin view all pending/approved/rejected requests

POST /api/v1/access-requests
├─ Auth: Required
├─ Body: { dataset_id, access_level, reason? }
├─ Access levels: 'viewer' | 'collaborator' | 'admin'
├─ Returns: { _id, status='pending', created_at }
└─ Workflow: User submits → Admin reviews → Approve → Role upgraded

POST /api/v1/access-requests/[id]/approve
├─ Auth: Required + admin | reviewer role
├─ Purpose: Approve access, update Firebase custom claims
├─ Side effect: Calls Firebase setUserRole() to escalate user
├─ Returns: { status='success', message, data: updated_request }
└─ Failure handling: Request saved even if Firebase update fails

POST /api/v1/access-requests/[id]/reject
├─ Auth: Required + admin | reviewer role
├─ Body: { reason? }
├─ Returns: { status='success', message, data: updated_request }
└─ No side effects: Just updates status + rejection_reason
```

---

### 7. Model Management & Versioning
```
POST /api/v1/models/[id]/trigger-retrain
├─ Auth: Required + admin role
├─ Body: { reason, baseline_snapshot_id?, notes? }
├─ Returns: { status='queued', requestId }
├─ AI Core: TODO - queue async retrain job
└─ Callback: AI Core updates status when complete

GET /api/v1/models/[id]/versions
├─ Auth: Required
├─ Returns: [{ version, created_at, status }]
├─ Status values: 'active' | 'archived' | 'deprecated'
└─ MVP: Stub returns [{ version: '1.0.0', status: 'active' }]

POST /api/v1/models/[id]/promote
├─ Auth: Required + admin role
├─ Body: { version, requestId? }
├─ Validation: Must reference validated retrain request if provided
├─ Returns: { status='promoted', version }
└─ Side effect: Updates model to promoted version (in AI Core)

GET /api/v1/retrain/[requestId]
├─ Auth: Required + admin role
├─ Returns: { status, training_metrics, artifacts, validation_report }
└─ Status values: 'queued' | 'running' | 'validated_pass' | 'validated_fail' | 'completed'
```

---

### 8. Evidence & Audit
```
POST /api/v1/alerts/[id]/export
├─ Auth: Required + admin role
├─ Purpose: Export evidence bundle for audit trail
├─ Content: Model metadata, evaluations, logs, CI/CD info
├─ Format: TODO - tar.gz bundle
├─ Returns: { status, path, size, sha256, publish: { target, url } }
└─ Publishing: TODO - support upload to S3 / GitHub Releases
```

---

## Middleware & Error Handling

### `withAuth()` wrapper
```typescript
// Usage pattern:
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { uid, email, role, emailVerified } = req.user;
  // ... route logic
}
export default withAuth(handler);
```
- Verifies Firebase ID token (Bearer header)
- Extracts user info + role from custom claims
- Returns 401 if invalid/missing token
- Adds CORS headers
- Catches all errors → 500 JSON response

### `withoutAuth()` wrapper
```typescript
export default withoutAuth(handler);
```
- Public route (no token required)
- Adds CORS headers
- Catches all errors → 500 JSON response

### Response Format (all endpoints)
```typescript
// Success
{ 
  status: 'success', 
  data: { ... },
  message?: 'Optional message'
}

// Error
{ 
  status: 'error', 
  error: 'error message'
}
```

---

## Database Connection Management

### MongoDB Connection Pooling (in `lib/db-client.ts`)
```typescript
// Connection reused across function invocations
export async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }
  // Create new connection only if needed
  const conn = await mongoose.connect(MONGO_URL, {
    maxPoolSize: 10,
    minPoolSize: 2,
  });
  cachedConnection = conn;
  return conn;
}
```
- Serverless functions get 10s timeout → must query fast
- Connection kept alive between invocations (same container)
- Graceful reconnect on failure

---

## Authentication Flow

1. **Frontend**: `signInWithEmailAndPassword(email, password)`
   - Returns ID token with custom claims: `{ uid, email, role }`

2. **Frontend**: Stores token in localStorage

3. **API calls**: Add `Authorization: Bearer {token}` header

4. **Vercel function**: 
   - `withAuth()` extracts & verifies token
   - Firebase SDK decodes token + validates signature
   - Custom claims parsed → `req.user = { uid, email, role, emailVerified }`

5. **Authorization**: Check `req.user.role` for role-based access
   - `admin` - full access
   - `reviewer` - approval workflows
   - `analyst` - dataset analysis
   - `user` - basic access
   - `guest` - limited/read-only

---

## Firebase Custom Claims (Role System)

```typescript
// Set in Firebase Admin SDK (backend only):
await setUserRole(uid, 'admin');

// Read in ID token (frontend + backend):
const claims = await auth.currentUser.getIdTokenResult();
console.log(claims.claims.role); // 'admin'
```

**Flow**: 
- Default role: 'user'
- Promote via: Access Request → Admin Approves → Custom Claims Updated
- Re-login needed: Frontend calls `getIdTokenResult(true)` to refresh

---

## Environment Variables

```env
# Required for all functions
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/ethixai
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...

# Required for admin functions
FIREBASE_ADMIN_SDK_KEY={...json...}

# Optional integrations
AI_CORE_URL=http://localhost:8000
EVIDENCE_PUBLISH_TARGET=none|s3|github
S3_BUCKET=...
```

---

## Deployment to Vercel

### Steps
1. Functions auto-deploy from `/pages/api` on `git push`
2. Each route becomes a separate function
3. Database connection pooling happens per-function instance
4. Cold start: ~1-2s (first request), subsequent: <100ms

### Production URL
```
https://ethixai.vercel.app/api/v1/datasets
```

### Update Frontend Config
```env
NEXT_PUBLIC_API_URL=https://ethixai.vercel.app
```

---

## Testing Checklist

- [ ] Deploy to Vercel (should auto-deploy on git push)
- [ ] Test health check: `GET /api/health` → 200
- [ ] Login with test user → check ID token has role
- [ ] Call `GET /api/v1/users/me` → returns user info
- [ ] Create dataset → `POST /api/v1/datasets`
- [ ] List datasets → `GET /api/v1/datasets`
- [ ] Run analysis → `POST /api/v1/analyze`
- [ ] Check analysis status → `GET /api/v1/analyze/:id`
- [ ] Request access → `POST /api/v1/access-requests`
- [ ] Approve access (admin) → `POST /api/v1/access-requests/:id/approve`
- [ ] Validate model → `POST /api/v1/validate-model`
- [ ] Role-based tests:
  - Admin can only call admin-only routes (403 otherwise)
  - Reviewer can approve access requests
  - User can manage own datasets only
  - Guest has read-only access

---

## Notes

1. **No Render anymore**: All backend on Vercel, single `git push` deploys everything
2. **Serverless constraints**: 10s timeout max, no file system persistence between requests
3. **MongoDB**: Connection pooling essential for performance
4. **AI Core**: All "TODO" endpoints should integrate with AI Core service (can be done incrementally)
5. **Firebase**: Auth source of truth for roles (never stored exclusively in MongoDB)
6. **Cost**: Stay free on Vercel (10s timeout, limited concurrent functions) + MongoDB Atlas free tier

---

## Next Steps

1. ✅ Create all API endpoint stubs (DONE)
2. ⏳ Integrate AI Core service for async operations
3. ⏳ Deploy to Vercel production
4. ⏳ Update frontend to use production API URL
5. ⏳ Test end-to-end with all 5 test users
6. ⏳ Monitor Vercel function logs for errors
7. ⏳ Optimize long-running operations (analysis, validation)
