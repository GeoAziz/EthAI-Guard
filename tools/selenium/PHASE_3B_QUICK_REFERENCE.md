# 🎯 PHASE 3B QUICK REFERENCE

**Status:** ✅ READY | **Tests:** 25 | **Expected Pass:** 18-20 | **Time:** 20-30 min

---

## 🚀 START HERE

```bash
cd /mnt/devmandrive/EthAI/tools/selenium
npm run test:phase3b:headless
```

---

## 📋 WHAT'S TESTED

### Suite 1: Admin (7 tests)
- ✅ Admin dashboard access
- ✅ User management permissions
- ✅ Audit log visibility
- ✅ Sidebar role rendering

### Suite 2: Errors (5 tests)
- ✅ 403 Forbidden page
- ✅ 404 Not Found page
- ✅ Unauthorized access
- ✅ Session expiration
- ✅ Unauthenticated redirect

### Suite 3: RBAC (5 tests)
- ✅ Upload: User yes, Auditor no
- ✅ Admin endpoints: Only admin access
- ✅ Audit log: Admin + Auditor only
- ✅ Dashboard: All roles access
- ✅ ExplainBoard: User/Auditor/Admin only

### Suite 4: Degradation (8 tests)
- ✅ Empty state handling
- ✅ Connection recovery
- ✅ Long page loads
- ✅ Browser back button
- ✅ Rapid role switches

---

## 🎮 VARIANTS

| Command | Purpose |
|---------|---------|
| `npm run test:phase3b:headless` | Full suite (headless) 🔥 RECOMMENDED |
| `npm run test:phase3b:gui` | Full suite (with browser) 🌐 DEBUG |
| `npx mocha tests/phase3b.test.js --grep "Suite 1"` | Admin tests only |
| `npx mocha tests/phase3b.test.js --grep "Suite 2"` | Error tests only |
| `npx mocha tests/phase3b.test.js --grep "Suite 3"` | RBAC tests only |
| `npx mocha tests/phase3b.test.js --grep "Suite 4"` | Degradation tests only |
| `npx mocha tests/phase3b.test.js --grep "TC-ADMIN-001"` | Single test |

---

## ✅ PRE-RUN CHECKLIST

```bash
# One command check
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend" || echo "❌ Frontend"
curl -s http://localhost:5000 > /dev/null && echo "✅ Backend" || echo "❌ Backend"
node --version && echo "✅ Node.js" || echo "❌ Node.js"
which chromedriver && echo "✅ ChromeDriver" || echo "❌ ChromeDriver"
```

---

## 📊 RESULTS INTERPRETATION

| Result | Status | Next Action |
|--------|--------|-------------|
| 25/25 passing ✅ | SUCCESS | Proceed to Phase 3C |
| 20-24 passing 🟡 | GOOD | Review TODOs, minor fixes needed |
| 15-19 passing 🟡 | PARTIAL | UI features need implementation |
| <15 passing ❌ | CRITICAL | Escalate to team, blocker identified |

---

## 🔍 IF TESTS FAIL

**Step 1:** Check error message
```
❌ TC-ADMIN-001: Admin can access user management page
   Expected: Page loads and displays
   Actual: 404 Not Found or permission denied
```

**Step 2:** Identify root cause
- Is it a **missing page**? → Frontend team needs to create it
- Is it a **permission error**? → Backend role check issue
- Is it a **selector not found**? → UI component changed

**Step 3:** Capture context
```bash
# Run single failing test with full output
npx mocha tests/phase3b.test.js --grep "TC-ADMIN-001" --reporter spec
```

**Step 4:** Escalate
- Document test name, expected, actual, error
- Assign to appropriate team (Frontend/Backend)
- Mark as blocker if critical

---

## 📁 KEY FILES

| File | Purpose |
|------|---------|
| `tests/phase3b.test.js` | Test source code (25 tests) |
| `PHASE_3B_EXECUTION_GUIDE.md` | Detailed execution guide |
| `package.json` | NPM scripts and dependencies |
| `INTELLIGENCE_REPORT.md` | API contracts and page specs |
| `../../creds.md` | Test user credentials |

---

## 💡 COMMON ISSUES & FIXES

| Issue | Cause | Fix |
|-------|-------|-----|
| `Cannot find module 'selenium-webdriver'` | Deps not installed | `npm install` |
| `Chrome driver not found` | ChromeDriver not installed | Install Chrome/Chromium |
| `Connection refused localhost:3000` | Frontend not running | Start frontend server |
| `Connection refused localhost:5000` | Backend not running | Start backend server |
| `Tests timeout after 30s` | Page loads slow | Increase timeout: `--timeout 60000` |
| `Admin page not found (404)` | Page not created yet | TODO: Frontend team implements |

---

## ⏱️ EXECUTION TIMELINE

```
Pre-check:           30 seconds
Suite 1 (Admin):     4-5 min
Suite 2 (Errors):    3-4 min
Suite 3 (RBAC):      4-5 min
Suite 4 (Degrade):   5-6 min
Reporting:           1-2 min
                     ───────
Total:               18-25 minutes
```

---

## 🎯 SUCCESS CRITERIA

✅ **Phase 3B is COMPLETE when:**
1. 20+ tests passing
2. All admin endpoints secured (403 for non-admins)
3. RBAC matrix enforced (no role leakage)
4. Error pages render correctly
5. Session management works (logout, expiration)

✅ **Ready for Phase 3C when:**
- All 5 suites passing
- No critical blockers remaining
- Audit trail verified complete

---

## 📞 ESCALATION CONTACT

**If stuck:**
1. Check `PHASE_3B_EXECUTION_GUIDE.md` for detailed help
2. Review `INTELLIGENCE_REPORT.md` for contract specs
3. Capture test output: `npm run test:phase3b:headless 2>&1 | tee /tmp/phase3b.log`
4. Post failure details to development team

---

## 🚀 QUICK START

```bash
# Copy-paste this one command:
cd /mnt/devmandrive/EthAI/tools/selenium && npm run test:phase3b:headless
```

**Watch for:**
- ✅ Green checkmarks = Tests passing
- ❌ Red X's = Tests failing
- 🟡 Yellow summary = Details at end

---

**Last Updated:** 2026-01-12 18:00 UTC  
**Version:** Phase 3B v1.0  
**Test File Size:** 659 lines  
**Estimated Coverage:** 40+ endpoints, 5 roles, 8 permission matrices
