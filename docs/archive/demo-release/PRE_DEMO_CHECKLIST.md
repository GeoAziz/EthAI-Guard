# Pre-Demo Checklist ✅

## 🎯 Quick Pre-Presentation Verification

**Estimated Time**: 10 minutes  
**Date**: November 20, 2025

---

## 1. Database Verification (2 minutes)

### Check MongoDB Atlas Connection
```bash
# Verify demo data exists in Atlas
mongosh "mongodb+srv://qaranuser:Dcs-02-8638-2024.@qaran-baby-shop.ed8u0jn.mongodb.net/ethixai" \
  --eval "db.users.findOne({email: 'demo@ethixai.com'})"
```

**Expected Output**: Should show demo user with email `demo@ethixai.com`

### Check Analysis Data
```bash
mongosh "mongodb+srv://qaranuser:Dcs-02-8638-2024.@qaran-baby-shop.ed8u0jn.mongodb.net/ethixai" \
  --eval "db.analyses.find().pretty()"
```

**Expected Output**: Should show 2 analyses (demo-analysis-001 and demo-analysis-002)

✅ **Status**: ______

---

## 2. Services Health Check (2 minutes)

### Start All Services
```bash
cd /mnt/devmandrive/EthAI
docker-compose up -d
```

### Verify Services Running
```bash
# Check all containers
docker ps

# Expected containers:
# - ethai-frontend-1       (port 3000)
# - ethai-system_api-1     (port 5000)  
# - ethai-ai_core-1        (port 8100)
# - ethai-mongo-1          (port 27018)
# - ethai-postgres-1       (port 5432)
# - ethixai-prometheus     (port 9090)
```

### Test Backend Health
```bash
curl http://localhost:5000/health
```

**Expected Output**: `{"status":"healthy"}`

✅ **Status**: ______

---

## 3. Frontend Verification (5 minutes)

### Open Frontend
Navigate to: http://localhost:3000

### Test Login Flow
1. **Go to Login Page**: http://localhost:3000/login
2. **Enter Credentials**:
   - Email: `demo@ethixai.com`
   - Password: `SecureDemo2024!`
3. **Click "Sign In"**
4. **Expected**: Should redirect to dashboard

✅ **Login Works**: ______

### Test Upload Form (Dashboard)
1. **Navigate to**: http://localhost:3000/dashboard
2. **Click "Load Example Dataset"** button
3. **Expected**: 
   - Should see toast: "Demo Dataset Loaded"
   - Should see preview table with loan application data
   - Should show ~50 rows loaded

✅ **Example Dataset Loads**: ______

### Test FairLens Dashboard
1. **Navigate to**: http://localhost:3000/dashboard/fairlens
2. **Expected**:
   - Fairness score should display (0.83 or 0.91)
   - Circular progress indicator should show percentage
   - Charts should render with data

✅ **FairLens Dynamic**: ______

### Test Report Page
1. **Navigate to**: http://localhost:3000/report/demo-analysis-001
2. **Expected**:
   - Overall fairness score badge (83%)
   - Feature importance bars (credit_score 35%, etc.)
   - Violations section showing ECOA warning
   - Charts displaying bias metrics

✅ **Report Page Dynamic**: ______

### Test ExplainBoard
1. **Navigate to**: http://localhost:3000/dashboard/explainboard
2. **Expected**:
   - Feature importance bars render
   - Shows percentage values
   - SHAP plot placeholders visible

✅ **ExplainBoard Dynamic**: ______

---

## 4. Demo Flow Test (3 minutes)

### Complete User Journey
```
Login → Dashboard → Load Example → Configure Analysis → View Report → ExplainBoard
```

1. **Login** with demo credentials ✅
2. **Dashboard**: Click "Load Example Dataset" ✅
3. **Configure**:
   - Target Column: `loan_approved`
   - Sensitive Attributes: Select `gender`, `race`, `age`
4. **Run Analysis** (if backend ready):
   - Click "Run Analysis" button
   - Watch for success message
   - Should redirect to report page
5. **View Report**: Check fairness metrics ✅
6. **ExplainBoard**: View feature importance ✅

✅ **Full Flow Works**: ______

---

## 5. Backend API Verification (Optional)

### Test Analyze Endpoint
```bash
# Get auth token first (from browser dev tools after login)
TOKEN="your_firebase_token_here"

# Test analyze endpoint
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "dataset_name": "test_loan_data.csv",
    "data": [["age","income","gender","approved"], ["25","50000","Male","1"]],
    "target_column": "approved",
    "sensitive_attributes": ["gender"]
  }'
```

**Expected**: Should return `{"reportId": "...", "status": "success"}`

✅ **Status**: ______

