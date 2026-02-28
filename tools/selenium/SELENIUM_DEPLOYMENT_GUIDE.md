# 🎬 SELENIUM E2E TEST DEPLOYMENT GUIDE — Phase 3

**Status:** LOCKED & READY FOR EXECUTION  
**Target:** Deploy deterministic E2E tests conforming to Page Contracts  
**Timeline:** Immediate execution  

---

## ✅ PRE-DEPLOYMENT CHECKLIST

- [x] Intelligence Report completed (INTELLIGENCE_REPORT.md)
- [x] Page Contracts locked (15 pages, all roles covered)
- [x] API Inventory locked (20+ endpoints mapped)
- [x] RBAC Matrix defined (5 roles, comprehensive permissions)
- [x] Test Data seed defined (Firebase users, sample datasets)
- [x] request_id propagation contract finalized
- [x] Audit logging schema locked

---

## 📂 TEST STRUCTURE & FILE ORGANIZATION

```
/mnt/devmandrive/EthAI/tools/selenium/
├── testplan.md                      (EXISTING — Core contract document)
├── INTELLIGENCE_REPORT.md           (GENERATED — Full API + page inventory)
├── SELENIUM_DEPLOYMENT_GUIDE.md     (THIS FILE)
│
├── tests/
│   ├── 01-auth.test.js              (Login, logout, redirects)
│   ├── 02-dashboard.test.js         (Upload, job creation, RBAC)
│   ├── 03-explainboard.test.js      (Role-based UI, degradation, re-run)
│   ├── 04-export-audit.test.js      (Export modal, audit log verification)
│   ├── 05-admin.test.js             (User management, policies)
│   ├── 06-rbac.test.js              (Permission matrix validation)
│   ├── 07-error-pages.test.js       (403, 404, 500 pages)
│   └── fixtures/
│       ├── test-data.json           (Seed users, test datasets)
│       ├── sample-dataset.csv       (Upload test file)
│       └── api-responses.json       (Mock responses for degraded state)
│
├── utils/
│   ├── selenium-driver.js           (WebDriver initialization & teardown)
│   ├── page-objects.js              (Page object models for all contracts)
│   ├── auth-helper.js               (Login/logout utilities)
│   ├── audit-log-helper.js          (Audit log verification)
│   ├── request-id-helper.js         (request_id capture & validation)
│   └── assertions.js                (Custom Chai assertions)
│
├── config/
│   ├── test.env                     (Test environment variables)
│   ├── mocha.opts                   (Mocha configuration)
│   └── headless-config.js           (Headless + CI settings)
│
└── reports/
    └── (generated after test runs)
```

---

## 🔧 SETUP & CONFIGURATION

### **1. Install Dependencies** (if not already done)

```bash
cd /mnt/devmandrive/EthAI/tools/selenium
npm install
```

**Expected packages:**
- `selenium-webdriver` ^4.15.0
- `mocha` ^10.2.0
- `chai` ^4.3.10
- `dotenv` ^16.3.1

### **2. Environment Configuration**

Create `.env.test` (copy from `.env.example`):

```bash
# Test Environment
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
SELENIUM_HEADLESS=true
SELENIUM_BROWSER=chrome

# Test User Credentials
TEST_USER_EMAIL=testuser@ethixai.com
TEST_USER_PASSWORD=TestPassword123!
TEST_AUDITOR_EMAIL=testauditor@ethixai.com
TEST_AUDITOR_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=testadmin@ethixai.com
TEST_ADMIN_PASSWORD=TestPassword123!
TEST_ANALYST_EMAIL=testanalyst@ethixai.com
TEST_ANALYST_PASSWORD=TestPassword123!

# Firebase (if needed for direct auth)
FIREBASE_PROJECT_ID=ethixai-dev
FIREBASE_API_KEY=...

# Test Data
SAMPLE_DATASET_PATH=./tests/fixtures/sample-dataset.csv
TEST_TIMEOUT_MS=30000
```

### **3. Database Reset Script** (pre-test)

Create `scripts/reset-test-db.js`:

```javascript
// Reset Firestore collections before each test suite
// Clear: users, jobs, reports, audit_logs, policies
// Reload: test users, seed policies
// Clear: /tmp upload directories
```

---

## 📝 TEST EXECUTION MATRIX

### **Test Suite: 01-auth.test.js** (Login, Logout, Redirects)

