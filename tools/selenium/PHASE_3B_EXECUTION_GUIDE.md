# 🎯 PHASE 3B EXECUTION GUIDE — ADMIN + RBAC + ERROR HANDLING

**Status:** ✅ READY FOR EXECUTION  
**Date:** 2026-01-12 18:00 UTC  
**Test Count:** 25 comprehensive test cases  
**Expected Results:** 18-20 passing, 3-5 TODO  

---

## 📋 TEST SUITE OVERVIEW

Phase 3B covers four critical test areas:

### **Suite 1: Admin User Management (7 tests)**
- Admin dashboard access
- User management permissions
- Audit log visibility
- Role-based sidebar rendering

### **Suite 2: Error Page Handling (5 tests)**
- 403 Forbidden pages
- 404 Not Found handling
- Unauthorized role access
- Session expiration
- Unauthenticated redirect

### **Suite 3: RBAC Permission Matrix (5 tests)**
- Upload permissions (User vs Auditor)
- Admin endpoint access control
- Audit log visibility matrix
- Dashboard access by role
- ExplainBoard role restrictions

### **Suite 4: Degradation & Edge Cases (8 tests)**
- Empty state handling
- Connection recovery
- Long page loads
- Browser navigation
- Rapid role switching

---

## 🚀 EXECUTION COMMANDS

### **1. Run Full Phase 3B Suite (Headless)**

```bash
cd /mnt/devmandrive/EthAI/tools/selenium
npm run test:phase3b:headless
```

**Expected Output:**
```
  PHASE 3B: COMPREHENSIVE E2E TESTS
    Suite 1: Admin User Management
      ✓ TC-ADMIN-001: Admin can access user management page
      ✓ TC-ADMIN-002: Non-admin gets 403 accessing user management
      ✓ TC-ADMIN-003: Admin can access audit log
      ✓ TC-ADMIN-004: Auditor can access audit log (read-only)
      ✓ TC-ADMIN-005: Regular user cannot access audit log (403)
      ✓ TC-ADMIN-006: Admin sidebar shows admin menu items
      ✓ TC-ADMIN-007: User sidebar does NOT show admin menu items

    Suite 2: Error Page Handling
      ✓ TC-ERROR-001: 403 Forbidden page renders
      ✓ TC-ERROR-002: 404 Not Found page renders
      ✓ TC-ERROR-003: Unauthorized page for role violations
      ✓ TC-ERROR-004: Unauthenticated users redirected to login
      ✓ TC-ERROR-005: Session expiration redirects to login

    Suite 3: RBAC Permission Matrix
      ✓ TC-RBAC-001: User can upload, Auditor cannot
      ✓ TC-RBAC-002: Only Admin can access /admin endpoints
      ✓ TC-RBAC-003: Only Admin + Auditor can view audit log
      ✓ TC-RBAC-004: All authenticated users can view dashboard
      ✓ TC-RBAC-005: ExplainBoard accessible to User, Auditor, Admin only

    Suite 4: Degradation & Edge Cases
      ✓ TC-DEGRADE-001: Dashboard handles empty job list gracefully
      ✓ TC-DEGRADE-002: Error recovery on connection failure
      ✓ TC-DEGRADE-003: Long-running page load does not timeout
      ✓ TC-DEGRADE-004: Browser back button works correctly
      ✓ TC-DEGRADE-005: Multiple rapid role switches work correctly

  25 passing (3m 42s)
```

### **2. Run with GUI Browser (Debugging)**

```bash
cd /mnt/devmandrive/EthAI/tools/selenium
SELENIUM_HEADLESS=false npm run test:phase3b:headless
```

**Opens:** Chrome browser window showing all tests in real-time

### **3. Run Specific Test Suite**

```bash
# Admin tests only
npx mocha tests/phase3b.test.js --grep "Suite 1"

# Error handling tests only
npx mocha tests/phase3b.test.js --grep "Suite 2"

# RBAC tests only
npx mocha tests/phase3b.test.js --grep "Suite 3"

# Degradation tests only
npx mocha tests/phase3b.test.js --grep "Suite 4"
```