### Test Latest Analysis Endpoint
```bash
curl http://localhost:5000/api/analyses/latest \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Should return analysis with fairness scores

✅ **Status**: ______

---

## 6. Browser Console Check

### Open Browser DevTools
- Press F12 or Ctrl+Shift+I
- Go to Console tab

### Look For:
- ❌ **No Errors** (except maybe image 404s for SHAP plots - expected)
- ✅ **Successful API calls** to `/api/analyses/latest`, `/api/report/:id`

✅ **No Critical Errors**: ______

---

## 7. Data Verification

### Check MongoDB Atlas Data
```bash
# Count records
mongosh "mongodb+srv://qaranuser:Dcs-02-8638-2024.@qaran-baby-shop.ed8u0jn.mongodb.net/ethixai" \
  --eval "print('Users:', db.users.count(), 'Analyses:', db.analyses.count(), 'Datasets:', db.datasets.count())"
```

**Expected Output**:
```
Users: 1 Analyses: 2 Datasets: 2
```

✅ **Status**: ______

---

## 8. Environment Configuration

### Verify Frontend .env
```bash
cat /mnt/devmandrive/EthAI/frontend/.env
```

**Should Include**:
- `NEXT_PUBLIC_API_URL=http://localhost:5000` (or render.com URL)
- All Firebase config variables

✅ **Status**: ______

### Verify Backend .env
```bash
grep MONGO_URL /mnt/devmandrive/EthAI/backend/.env
```

**Should Show**:
```
MONGO_URL=mongodb+srv://qaranuser:...@qaran-baby-shop.ed8u0jn.mongodb.net/ethixai...
```

✅ **Status**: ______

---

## 9. Demo Presentation Materials

### Files Ready
- ✅ `/tools/demo/INVESTOR_PRESENTATION_SCRIPT.md` - 7-minute script
- ✅ `/tools/demo/README.md` - Setup guide
- ✅ `/STATIC_TO_DYNAMIC_TRANSFORMATION.md` - Technical docs
- ✅ `/frontend/public/demo-loan-data.csv` - Demo dataset

✅ **All Files Present**: ______

---

## 10. Final Checks

### Performance
- ✅ Frontend loads in < 3 seconds
- ✅ API responses < 2 seconds
- ✅ No visible lag or freezing

### Visual Quality
- ✅ No layout breaks or overflow
- ✅ Charts render properly
- ✅ Colors and typography consistent
- ✅ Responsive on different screen sizes

### Data Accuracy
- ✅ Fairness scores match seeded data (0.83 and 0.91)
- ✅ Feature importance shows credit_score 35%
- ✅ Violations show ECOA HIGH for race disparate impact

---

## Quick Fix Commands

### If Services Not Running
```bash
cd /mnt/devmandrive/EthAI
docker-compose down
docker-compose up -d
```

### If Frontend Not Building
```bash
cd /mnt/devmandrive/EthAI/frontend
npm install
npm run build
npm run dev
```

### If Demo Data Missing
```bash
cd /mnt/devmandrive/EthAI/tools/demo
node seed-demo-data.js
```

### If Login Fails
```bash
# Check Firebase credentials
cat /mnt/devmandrive/EthAI/serviceAccountKey.json
cat /mnt/devmandrive/EthAI/frontend/.env | grep FIREBASE
```

---

## Emergency Fallback Plan

If something breaks during demo:

1. **Show Static Version**: 
   - Screenshots in `/docs/` folder
   - Pre-recorded demo video (if available)

2. **Explain Architecture**:
   - Use architecture diagrams
   - Walk through code in VS Code

3. **Show Database**:
   - Open MongoDB Atlas UI
   - Show seeded data directly

---

## Summary Checklist

- [ ] MongoDB Atlas has demo data (2 analyses, 1 user)
- [ ] All Docker containers running
- [ ] Backend health endpoint responds
- [ ] Frontend loads at http://localhost:3000
- [ ] Login works with demo@ethixai.com
- [ ] Example dataset loads (50 rows)
- [ ] FairLens shows fairness score
- [ ] Report page shows dynamic data
- [ ] ExplainBoard shows feature importance
- [ ] No critical console errors
- [ ] Presentation script ready

---

## Time-Saving Tips

### Before Investors Arrive
1. Open all tabs you'll need:
   - Tab 1: Login page
   - Tab 2: Dashboard
   - Tab 3: FairLens
   - Tab 4: Report (demo-analysis-001)
   - Tab 5: ExplainBoard

2. Have backup terminal ready:
   ```bash
   docker-compose logs -f backend
   ```

3. Keep MongoDB Atlas dashboard open (separate browser)

### During Demo
- Use **Cmd+T** / **Ctrl+T** to switch tabs quickly
- Have **speaker notes** visible on second screen
- Keep **water** nearby 💧

---

## Contact Information (For Help)

- **Frontend Issues**: Check `/frontend/README.md`
- **Backend Issues**: Check `/backend/README.md`
- **Database Issues**: Check MongoDB Atlas dashboard

---

**Good luck with your presentation! You've got this! 🚀**

---

## Post-Demo TODO

After successful demo, consider:

- [ ] Collect investor feedback
- [ ] Note any questions you couldn't answer
- [ ] Update presentation script based on experience
- [ ] Fix any bugs discovered during demo
- [ ] Add requested features to backlog

---

**Last Updated**: November 20, 2025  
**Version**: 1.0  
**Status**: Ready for Demo ✅