**Test Cases:**

```
✅ TC-AUTH-001: User login with valid credentials
   - Scenario: User enters valid email + password
   - Expected: Firebase auth succeeds, JWT exchanged, redirect to /dashboard
   - Assert: Session created, role set to "user", request_id captured
   - Audit: Login action logged

✅ TC-AUTH-002: Auditor login redirects to /dashboard (not /admin)
   - Scenario: Auditor logs in
   - Expected: Redirect to /dashboard, sidebar shows auditor menu
   - Assert: Role set to "auditor", cannot see admin links
   - Audit: Login logged

✅ TC-AUTH-003: Admin login redirects to /admin
   - Scenario: Admin logs in
   - Expected: Redirect to /admin or /dashboard/admin
   - Assert: Admin menu visible, can access user management
   - Audit: Login logged

✅ TC-AUTH-004: Invalid credentials show error
   - Scenario: User enters wrong password
   - Expected: Error message displayed, no redirect
   - Assert: Session NOT created, page stays at /login

✅ TC-AUTH-005: Logout invalidates session
   - Scenario: User clicks logout button
   - Expected: Session cleared, redirect to /login
   - Assert: Subsequent API call returns 401

✅ TC-AUTH-006: Unauthenticated users redirected to /login
   - Scenario: Access /dashboard directly without auth
   - Expected: Redirect to /login
   - Assert: Page guard working
```

---

### **Test Suite: 02-dashboard.test.js** (Upload, Jobs, RBAC)

```
✅ TC-DASH-001: User can upload dataset
   - Scenario: Click upload button, select file, submit
   - Expected: Job created, jobId returned, job appears in list
   - Assert: request_id in response, job status = "pending"
   - Audit: "job_submitted" logged

✅ TC-DASH-002: Job persists across browser refresh
   - Scenario: Upload file → refresh page → check /dashboard/jobs
   - Expected: Job still visible with same jobId and status
   - Assert: localStorage has jobId, polling recovers job

✅ TC-DASH-003: Job survives network loss
   - Scenario: Simulate network interruption during polling
   - Expected: Polling resumes after reconnection
   - Assert: Job status continues updating

✅ TC-DASH-004: Auditor cannot upload (button hidden or 403)
   - Scenario: Auditor logs in, navigates to /dashboard
   - Expected: Upload button not visible or 403 on submit
   - Assert: RBAC enforced

✅ TC-DASH-005: Duplicate upload rejected
   - Scenario: Rapidly submit same dataset twice
   - Expected: Second submission rejected or deduplicated
   - Assert: Only one job created (idempotency)

✅ TC-DASH-006: Failed job shows request_id + retry button
   - Scenario: Job fails (simulated backend 500)
   - Expected: Job detail shows error + request_id + retry button
   - Assert: Audit log includes failure + request_id
```

---

### **Test Suite: 03-explainboard.test.js** (Role-Based UI, Degradation)

```
✅ TC-EXPLAIN-001: User sees "Interactive Analysis Mode" banner
   - Scenario: User navigates to /dashboard/explainboard
   - Expected: Yellow banner at top: "Interactive Analysis Mode"
   - Assert: Banner text correct, Re-run button enabled

✅ TC-EXPLAIN-002: Auditor sees "Read-Only Audit View" banner
   - Scenario: Auditor navigates to /dashboard/explainboard
   - Expected: Gray banner: "Read-Only Audit View"
   - Assert: Re-run button disabled, export button visible

✅ TC-EXPLAIN-003: Admin sees "Administrative Override Context" banner
   - Scenario: Admin navigates to /dashboard/explainboard
   - Expected: Red banner: "Administrative Override Context"
   - Assert: Re-run + parameter edit enabled, audit warning shown

✅ TC-EXPLAIN-004: User can re-run analysis
   - Scenario: Click Re-Run button
   - Expected: New job created, page shows "running" state
   - Assert: Audit log includes "parameter_edit" + request_id

✅ TC-EXPLAIN-005: Auditor cannot re-run (button disabled)
   - Scenario: Auditor clicks Re-Run button
   - Expected: Button disabled (grayed out) or click does nothing
   - Assert: No new job created

✅ TC-EXPLAIN-006: Degraded state shows banner + cached data
   - Scenario: Backend returns 500 for SHAP
   - Expected: Degradation banner shown, cached values displayed
   - Assert: Re-run disabled, export shows "Partial Explainability"

✅ TC-EXPLAIN-007: SHAP chart renders correctly
   - Scenario: Load report with SHAP values
   - Expected: Chart displays feature importance
   - Assert: Values match expected distribution
```