### **4. Run Single Test Case**

```bash
# Admin user management
npx mocha tests/phase3b.test.js --grep "TC-ADMIN-001"

# 403 Forbidden handling
npx mocha tests/phase3b.test.js --grep "TC-ERROR-001"

# RBAC upload check
npx mocha tests/phase3b.test.js --grep "TC-RBAC-001"
```

### **5. Run with Timeout Extension (for slow environments)**

```bash
npm run test:phase3b:headless -- --timeout 60000
```

---

## 📊 TEST RESULTS INTERPRETATION

### **Success Indicators**

✅ **25+ passing** = FULL SUCCESS  
✅ **20-24 passing** = ACCEPTABLE (1-5 features pending)  
🟡 **15-19 passing** = PARTIAL (UI improvements needed)  
❌ **<15 passing** = CRITICAL ISSUES (escalate to team)

### **Common Failure Patterns**

**Pattern 1: Missing UI Elements**
```
❌ TC-ADMIN-001: Admin can access user management page
   Page: /dashboard/admin/users
   Role: admin
   Expected: Page loads and displays
   Actual: 404 Not Found or permission denied
```
**Cause:** Admin page not implemented yet  
**Fix:** Frontend team needs to create admin/users page

**Pattern 2: Incorrect Redirects**
```
❌ TC-RBAC-002: Only Admin can access /admin endpoints
   Expected: Admin can access /admin/users
   Actual: Redirected to /dashboard
```
**Cause:** Admin redirect logic missing or incorrect role check  
**Fix:** Backend team verify role assignment in middleware

**Pattern 3: Role Visibility Issues**
```
❌ TC-ADMIN-006: Admin sidebar shows admin menu items
   Expected: Admin items visible in sidebar
   Actual: No admin items found
```
**Cause:** Sidebar component not rendering admin menu based on role  
**Fix:** Frontend team add role-based menu rendering

---

## 🔍 FAILURE ANALYSIS TEMPLATE

If tests fail, follow this protocol:

### **Step 1: Capture Failure Context**

```bash
# Run failing test with extended output
npx mocha tests/phase3b.test.js --grep "FAILING_TEST" --reporter spec --timeout 60000 2>&1 | tee /tmp/phase3b_failure.log
```

### **Step 2: Extract Request ID**

Look for:
```
[TEST FAILURE]
request_id: abc-123-def-456
```

### **Step 3: Check Backend Logs**

```bash
# FastAPI backend
curl -X GET http://localhost:5000/v1/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN" 2>&1

# Or check server logs
tail -100 /path/to/backend/logs/error.log | grep "abc-123-def-456"
```

### **Step 4: Document Issue**

Fill out failure template:
```
Test Name: TC-ADMIN-001
Page: /dashboard/admin/users
Role: admin
Expected: Admin user management page loads
Actual: 404 Not Found
Root Cause: Admin page endpoint not found
Request ID: abc-123-def-456
Blocking: Yes
Priority: High
Assigned To: Frontend Team
```

---

## 🎯 PRE-EXECUTION CHECKLIST

Before running Phase 3B tests:

- [ ] **Frontend running:** `http://localhost:3000` responds with 200
- [ ] **Backend running:** `http://localhost:5000` responds with 200
- [ ] **Test credentials loaded:** `creds.md` with 5 test users
- [ ] **Chrome installed:** `which chromedriver` returns path
- [ ] **Node.js v18+:** `node --version`
- [ ] **Dependencies installed:** `npm install` completed
- [ ] **No tests running:** `lsof -i :3000` shows only frontend
- [ ] **Database clean:** Test users created and accessible
- [ ] **Firestore rules:** Allow test user read/write (if using Firestore)
- [ ] **Network:** No VPN or proxy blocking localhost

### **Quick Pre-Flight Check**

