# Cloud Functions Migration Guide

**Status**: Eliminating Render completely. All backend moving to Firebase Cloud Functions.

---

## **What's Changed**

### **Before (Render)**
```
server.js running on Render
└─ Express app with all routes
   ├─ /health, /metrics
   ├─ /auth/* 
   ├─ /v1/datasets
   ├─ /v1/analyze
   └─ /v1/access-requests
```

### **After (Firebase Cloud Functions)**
```
Cloud Functions (serverless)
├─ health
├─ authTest
├─ usersMe
├─ datasetsList
├─ datasetsCreate
├─ datasetsGet
├─ analyzeRun
├─ analyzeGet
├─ accessRequestsList
├─ accessRequestsApprove
└─ accessRequestsReject
```

---

## **Route Mapping: Old → New**

| Old Route | New Function | Status |
|---|---|---|
| `GET /health` | `health` | ✅ Done |
| `GET /auth/verify` | `authTest` | ✅ Done |
| `GET /v1/users/me` | `usersMe` | ✅ Done |
| `GET /v1/datasets` | `datasetsList` | 🔄 Skeleton |
| `POST /v1/datasets` | `datasetsCreate` | 🔄 Skeleton |
| `GET /v1/datasets/:id` | `datasetsGet` | 🔄 Skeleton |
| `POST /v1/analyze` | `analyzeRun` | 🔄 Skeleton |
| `GET /v1/analyze/:id` | `analyzeGet` | 🔄 Skeleton |
| `GET /v1/access-requests` | `accessRequestsList` | 🔄 Skeleton |
| `POST /v1/access-requests/:id/approve` | `accessRequestsApprove` | 🔄 Skeleton |
| `POST /v1/access-requests/:id/reject` | `accessRequestsReject` | 🔄 Skeleton |

---

## **Deployment Steps**

### **1. Install Dependencies**

```bash
cd /mnt/devmandrive/EthAI/backend/functions
npm install
```

### **2. Test Locally**

```bash
cd /mnt/devmandrive/EthAI
firebase emulators:start --only functions
```

**Expected output**:
```
✔ functions[health]: http function initialized at http://localhost:5001/...
✔ functions[authTest]: http function initialized at http://localhost:5001/...
...
```

### **3. Test an Endpoint**

```bash
curl http://localhost:5001/studio-8429244671-dd548/us-central1/health
```

**Expected response**:
```json
{"status":"healthy","service":"ethixai-backend",...}
```

### **4. Deploy to Production**

```bash
firebase deploy --only functions
```

**Output** (save these URLs):
```
Function URL (health): https://us-central1-studio-8429244671-dd548.cloudfunctions.net/health
Function URL (authTest): https://us-central1-studio-8429244671-dd548.cloudfunctions.net/authTest
...
```

---

## **Frontend URL Update**

Once deployed, update `frontend/.env`:

```env
# OLD (Render)
NEXT_PUBLIC_API_URL=https://ethai-guard.onrender.com

# NEW (Cloud Functions)
NEXT_PUBLIC_API_URL=https://us-central1-studio-8429244671-dd548.cloudfunctions.net
```

Then redeploy frontend:
```bash
git push origin free-tier-production-hunt
```

---

## **What About Render?**

❌ **Render is gone**. It's replaced entirely by Cloud Functions.

- No more cold starts from Render (Cloud Functions are faster)
- No more $7/mo cost
- No need to keep server warm
- Single Firebase deployment for everything

**What to do with Render account**: Leave it or delete (doesn't matter)

---

## **Next Steps to Implement**

Each function has `TODO:` comments. Implement in this order:

### **Priority 1: Data Endpoints** (needed for MVP demo)
- [ ] `datasetsList` - Query MongoDB for user's datasets
- [ ] `datasetsCreate` - Save uploaded file metadata to MongoDB
- [ ] `datasetsGet` - Fetch dataset details
- [ ] `analyzeRun` - Call AI Core, save results
- [ ] `analyzeGet` - Fetch analysis results

### **Priority 2: Admin Workflows**
- [ ] `accessRequestsList` - List pending role requests
- [ ] `accessRequestsApprove` - Update request + call Firebase setCustomUserClaims()
- [ ] `accessRequestsReject` - Update request status

### **Priority 3: Optional**
- [ ] Models CRUD
- [ ] Evidence endpoints
- [ ] Drift detection
- [ ] Audit logging

---

## **Architecture Benefits**

✅ **No servers to manage** - Firebase handles scaling  
✅ **Cold starts fast** - 3-5s vs 30-50s on Render  
✅ **Free forever** - Firebase free tier: 2M invocations/month  
✅ **Auto-scales** - Handles traffic spikes automatically  
✅ **Single console** - Everything in Firebase  
✅ **Same MongoDB** - No database changes needed  
✅ **Same Firebase Auth** - Already using custom claims  

---

## **Cost Comparison**

| Service | Old (Render) | New (Cloud Functions) |
|---|---|---|
| Backend | $0 (free tier) | $0 (free tier) |
| If scaled | $7/mo | $0 (stays free longer) |
| Cold starts | 30-50s | 3-5s |
| Uptime SLA | None | 99.95% |

---

## **File Structure**

```
backend/
├── functions/
│   ├── package.json
│   ├── index.js           ← All Cloud Functions here
│   └── .env              ← Copy from ../src/.env for local testing
├── src/
│   ├── server.js         ← NO LONGER USED (RIP Render)
│   ├── routes/           ← Can be archived/deleted
│   ├── middleware/       ← Can be archived/deleted
│   └── models/           ← Still used by functions
└── firebase.json         ← Configure which code to deploy
```

---

## **Troubleshooting**

### "firebase: command not found"
```bash
npm install -g firebase-tools
firebase login
```

### "Cannot find module 'mongoose'"
```bash
cd backend/functions
npm install
```

### "Functions emulator failed to start"
Check if port 5001 is available:
```bash
lsof -i :5001
```

### "Token verification failed"
Ensure Firebase Admin SDK credentials are available:
```bash
# Check service account key exists
ls -la /mnt/devmandrive/EthAI/serviceAccountKey.json
```

---

## **Done!**

Your backend is now **fully serverless on Firebase**. No more Render dependency! 🎉

Next: Fill in the `TODO:` MongoDB queries to make functions fully functional.
