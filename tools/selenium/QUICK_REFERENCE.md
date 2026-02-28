# 🎯 QUICK REFERENCE — SELENIUM E2E DEPLOYMENT

**Print this. Post it. Reference constantly.**

---

## 📍 CORE DOCUMENTS (Read in Order)

1. **testplan.md** — Operating principles (original)
2. **INTELLIGENCE_REPORT.md** — Complete page + API contracts (NEW)
3. **SELENIUM_DEPLOYMENT_GUIDE.md** — Test execution (NEW)
4. **MISSION_STATUS_REPORT.md** — Status + handoff (NEW)

---

## 🔐 THE GOLDEN RULES

1. **Page Contracts Are Law** — Implement exactly. No UX changes.
2. **No Improvisation** — If unclear, mark TODO and halt.
3. **Role Isolation Is Sacred** — Test every permission. No leakage.
4. **Audit Everything** — Every action = audit log entry + request_id.
5. **request_id On Every Call** — Validation + traceability.
6. **Degradation Must Show** — No silent failures.
7. **RBAC Tests First** — Permission matrix 100% enforced.

---

## 📋 PAGE CONTRACTS AT A GLANCE

| Page | Route | Auth | Key Roles | Critical Contract |
|---|---|---|---|---|
| Landing | `/` | Public | Any | Redirect authenticated → dashboard |
| Login | `/login` | Public | None | Firebase auth + exchange → JWT |
| Dashboard | `/dashboard` | Protected | All | Role-aware sidebar, upload button |
| **ExplainBoard** | `/dashboard/explainboard` | Protected | All | **Mode banners (yellow/gray/red)** |
| | | | User | Re-run enabled |
| | | | Auditor | Re-run DISABLED, "Read-Only" banner |
| | | | Admin | Re-run enabled, "Override" red banner |
| Reports | `/dashboard/reports` | Protected | Owner/Admin/Auditor | Auditor sees published only |
| Export Modal | Modal overlay | Protected | Owner/Admin/Auditor | Signed artifact + audit log + approval flow |
| Admin/Users | `/dashboard/admin/users` | Protected | Admin | CRUD users, assign roles, audit |
| Audit Log | `/dashboard/admin/audit` | Protected | Admin/Auditor | All actions + request_id |
| Error Pages | `/403`, `/404`, `/500` | Public | Any | Show error + request_id (500) |

---

## 🔄 CRITICAL FLOWS

### **Login → Dashboard**
```
1. User enters email + password
2. POST /login → Firebase auth
3. Firebase returns UID + ID token
4. POST /auth/firebase/exchange { idToken }
5. Backend validates, creates JWT/cookie
6. Redirect → /dashboard (or /admin if Admin)
7. Audit log: "login" action
```

### **Upload → Job → Polling**
```
1. User clicks upload, selects file
2. POST /v1/jobs { dataset_name, analysis_type }
3. Response: { job_id, request_id, status: "pending" }
4. Job appears in /dashboard/jobs instantly
5. Frontend polls GET /v1/jobs/:id every 2–5s
6. Status: pending → running → completed/failed
7. Failed job shows request_id + retry button
8. Audit log: "job_submitted" + "job_cancelled" (if retry)
```

### **ExplainBoard Re-Run (User vs Auditor)**
```
User:
1. Click Re-Run button (ENABLED)
2. Submit new parameters
3. POST /api/v1/explain { features, model_id }
4. New job created
5. Audit log: "parameter_edit" + user_id + request_id

Auditor:
1. Try click Re-Run button (DISABLED/GRAYED)
2. No action
3. No API call
4. No audit log entry
```

### **Export → Signed Artifact → Audit**
```
1. Click Export button on report
2. Modal opens: format (PDF/JSON/CSV), scope, PII checkbox
3. Click Export
4. POST /v1/reports/:id/export { format, scope, include_pii }
5. Response: { export_id, status, download_url, signature, request_id }
6. Download triggered
7. Audit log: "report_export" + scope + format + include_pii + request_id
8. If Auditor + approval required: status = "pending_approval"
```

---

## ✅ RBAC ENFORCEMENT CHECKLIST

### **Test Every Row**

```
[ ] User can upload, Auditor cannot (403)
[ ] User can run analysis, Auditor cannot (403)
[ ] Auditor can view reports (if published)
[ ] Auditor cannot re-run analysis (button disabled)
[ ] Admin can access /admin pages, others cannot (403)
[ ] Admin + Auditor can view audit log, others cannot (403)
[ ] User sees own reports + published
[ ] Auditor sees published only
[ ] Admin sees all reports
[ ] Export by Auditor may require approval
```

---

## 🚨 FORBIDDEN ACTIONS (Must Block)