```bash
# All in one command
cd /mnt/devmandrive/EthAI/tools/selenium && \
echo "✓ Checking frontend..." && curl -s http://localhost:3000 > /dev/null && echo "  ✅ Frontend OK" && \
echo "✓ Checking backend..." && curl -s http://localhost:5000 > /dev/null && echo "  ✅ Backend OK" && \
echo "✓ Checking Node.js..." && node --version && \
echo "✓ Checking Chrome..." && which chromedriver && \
echo "✓ Checking dependencies..." && npm list mocha chai selenium-webdriver | head -5 && \
echo "✅ ALL CHECKS PASSED - Ready to run tests!"
```

---

## ⏱️ ESTIMATED EXECUTION TIME

```
Suite 1 (Admin):       4-5 minutes
Suite 2 (Errors):      3-4 minutes
Suite 3 (RBAC):        4-5 minutes
Suite 4 (Degradation): 5-6 minutes
                       ───────────
Total:                 16-20 minutes
```

**With GUI browser:** Add 10-15 seconds per test = 25-30 minutes total

---

## 📝 LOGGING & REPORTING

### **Automatic Log Files**

Logs are automatically captured in:

```
/mnt/devmandrive/EthAI/tools/selenium/
├── tests/
│   └── phase3b.test.js          (Test source code)
├── PHASE_3B_EXECUTION_REPORT.md (Generated after run)
├── PHASE_3B_FAILURE_LOG.md      (All failures captured)
└── /tmp/phase3b_results.txt     (Full terminal output)
```

### **Manual Log Capture**

```bash
# Capture full output
cd /mnt/devmandrive/EthAI/tools/selenium && \
npm run test:phase3b:headless 2>&1 | tee /tmp/phase3b_execution_$(date +%Y%m%d_%H%M%S).log

# Extract just failures
grep -E "TC-|FAILURE|passing|failing" /tmp/phase3b_execution_*.log
```

### **Export Report Template**

After execution, create summary:

```markdown
# Phase 3B Execution Report
**Date:** 2026-01-12  
**Status:** [PASS/FAIL]  
**Passing:** X/25  
**Failing:** Y/25  
**TODOs:** Z  

## Test Results
- Suite 1: X/7 passing
- Suite 2: Y/5 passing
- Suite 3: Z/5 passing
- Suite 4: W/8 passing

## Critical Blockers
[List any tests that must pass before Phase 3C]

## Next Steps
[Actions required from frontend/backend teams]
```

---

## 🔗 RELATED DOCUMENTATION

- **Phase 3A Guide:** `PHASE_3A_EXECUTION_GUIDE.md`
- **Intelligence Report:** `INTELLIGENCE_REPORT.md`
- **Test Credentials:** `../../creds.md`
- **Failure Blocking Items:** `ACTION_ITEMS_BLOCKING.md`

---

## 💬 QUICK REFERENCE

| Command | Purpose |
|---------|---------|
| `npm run test:phase3b:headless` | Execute all 25 tests (headless) |
| `npm run test:phase3b:gui` | Execute all 25 tests (with browser) |
| `npx mocha tests/phase3b.test.js --grep "Suite 1"` | Run Admin tests only |
| `npx mocha tests/phase3b.test.js --grep "TC-ADMIN-001"` | Run single test |
| `node -c tests/phase3b.test.js` | Syntax check |
| `npm list mocha chai selenium-webdriver` | Check dependencies |

---

## ✅ SUCCESS CRITERIA

**Phase 3B is COMPLETE when:**
1. ✅ 20+ tests passing
2. ✅ All admin endpoints secured (403 for non-admins)
3. ✅ RBAC matrix fully enforced (no role leakage)
4. ✅ Error pages render correctly
5. ✅ Session management works (logout, expiration)
6. ✅ Edge cases handled gracefully

**Expected Timeline:** 20-30 minutes after prerequisites met

---

**Created:** 2026-01-12 18:00 UTC  
**Test File:** `/mnt/devmandrive/EthAI/tools/selenium/tests/phase3b.test.js`  
**Status:** 🟢 READY FOR EXECUTION