---

### **Test Suite: 04-export-audit.test.js** (Export, Audit Logs)

```
✅ TC-EXPORT-001: Export modal opens
   - Scenario: Click export button on /dashboard/reports/:id
   - Expected: Modal overlay displayed
   - Assert: Format selector visible, scope options available

✅ TC-EXPORT-002: Export creates audit log entry
   - Scenario: Select PDF format, click export
   - Expected: Download triggered, audit log entry created
   - Assert: Audit entry includes: user_id, report_id, format, request_id

✅ TC-EXPORT-003: Auditor export may require approval
   - Scenario: Auditor clicks export
   - Expected: Modal shows "Awaiting Approval" message (if configured)
   - Assert: Status = "pending_approval", download disabled

✅ TC-EXPORT-004: Export includes request_id
   - Scenario: Export a report
   - Expected: Audit log entry includes request_id field
   - Assert: request_id matches backend response

✅ TC-EXPORT-005: PII export requires confirmation
   - Scenario: Check "Include PII" checkbox
   - Expected: Confirmation message + checkbox required
   - Assert: Audit log includes "include_pii: true"

✅ TC-EXPORT-006: Audit log accessible to Admin + Auditor
   - Scenario: Navigate to /dashboard/admin/audit
   - Expected: Audit log table displayed
   - Assert: Admin sees all entries, Auditor sees all entries

✅ TC-EXPORT-007: Non-admin cannot access audit log (403)
   - Scenario: User tries /dashboard/admin/audit
   - Expected: Redirect or 403 error
   - Assert: Audit log not accessible
```

---

### **Test Suite: 05-admin.test.js** (User Management, Policies)

```
✅ TC-ADMIN-001: Admin can create user
   - Scenario: Admin navigates to /dashboard/admin/users → Create User
   - Expected: User creation form displayed
   - Assert: POST to /v1/admin/users succeeds, user appears in list

✅ TC-ADMIN-002: Admin can assign role
   - Scenario: Edit user role from "user" to "auditor"
   - Expected: Role updated, saved to backend
   - Assert: Audit log includes: user_id, old_role, new_role, request_id

✅ TC-ADMIN-003: Admin can delete user
   - Scenario: Click delete on user row
   - Expected: Confirmation modal, delete on confirm
   - Assert: User removed from list, audit log includes deletion

✅ TC-ADMIN-004: Non-admin cannot access user management (403)
   - Scenario: User tries /dashboard/admin/users
   - Expected: 403 or redirect
   - Assert: User management not accessible

✅ TC-ADMIN-005: Admin can edit fairness policies
   - Scenario: Navigate to /dashboard/admin/settings → Edit threshold
   - Expected: Policy form displayed
   - Assert: PUT to /v1/admin/policies succeeds, audit log includes old/new

✅ TC-ADMIN-006: Policy changes logged with old + new values
   - Scenario: Change fairness_threshold from 0.8 to 0.9
   - Expected: Audit log entry includes both values
   - Assert: Old value = 0.8, New value = 0.9
```

---

### **Test Suite: 06-rbac.test.js** (Permission Matrix Validation)

```
✅ TC-RBAC-001: User can upload, Auditor cannot
   - User: POST /v1/jobs → 200
   - Auditor: POST /v1/jobs → 403

✅ TC-RBAC-002: Auditor can view reports, User can view own
   - Auditor: GET /v1/reports?published=true → 200 (filtered)
   - User: GET /v1/reports → 200 (own + published)

✅ TC-RBAC-003: Only Admin can access /v1/admin/*
   - Non-Admin: GET /v1/admin/users → 403
   - Admin: GET /v1/admin/users → 200

✅ TC-RBAC-004: Only Admin + Auditor can view audit log
   - Admin: GET /v1/admin/audit-log → 200
   - Auditor: GET /v1/admin/audit-log → 200
   - User: GET /v1/admin/audit-log → 403

✅ TC-RBAC-005: All roles can view published reports
   - User: GET /v1/reports?published=true → 200
   - Auditor: GET /v1/reports?published=true → 200
   - Admin: GET /v1/reports → 200 (all + unpublished)
```