| Action | UI Enforcement | API Enforcement |
|---|---|---|
| Auditor uploads | Button hidden | POST /v1/jobs → 403 |
| Auditor re-runs | Button disabled | POST /api/v1/explain (with edits) → 403 |
| Non-admin accesses admin | Link hidden | GET /v1/admin/* → 403 |
| Non-auditor views audit log | Link hidden | GET /v1/admin/audit-log → 403 |
| Non-owner deletes report | Button hidden | DELETE /v1/reports/:id → 403 |
| Non-owner cancels job | Button hidden | POST /v1/jobs/:id/cancel → 403 |

---

## 📊 AUDIT LOG MANDATORY FIELDS

Every entry must include:

```json
{
  "timestamp": "ISO 8601",
  "user_id": "uid-xxx",
  "user_email": "email@example.com",
  "user_role": ["role"],
  "action": "one_of: login, logout, role_change, job_submitted, job_cancelled, parameter_edit, report_export, user_created, user_deleted, policy_updated",
  "resource": "entity:id (e.g., report:abc, user:xyz)",
  "status": "success|failure",
  "request_id": "req-uuid",
  "details": { "old_value", "new_value", "reason", "error_message" }
}
```

**Mandatory Triggers (9):**
- [ ] login
- [ ] logout
- [ ] role_change
- [ ] policy_updated
- [ ] report_export
- [ ] job_submitted
- [ ] job_cancelled
- [ ] user_created
- [ ] user_deleted

---

## 🔍 request_id VALIDATION CHECKLIST

For every API call:

```
[ ] Response includes request_id (header or body)
[ ] Frontend logs request_id on error
[ ] Audit log entry includes request_id
[ ] Export modal displays request_id to user
[ ] Failed job detail shows request_id + support message
[ ] request_id matches across request ↔ audit trail
```

---

## 🚀 TEST EXECUTION COMMANDS

```bash
# Install
cd /mnt/devmandrive/EthAI/tools/selenium && npm install

# Run all tests (headless)
npm test

# Run specific suite
npx mocha tests/01-auth.test.js
npx mocha tests/03-explainboard.test.js

# Debug mode (headed browser)
SELENIUM_HEADLESS=false npm test

# Generate report
npm test -- --reporter html > reports/test-report.html
```

---

## 🎯 TEST SUITE BREAKDOWN

| Suite | Focus | Critical Tests |
|---|---|---|
| **01-auth** | Login, logout, redirects | User/Auditor/Admin redirect behavior |
| **02-dashboard** | Upload, jobs, RBAC | Job creation, persistence, auditor block |
| **03-explainboard** | Mode banners, re-run, degradation | User vs Auditor re-run, banners, cached data |
| **04-export-audit** | Exports, audit log, approval | Export → audit log, request_id, auditor approval |
| **05-admin** | User management, policies | Create/delete user, role assignment, audit |
| **06-rbac** | Permission matrix | All 10 actions × 5 roles = 50 assertions |
| **07-error** | 403, 404, 500 pages | Error page rendering, request_id on 500 |

**Total: 41 test cases + RBAC matrix (50 permission assertions)**

---

## ⚠️ TODOs (Halt if Unclear)

If a test requirement is unclear:

1. Mark it with `// TODO: [clarification needed]`
2. Log the ambiguity
3. **Do not proceed** without clarification
4. Escalate immediately

**Example:**
```javascript
// TODO: Confirm if Auditor export requires admin approval by default.
// Check backend config: require_admin_approval_for_auditor_export
test('Auditor export approval flow', async () => {
  // HALT HERE — need backend confirmation
});
```

---

## 🔐 SECURITY VALIDATION (Post-Test)

```
[ ] No role leakage (auditor can't upload)
[ ] All forbidden actions blocked (UI + API)
[ ] Audit logging complete (no silent actions)
[ ] request_id propagation verified (request → response → audit)
[ ] Degradation visible (no silent failures)
[ ] Session invalidated after logout
[ ] Error pages show no sensitive data
[ ] Auditor read-only enforced (no edits possible)
[ ] Admin override context audited
```

---

## 📞 WHEN STUCK

1. **Check INTELLIGENCE_REPORT.md** — The contract is law
2. **Read the error log** — request_id helps support
3. **Verify page contract** — Screenshot + compare to spec
4. **Check RBAC matrix** — Is permission enforced?
5. **Validate audit log** — Did action get logged?
6. **Mark TODO** — Escalate if unclear

---

## 🎖️ SUCCESS CRITERIA

- ✅ 41 test cases pass
- ✅ RBAC matrix 100% enforced
- ✅ Every audit log entry includes request_id
- ✅ Degradation banners shown (not silent)
- ✅ Mode banners match role (yellow/gray/red)
- ✅ No role confusion or leakage
- ✅ Error pages render correctly

---

**POST THIS CARD IN YOUR TEAM SPACE**

**Questions?** Check INTELLIGENCE_REPORT.md (page contracts) or SELENIUM_DEPLOYMENT_GUIDE.md (execution)

**Executing:** EthAI-Guard Selenium E2E Tests  
**Approved:** Phase 3 (Immediate Deployment)  
**Locked:** 2026-01-12  

