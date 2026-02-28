# 🎯 PHASE 3A ACTION ITEMS — BLOCKING & NEXT STEPS

**Date:** 2026-01-12 17:55 UTC  
**Status:** TESTS EXECUTABLE, AWAITING FRONTEND FIXES  
**Blocker Count:** 4 Critical Issues

---

## CRITICAL BLOCKERS — MUST FIX TO PASS TESTS

### BLOCKER #1: Upload Button Selector ⚠️ HIGH PRIORITY
**Impact:** 12 tests failing  
**Current:** Tests look for `[data-testid="upload-dataset-button"]`  
**Reality:** No such element exists in DOM  

**Frontend Action Required:**
```tsx
// IN: /frontend/src/components/dashboard/upload-form.tsx
// FIND: The button that renders "Run Fairness Analysis"
// ADD: data-testid="run-analysis-button"

// BEFORE:
<Button onClick={handleRunAnalysis} disabled={isAnalyzing}>
  {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isAnalyzing ? 'Analyzing' : 'Run Fairness Analysis'}
</Button>

// AFTER:
<Button 
  onClick={handleRunAnalysis} 
  disabled={isAnalyzing}
  data-testid="run-analysis-button"
>
  {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isAnalyzing ? 'Analyzing' : 'Run Fairness Analysis'}
</Button>
```

**Test Impact:** Once fixed, 3 tests unblock (TC-DASH-001, TC-EXPORT-001, others)

---

### BLOCKER #2: Mode Banners Not Found ⚠️ HIGH PRIORITY
**Impact:** 4 tests failing  
**Expected:** Yellow banner for User, Gray for Reviewer/Auditor  
**Status:** Not implemented in current ExplainBoard  

**Frontend Action Required:**
Option A (Implement Banners):
```tsx
// IN: /frontend/src/app/dashboard/explainboard/page.tsx
// ADD: Mode banner component above main content

const roleBannerConfig = {
  user: { color: 'yellow', text: 'Interactive Analysis Mode' },
  reviewer: { color: 'gray', text: 'Read-Only Audit View' },
  admin: { color: 'red', text: 'Administrator Mode' }
};

<div className={`bg-${roleBannerConfig[role].color}-100 border-l-4 border-${roleBannerConfig[role].color}-500 p-4`}
  data-testid="mode-banner"
>
  {roleBannerConfig[role].text}
</div>
```

Option B (Skip Tests):
- Update tests to skip mode banner checks if not implemented
- Mark as TC-EXPLAIN-001/002 as TODO

**Test Impact:** 4 tests depend on this

---

### BLOCKER #3: Auditor/Reviewer Login Timeout ⚠️ MEDIUM PRIORITY
**Impact:** 5 tests failing  
**User:** `reviewer-test@example.com`  
**Issue:** Login takes >30 seconds or redirects to different page  

**Backend/Auth Action Required:**
1. Check if reviewer-test account exists in Firebase
2. Check if account has correct role assigned
3. Test login speed: `curl -X POST http://localhost:5000/auth/firebase/exchange`
4. Verify redirect URL after login:
   - Expected: `/dashboard`
   - Actual: Likely `/dashboard/reviewer`

**Frontend Action Required:**
1. Check `/frontend/src/middleware.ts` for reviewer redirect logic
2. If reviewer redirects to `/dashboard/reviewer`, that's OK:
   - Update test assertion to accept both URLs
   - OR update contract to specify reviewer redirect path

**Test Code Fix:**
```javascript
// FROM:
await driver.wait(until.urlContains('/dashboard'), TIMEOUT_MS);

// TO (accepting both paths):
await driver.wait(
  until.urlMatches(/\/dashboard\/(reviewer)?/),
  TIMEOUT_MS
);
```

**Test Impact:** 5 tests (TC-AUTH-002, TC-AUTH-003, TC-DASH-002, TC-EXPLAIN-002, TC-EXPORT-003)

---

### BLOCKER #4: Export Modal Not Found ⚠️ MEDIUM PRIORITY
**Impact:** 2 tests failing  
**Status:** Not implemented in current report pages  

**Frontend Action Required:**
Option A (Implement Export):
```tsx
// IN: /frontend/src/app/dashboard/user/reports/[id]/page.tsx
// ADD: Export button + modal

<Button 
  onClick={() => setShowExportModal(true)}
  data-testid="export-button"
>
  Export Report
</Button>

// Export modal with format selector
```

Option B (Skip Tests):
- Update tests to skip export checks if not implemented
- Mark TC-EXPORT-001 as TODO

**Test Impact:** 2 tests depend on this

---

## SECONDARY ISSUES — NICE TO HAVE

### ISSUE #1: Add data-testid Attributes
**Benefit:** Makes tests more robust and maintainable  
**Components to update:**
- `upload-form.tsx`: Add data-testid to "Load Example Dataset" button
- `explainboard/page.tsx`: Add data-testid to Re-run button
- Report pages: Add data-testid to Export button

**Code Example:**
```tsx
<Button data-testid="load-example-button">
  Load Example Dataset
</Button>
```

### ISSUE #2: Browser Stability
**Issue:** Chrome WebDriver runs out of ports after 2-3 test suites  
**Solution:** Add cleanup between suites

**Code Fix:**
```javascript
afterEach(async function() {
  if (this.driver) {
    await this.driver.quit();  // Force cleanup
  }
});
```

### ISSUE #3: Test Timeouts
**Issue:** Some operations take >30 seconds  
**Solution:** Increase timeout or optimize performance

---

## RESOLUTION CHECKLIST

### Frontend Team
- [ ] **BLOCKER 1**: Add `data-testid="run-analysis-button"` to Run Fairness Analysis button
- [ ] **BLOCKER 2**: Either implement mode banners OR confirm they're not in scope
- [ ] **BLOCKER 4**: Either implement export modal OR confirm it's not in scope
- [ ] Add `data-testid` attributes to remaining UI elements (optional but recommended)
- [ ] Confirm reviewer redirect path (/dashboard vs /dashboard/reviewer)

### Backend Team
- [ ] **BLOCKER 3**: Verify reviewer-test@example.com login works correctly
- [ ] Check login performance (should be <10 seconds)
- [ ] Verify role assignment is correct

### QA/DevOps
- [ ] Once above items fixed, re-run: `npm run test:phase3a:headless`
- [ ] Capture output to `/tmp/phase3a_results.txt`
- [ ] Report passing/failing counts to team

---

## SUCCESS CRITERIA

**Phase 3A tests will PASS when:**
1. ✅ Upload button has correct selector or data-testid
2. ✅ Mode banners are implemented OR tests are skipped
3. ✅ Auditor login works within timeout
4. ✅ Export modal is implemented OR tests are skipped
5. ✅ 15+ tests passing (18 total - 2-3 TODOs)

**Timeline:** 2-4 hours with frontend team collaboration

---

## CONTACT/ESCALATION

**If issues not addressed by:** 2026-01-13 10:00 UTC  
**Escalate to:** Development Lead + Frontend Team Lead  
**Email Summary:** Phase 3A test suite is deterministic but blocked on 4 UI elements

---

**Created:** 2026-01-12 17:55 UTC  
**Test Suite:** `/mnt/devmandrive/EthAI/tools/selenium/tests/phase3a.test.js`  
**Status:** ✅ READY FOR EXECUTION (pending frontend fixes)