---

### **Test Suite: 07-error-pages.test.js** (Error Handling)

```
✅ TC-ERROR-001: 403 Forbidden page rendered
   - Scenario: Non-admin accesses /dashboard/admin
   - Expected: 403 error page with "Access Denied"
   - Assert: Navigation link to /dashboard available

✅ TC-ERROR-002: 404 Not Found page rendered
   - Scenario: Access /dashboard/nonexistent
   - Expected: 404 error page
   - Assert: "Go Back" or "Dashboard" link functional

✅ TC-ERROR-003: 500 Server Error page with request_id
   - Scenario: Backend returns 500
   - Expected: Error page shows request_id for support
   - Assert: request_id visible, support contact link available

✅ TC-ERROR-004: Unauthorized page for role violations
   - Scenario: Auditor tries to access /dashboard/admin
   - Expected: Redirect to /unauthorized or 403
   - Assert: Clear error message
```

---

## 🚀 TEST EXECUTION COMMANDS

### **Run All Tests (Headless)**

```bash
cd /mnt/devmandrive/EthAI/tools/selenium
npm test
```

### **Run Specific Test Suite**

```bash
npx mocha tests/01-auth.test.js
npx mocha tests/03-explainboard.test.js
```

### **Run with Headed Browser (Debugging)**

```bash
SELENIUM_HEADLESS=false npm test
```

### **Generate HTML Report**

```bash
npm test -- --reporter html > reports/test-report.html
```

---

## 📊 EXPECTED TEST RESULTS

### **Success Criteria**

- ✅ All 60+ test cases pass
- ✅ Every test includes `request_id` verification
- ✅ Every state-changing action logged in audit trail
- ✅ RBAC matrix 100% enforced (no leakage)
- ✅ Degraded states handled without silent failures
- ✅ No role confusion (Admin, Auditor, User UI clearly distinct)

### **Failure Analysis**

If any test fails:

1. **Capture failure details:**
   - Test name
   - Expected vs actual
   - request_id (if applicable)
   - Screenshot (DOM state)
   - Browser console errors

2. **Log format (from testplan.md):**
   ```
   [TEST FAILURE]
   Page: Report Detail / ExplainBoard
   Role: Auditor
   Action: Attempted export
   Expected: Approval required
   Actual: Export succeeded
   request_id: abc-123
   Screenshot: [attached]
   ```

3. **Mark as TODO if unclear:** Halt execution, escalate for clarification

---

## 🔐 SECURITY VALIDATION

### **Post-Test Checklist**

- [ ] No role leakage (auditor can't upload, etc.)
- [ ] All forbidden actions blocked (UI + API)
- [ ] Audit logging complete (no silent actions)
- [ ] request_id propagation verified
- [ ] Degradation visible (not silent)
- [ ] Session management correct (logout invalidates)
- [ ] Error pages show no sensitive info

---

## 📋 CI/CD INTEGRATION

### **GitHub Actions Workflow** (pre-configured)

```yaml
name: E2E Selenium Tests
on: [pull_request, push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Reset test DB
        run: node scripts/reset-test-db.js
      - name: Run Selenium tests
        run: npm test
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: reports/
```

---

## 🎯 DEPLOYMENT PHASES

### **Phase 3A: Core Tests (Immediate)**
1. Auth (login, logout, redirects)
2. Dashboard upload + RBAC
3. ExplainBoard role-based UI
4. Export + audit logging

### **Phase 3B: Comprehensive (Next Sprint)**
1. Admin user management
2. Policy editing
3. Error handling
4. Advanced RBAC scenarios

### **Phase 3C: Edge Cases (Hardening)**
1. Network loss scenarios
2. Degraded state recovery
3. Concurrent job handling
4. Rate limiting

---

## 📞 SUPPORT & ESCALATION

**If test execution blocked:**

1. Check environment variables (`.env.test`)
2. Verify backend is running (`/health` endpoint responds)
3. Verify test users exist in Firebase
4. Check browser/driver compatibility
5. Escalate with: test name + error + request_id

**TODO markers in test files** indicate clarification needed before proceeding.

---

**END OF DEPLOYMENT GUIDE**

**Status:** READY FOR IMMEDIATE EXECUTION  
**Approved by:** QA Operations  
**Date:** 2026-01-12  

