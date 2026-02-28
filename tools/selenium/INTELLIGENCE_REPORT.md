# 🎯 MISSION INTELLIGENCE REPORT — EthAI-Guard

**Classification:** OPERATIONAL INTEL (BINDING FOR E2E DEPLOYMENT)  
**Date:** 2026-01-12  
**Status:** LOCKED — Ready for Selenium E2E Execution  

---

## 📋 EXECUTIVE SUMMARY

**System Architecture:**
- **Frontend:** Next.js 15.5.7 (React 18.3.1) with Tailwind CSS
- **Backend:** FastAPI (Python) with Firebase Auth integration
- **Auth Layer:** Firebase Authentication + Backend JWT tokens
- **Storage:** Firestore (document store for audit logs, roles, configs)
- **Session Mode:** HttpOnly cookies (backend-enforced; cookies set by `/auth/firebase/exchange`)

**Core Roles:**
- **User / Data Scientist:** Explore, analyze, upload datasets
- **Auditor:** Read-only access, export reports, verify decisions
- **Admin:** System control, user management, policy enforcement
- **Analyst:** Focused analysis workflow (reduced cognitive load)
- **Reviewer:** Review and approve reports

---

## 1️⃣ FRONTEND — PAGE INVENTORY

### **Public Pages (No Auth Required)**

#### Page Contract: Landing Page
- **Route:** `/` (root)
- **Auth:** Public
- **Roles Allowed:** Any (redirects authenticated users)
- **Page Purpose:** Inform stakeholders; sign-up/login entry point
- **Visible Capabilities:**
  - Browse feature overview
  - Access help/docs links
  - Sign up / Log in buttons
- **Forbidden Capabilities:**
  - Upload datasets
  - View analytics
  - Access user-specific data
- **States:** `ready`, `loading`
- **E2E Assertions:**
  - Page title contains "EthixAI"
  - Login button routes to `/login`
  - Sign-up button routes to `/register`
  - Authenticated users redirected to `/dashboard`

---

#### Page Contract: Login Page
- **Route:** `/login`
- **Auth:** Public
- **Roles Allowed:** Unauthenticated users only
- **Page Purpose:** Authenticate user via Firebase
- **Visible Capabilities:**
  - Email/password login form
  - "Forgot password" link
  - "Sign up" link
- **Forbidden Capabilities:**
  - None (public-facing)
- **States:** `ready`, `loading`, `error`, `success`
- **Evidence Obligations:**
  - Audit log entry on successful login
  - request_id included in backend exchange response
  - Session/token set (HttpOnly cookie or localStorage)
- **E2E Assertions:**
  - Form submits with valid email/password
  - Invalid credentials show error message
  - Successful login redirects to `/dashboard` (or role-specific landing)
  - Firebase auth listener triggered on submit

---

#### Page Contract: Register Page
- **Route:** `/register`
- **Auth:** Public
- **Roles Allowed:** Unauthenticated users only
- **Page Purpose:** Create new user account
- **Visible Capabilities:**
  - Email/password registration form
  - Terms acceptance checkbox
  - "Already have account?" login link
- **Forbidden Capabilities:**
  - None (public-facing)
- **States:** `ready`, `loading`, `error`, `success`
- **Evidence Obligations:**
  - Audit log on account creation
  - Email verification triggered (if required)
- **E2E Assertions:**
  - Form validates email format
  - Password validation rules enforced
  - Successful registration creates Firebase user
  - Redirects to `/dashboard` or verification page

---

#### Page Contract: Error Pages
- **Routes:** `/403` (Forbidden), `/404` (Not Found), `/500` (Server Error), `/unauthorized`
- **Auth:** Public
- **Page Purpose:** Communicate error state and recovery options
- **Visible Capabilities:**
  - Error message
  - "Back to dashboard" / "Contact support" links
- **Forbidden Capabilities:**
  - Data access
  - Admin controls
- **E2E Assertions:**
  - Page renders for unauthorized role access
  - Error code displayed correctly
  - Navigation links functional

---

### **Protected Pages (Auth Required)**

#### Page Contract: Dashboard Home
- **Route:** `/dashboard`
- **Auth:** Protected
- **Roles Allowed:** User, Admin, Analyst, Auditor, Reviewer
- **Page Purpose:** Central hub; upload datasets, navigate to analysis
- **Visible Capabilities:**
  - Upload dataset button/drag-drop
  - Quick links to FairLens, ExplainBoard, Compliance
  - User profile menu
  - Role-specific sidebar (role-aware menu)
- **Forbidden Capabilities:**
  - Admin controls (unless Admin role)
  - Edit other users' data
  - Bypass permission checks
- **States:** `ready`, `loading`, `empty`, `error`
- **Evidence Obligations:**
  - Audit log on file upload initiated
  - request_id propagated to backend
- **UX Invariants:**
  - Sidebar menu reflects user role
  - Admin menu items hidden for non-admins
  - Analyst menu simplified (only Run Analysis, Reports)
  - User can see only own datasets initially
- **E2E Assertions:**
  - Unauthenticated users redirected to `/login`
  - Correct role-based sidebar rendered
  - Upload form accepts file input
  - File submission creates job entry in `/dashboard/jobs`

---

#### Page Contract: FairLens Dashboard
- **Route:** `/dashboard/fairlens`
- **Auth:** Protected
- **Roles Allowed:** User, Admin, Analyst
- **Page Purpose:** View fairness metrics and model bias analysis
- **Visible Capabilities:**
  - Fairness score overview
  - Demographic parity, equal opportunity metrics
  - Model comparison charts
  - Download/export report button
- **Forbidden Capabilities:**
  - Auditor cannot modify metrics
  - Non-admins cannot change thresholds
- **States:** `ready`, `loading`, `empty`, `degraded`, `error`
- **Degraded State Rules:**
  - If fairness engine unavailable: show "Fairness metrics temporarily unavailable" banner
  - Show last known values if available
  - Mark exports as "Partial Metrics"
- **E2E Assertions:**
  - Charts render with data
  - Auditors see read-only view
  - Export button visible (may require approval for Auditors)
  - request_id logged with each export

---

#### Page Contract: ExplainBoard (CORE CONTRACT)
- **Route:** `/dashboard/explainboard`
- **Auth:** Protected
- **Roles Allowed:** User, Admin, Analyst, Auditor
- **Page Purpose:** Interactive SHAP explanations for model predictions
- **Visible Capabilities (All Roles):**
  - Feature importance chart (SHAP values)
  - Prediction breakdown
  - Individual prediction details
  - Export/download button
- **Visible Capabilities (By Role):**
  - **User/Analyst:** Full interactivity (re-run, edit parameters, adjust features)
  - **Admin:** Override mode banner; full control + audit trail
  - **Auditor:** Read-only view; no re-run, no parameter edits
- **Forbidden Capabilities:**
  - Auditor: Cannot re-run analysis
  - Auditor: Cannot edit prediction parameters
  - Auditor: Cannot silently interactivity
  - Non-admins: Cannot access admin override mode
- **States:** `ready`, `loading`, `degraded`, `read-only`, `interactive`, `error`, `permission_denied`
- **Mode Banners (MANDATORY):**
  - **User/Analyst:** "Interactive Analysis Mode" (yellow banner, top)
  - **Auditor:** "Read-Only Audit View" (gray banner, top)
  - **Admin:** "Administrative Override Context" (red banner, top)
- **Degraded State:**
  - If SHAP unavailable: show degradation banner
  - Provide textual summary of features
  - Mark all exports as "Partial Explainability"
  - Disable re-run; show cached results only
- **Evidence Obligations:**
  - Audit log on every export
  - Audit log on parameter edits (User/Analyst/Admin)
  - request_id in every backend call
  - Signed artifact for exported explainability (Admin/Auditor only)
- **UX Invariants:**
  - Mode banner always visible
  - Read-only controls grayed out for Auditors
  - No silent degradation
  - Export confirmation required for sensitive exports (PII, etc.)
- **E2E Assertions:**
  - User can re-run; Auditor cannot
  - SHAP chart renders or degradation shown
  - Mode banner matches role
  - Export creates audit log entry + signed artifact
  - request_id propagated to backend
  - Auditor sees "Read-Only Audit View" banner
  - Auditor's export requires admin approval (if configured)

---

#### Page Contract: Compliance Dashboard
- **Route:** `/dashboard/compliance`
- **Auth:** Protected
- **Roles Allowed:** User, Admin, Auditor, Reviewer
- **Page Purpose:** View compliance status; track regulatory adherence (ECOA, GDPR, FCRA)
- **Visible Capabilities:**
  - Compliance score
  - Regulatory requirement checklist
  - Open issues / violations
  - Download compliance report
- **Forbidden Capabilities:**
  - Non-admins cannot change compliance rules
  - Auditors cannot override violations
- **States:** `ready`, `loading`, `empty`, `error`
- **E2E Assertions:**
  - Compliance checks display
  - Admin can edit rules (if permitted)
  - Auditor sees read-only view
  - Report export triggers audit log

---

#### Page Contract: Jobs Queue
- **Route:** `/dashboard/jobs` (implied; may be sub-page or modal)
- **Auth:** Protected
- **Roles Allowed:** User, Admin, Analyst
- **Page Purpose:** Monitor long-running analysis jobs
- **Visible Capabilities:**
  - Job list (created_at, status, dataset, progress)
  - Job detail link
  - Cancel/retry actions (based on status)
- **Forbidden Capabilities:**
  - Auditor cannot cancel jobs
  - Non-owners cannot see other users' jobs (unless admin)
- **States:** `ready`, `loading`, `empty`, `error`
- **Long-Running Job Rules (MANDATORY):**
  - Job appears in list immediately after submission (jobId returned)
  - Job persists across browser refresh
  - Job survives network loss (resume on reconnect)
  - Duplicate submissions rejected (idempotency)
  - Failed job shows: friendly message + request_id + retry button
- **E2E Assertions:**
  - File upload creates job entry instantly
  - Job status updates (polling or WebSocket)
  - Failure shows request_id and retry button
  - Admin can cancel any job
  - Non-admin cannot cancel others' jobs

---

#### Page Contract: Job Detail
- **Route:** `/dashboard/jobs/:id`
- **Auth:** Protected
- **Roles Allowed:** Job owner, Admin
- **Page Purpose:** View detailed job status and results
- **Visible Capabilities:**
  - Job metadata (status, created_at, dataset, user)
  - Progress bar (if running)
  - Result summary (if completed)
  - Error details (if failed)
  - Logs link (if available)
- **Forbidden Capabilities:**
  - Non-owner cannot view (unless Admin)
  - Auditor cannot access
- **States:** `pending`, `running`, `completed`, `failed`, `cancelled`
- **E2E Assertions:**
  - Job detail page loads
  - Status reflects backend state
  - Failed jobs show error message + request_id
  - Owner can retry
  - Non-owner redirected (or 403)

---

#### Page Contract: Reports List
- **Route:** `/dashboard/reports` (implied; may be composite with ExplainBoard)
- **Auth:** Protected
- **Roles Allowed:** User, Admin, Auditor, Reviewer
- **Page Purpose:** Browse completed analysis reports
- **Visible Capabilities:**
  - Report list (title, created_at, model, fairness score)
  - Report detail link
  - Export button
  - Filter/search
- **Forbidden Capabilities:**
  - Auditor cannot edit reports
  - Non-owners cannot see unpublished reports (unless Admin)
  - Non-admins cannot delete reports
- **States:** `ready`, `loading`, `empty`, `error`
- **E2E Assertions:**
  - Reports list renders
  - Auditor sees published reports only
  - Admin sees all reports
  - Export button triggers export flow
  - Audit log entry on export

---

#### Page Contract: Report Detail / ExplainBoard (CONSOLIDATED)
- **Route:** `/dashboard/reports/:id` or `/dashboard/explainboard?report=:id`
- **Auth:** Protected
- **Roles Allowed:** User (owner), Admin, Auditor (if published), Reviewer
- **Page Purpose:** Detailed explainability for a specific prediction/model
- **Visible Capabilities:** (See ExplainBoard contract above)
- **Role-Based Visibility:**
  - **Auditor:** Read-only explainability (no re-run)
  - **Admin:** Full override + audit trail
  - **User:** Full interactivity if owner
  - **Reviewer:** Read-only with approval workflows
- **Degraded State:** (See ExplainBoard contract)
- **E2E Assertions:** (See ExplainBoard contract)

---

#### Page Contract: Export Modal
- **Route:** Modal overlay on `/dashboard/reports/:id` (or similar)
- **Auth:** Protected
- **Roles Allowed:** User (owner), Admin, Auditor (if permitted), Reviewer
- **Page Purpose:** Download/export explainability artifact
- **Visible Capabilities:**
  - Format selector (PDF, JSON, CSV)
  - Scope selector (full report, summary, metrics only)
  - PII confirmation checkbox (if applicable)
  - Download button
- **Forbidden Capabilities:**
  - Auditor cannot export without approval (if configured)
  - Non-owner cannot export private reports
  - Unverified exports blocked
- **States:** `ready`, `requesting_approval`, `approved`, `error`, `forbidden`
- **Evidence Obligations:**
  - Audit log entry on every export
  - Signed artifact (signature validates export time + user + scope)
  - PII exports require explicit confirmation + audit logging
  - request_id in backend export request
- **E2E Assertions:**
  - Export modal opens
  - Format selection works
  - PII checkbox shown (if applicable)
  - Download triggers audit log + signature
  - Auditor export may require approval (check backend)
  - request_id propagated to backend

---

#### Page Contract: Admin Dashboard
- **Route:** `/dashboard/admin` or `/admin`
- **Auth:** Protected
- **Roles Allowed:** Admin only
- **Page Purpose:** System administration; user management, policy control, audit logs
- **Visible Capabilities:**
  - Quick stats (users, policies, violations)
  - Links to user management, settings, audit log
  - System health indicator
  - Policy editor
- **Forbidden Capabilities:**
  - Non-admins cannot access (403 or redirect)
  - Non-admins cannot see system stats
- **States:** `ready`, `loading`, `error`, `permission_denied`
- **E2E Assertions:**
  - Non-admin redirected or sees 403
  - Admin sees dashboard
  - Links to admin pages functional
  - System stats display

---

#### Page Contract: Admin User Management
- **Route:** `/dashboard/admin/users`
- **Auth:** Protected
- **Roles Allowed:** Admin only
- **Page Purpose:** Manage users (create, edit, delete, assign roles)
- **Visible Capabilities:**
  - User list (email, role, created_at, status)
  - Create user button
  - Edit / delete actions per row
  - Role assignment selector
  - Bulk actions (optional)
- **Forbidden Capabilities:**
  - Non-admins cannot access
  - Admin cannot delete self (optional business rule)
  - Cannot assign role beyond own role (optional)
- **States:** `ready`, `loading`, `empty`, `error`, `creating`, `editing`
- **Evidence Obligations:**
  - Audit log on user creation
  - Audit log on role change
  - Audit log on user deletion
  - request_id in backend calls
- **E2E Assertions:**
  - User list renders
  - Create user form works
  - Role assignment updates backend
  - Delete action shows confirmation + audit log
  - Non-admin cannot access (403)

---

#### Page Contract: Admin Policy Editor
- **Route:** `/dashboard/admin/settings` or `/dashboard/admin/policies`
- **Auth:** Protected
- **Roles Allowed:** Admin only
- **Page Purpose:** Configure system policies (fairness thresholds, audit rules, access controls)
- **Visible Capabilities:**
  - Policy list (name, value, last_modified)
  - Edit policy form
  - Save / cancel buttons
  - Validation feedback
- **Forbidden Capabilities:**
  - Non-admins cannot edit policies
  - Cannot set invalid thresholds
- **States:** `ready`, `loading`, `editing`, `saving`, `error`
- **Evidence Obligations:**
  - Audit log on policy change
  - Old value + new value logged
  - request_id in backend call
- **E2E Assertions:**
  - Policy form renders
  - Validation enforced (e.g., fairness threshold 0–100)
  - Save triggers audit log
  - Non-admin cannot access

---

#### Page Contract: Audit Log
- **Route:** `/dashboard/admin/audit` or `/audit-log`
- **Auth:** Protected
- **Roles Allowed:** Admin, Auditor
- **Page Purpose:** View system audit trail (all actions, exports, role changes)
- **Visible Capabilities:**
  - Audit log table (timestamp, user, action, resource, result)
  - Filter/search (by user, action, date range)
  - Export audit log
  - Pagination
- **Forbidden Capabilities:**
  - Non-admins/non-auditors cannot access
  - Cannot modify/delete audit logs
  - Users cannot see other users' actions (unless admin)
- **States:** `ready`, `loading`, `empty`, `error`
- **Audit Log Schema:**
  - `timestamp` (ISO 8601)
  - `user_id` (Firebase UID)
  - `user_email`
  - `role`
  - `action` (e.g., "export", "role_change", "policy_edit", "login")
  - `resource` (e.g., "report:abc-123", "user:xyz-789")
  - `status` (success, failure)
  - `request_id`
  - `details` (optional; context-specific)
- **E2E Assertions:**
  - Audit log table renders
  - Filters work
  - Export button creates downloadable file
  - Admin sees all entries
  - Auditor sees all entries
  - Non-admin/non-auditor cannot access (403)

---

#### Page Contract: Settings / Profile
- **Route:** `/dashboard/settings` or `/account`
- **Auth:** Protected
- **Roles Allowed:** All authenticated users
- **Page Purpose:** Manage account preferences, change password, notification settings
- **Visible Capabilities:**
  - Email display (read-only)
  - Change password form
  - Notification preferences
  - Delete account button (optional)
- **Forbidden Capabilities:**
  - Cannot change others' profiles
  - Cannot change email (or requires verification)
- **States:** `ready`, `loading`, `saving`, `error`
- **E2E Assertions:**
  - Settings page loads
  - Password change form submits
  - Notification preferences save
  - Unauthenticated users redirected

---

#### Page Contract: Analyst Dashboard
- **Route:** `/dashboard/analyst` (implied)
- **Auth:** Protected
- **Roles Allowed:** Analyst only (or User with analyst role)
- **Page Purpose:** Focused workflow for analysis (reduced cognitive load)
- **Visible Capabilities:**
  - Run Analysis button
  - Reports list
  - Quick navigation (simplified sidebar)
- **Forbidden Capabilities:**
  - Admin controls
  - User management
  - System settings (not visible)
- **States:** `ready`, `loading`, `empty`, `error`
- **Sidebar Simplification (Analyst):**
  - Only show: Analyst Dashboard, Run Analysis, Reports
  - Hide: Datasets, Models, Fairness Thresholds (intentionally)
- **E2E Assertions:**
  - Analyst sidebar simplified
  - Non-analysts cannot access
  - Navigation links work

---

#### Page Contract: Reviewer Dashboard
- **Route:** `/dashboard/reviewer` (implied)
- **Auth:** Protected
- **Roles Allowed:** Reviewer only
- **Page Purpose:** Review and approve reports
- **Visible Capabilities:**
  - Pending reviews list
  - Review detail view
  - Approve / reject buttons
  - Comments/notes field
- **Forbidden Capabilities:**
  - Cannot run analyses
  - Cannot upload datasets
  - Cannot edit policies
- **States:** `ready`, `loading`, `empty`, `error`
- **E2E Assertions:**
  - Reviewer dashboard loads
  - Pending reviews display
  - Approve/reject buttons work
  - Non-reviewers cannot access

---

## 2️⃣ BACKEND — API INVENTORY

### **Authentication Endpoints**

#### POST `/auth/firebase/exchange`
- **Purpose:** Exchange Firebase ID token for backend JWT
- **Auth:** Firebase ID token in body
- **Request Body:**
  ```json
  {
    "idToken": "<firebase_id_token>"
  }
  ```
- **Response (Non-Cookie Mode):**
  ```json
  {
    "accessToken": "<backend_jwt>",
    "refreshToken": "<refresh_token>",
    "expiresIn": 3600
  }
  ```
- **Response (Cookie Mode):**
  ```json
  {
    "status": "ok"
  }
  ```
  (HttpOnly cookies set by backend)
- **Side Effects:**
  - Audit log: "firebase_exchange" (success/failure)
  - Roles fetched from Firebase custom claims
  - Session created (backend)
- **request_id Propagation:** Generated by backend; returned in response headers or body
- **E2E Assertions:**
  - Response includes accessToken or cookies set
  - request_id in response
  - Subsequent requests use token (or cookies)

---

#### GET `/auth/verify`
- **Purpose:** Verify session validity; returns role for redirects
- **Auth:** HttpOnly cookies or Authorization header
- **Request Headers:**
  - `Cookie: <session_cookie>` (or `Authorization: Bearer <token>`)
- **Response:**
  ```json
  {
    "authenticated": true,
    "role": "admin" | "user" | "auditor" | "analyst" | "reviewer",
    "user_id": "<uid>",
    "email": "<user_email>"
  }
  ```
- **Failure Response (401):**
  ```json
  {
    "authenticated": false,
    "error": "Invalid or expired session"
  }
  ```
- **E2E Assertions:**
  - Authenticated users return 200 + role
  - Unauthenticated users return 401
  - Middleware uses this to redirect root path

---

#### POST `/auth/logout`
- **Purpose:** Invalidate session
- **Auth:** HttpOnly cookies or Authorization header
- **Side Effects:**
  - Session revoked (backend)
  - Audit log: "logout" action
- **E2E Assertions:**
  - Subsequent requests return 401

---

### **API Endpoints (Protected)**

#### POST `/api/v1/bias`
- **Purpose:** Run bias/fairness check on data
- **Auth:** Required (User, Admin, Analyst)
- **Request Body:**
  ```json
  {
    "features": { "age": 30, "income": 50000, ... },
    "prediction": 0.85,
    "sensitive_attributes": ["age", "race", "gender"]
  }
  ```
- **Response:**
  ```json
  {
    "reports": [
      { "metric": "demographic_parity", "value": 0.95 },
      { "metric": "equal_opportunity", "value": 0.92 }
    ],
    "overall_fairness_score": 93.5,
    "request_id": "req-abc-123"
  }
  ```
- **Forbidden Roles:** Auditor (read-only; cannot submit)
- **request_id:** Included in response
- **Audit Log:** "bias_check" action with request_id
- **E2E Assertions:**
  - Auditor cannot call this endpoint (403)
  - User/Admin/Analyst can call
  - Response includes request_id

---

#### POST `/api/v1/explain`
- **Purpose:** Generate SHAP explanations for a prediction
- **Auth:** Required (all authenticated roles)
- **Request Body:**
  ```json
  {
    "features": { "age": 30, "income": 50000, ... },
    "prediction": 0.85,
    "model_id": "model-xyz"
  }
  ```
- **Response:**
  ```json
  {
    "explanation": {
      "age": 0.15,
      "income": 0.25,
      "credit_history": 0.10
    },
    "expected_value": 0.5,
    "request_id": "req-abc-123"
  }
  ```
- **Degraded State (500):**
  ```json
  {
    "error": "SHAP engine unavailable",
    "status": "degraded",
    "cached_explanation": { ... },
    "request_id": "req-abc-123"
  }
  ```
- **Auditor Restrictions:** Can call but read-only (no parameter edits allowed by frontend)
- **Audit Log:** "explain_request" with request_id
- **E2E Assertions:**
  - Auditor can call (GET only from frontend)
  - User/Admin/Analyst can call
  - Degraded state handled (cached data shown)
  - request_id in response

---

#### POST `/api/v1/audit`
- **Purpose:** Generate signed audit artifact for export
- **Auth:** Required (User, Admin, Auditor)
- **Request Body:**
  ```json
  {
    "report_id": "report-abc",
    "scope": "full" | "summary" | "metrics_only",
    "include_pii": false,
    "user_id": "<uid>"
  }
  ```
- **Response:**
  ```json
  {
    "audit_id": "audit-xyz",
    "status": "created" | "approved_pending",
    "artifacts": ["report.json", "signature.txt"],
    "signed_at": "2026-01-12T10:00:00Z",
    "request_id": "req-abc-123"
  }
  ```
- **Auditor Export (if requires approval):**
  - Response includes `status: "approved_pending"`
  - Frontend shows "Awaiting approval" message
  - Admin reviews + approves via separate endpoint
- **Audit Log:** "export_audit" with report_id, scope, PII flag, request_id
- **E2E Assertions:**
  - Export creates signed artifact
  - Audit log entry created
  - Auditor export may require approval (check response status)
  - request_id in response

---

#### GET `/v1/users/me`
- **Purpose:** Fetch current user profile + authoritative roles
- **Auth:** Required (all authenticated)
- **Response:**
  ```json
  {
    "user_id": "<uid>",
    "email": "<email>",
    "role": ["user"] | ["auditor", "user"] | ["admin"],
    "created_at": "2026-01-01T00:00:00Z",
    "preferences": { ... }
  }
  ```
- **E2E Assertions:**
  - Response includes authoritative role(s)
  - Frontend updates role cache from this endpoint
  - Unauthenticated users return 401

---

#### POST `/v1/jobs`
- **Purpose:** Submit analysis job (upload dataset, run bias/explain)
- **Auth:** Required (User, Admin, Analyst)
- **Request Body:**
  ```json
  {
    "dataset_name": "dataset.csv",
    "dataset_size_bytes": 102400,
    "analysis_type": "bias" | "explain" | "full",
    "user_id": "<uid>"
  }
  ```
- **Response:**
  ```json
  {
    "job_id": "job-abc-123",
    "status": "pending",
    "created_at": "2026-01-12T10:00:00Z",
    "request_id": "req-abc-123"
  }
  ```
- **Long-Running Job Rules:**
  - jobId returned immediately
  - Job persists (stored in Firestore)
  - Idempotency key: prevents duplicate jobs on retry
  - Job survives network loss (client polls `/v1/jobs/:id` for status)
- **Audit Log:** "job_submitted" with job_id, dataset_name, analysis_type, request_id
- **E2E Assertions:**
  - Job created instantly
  - jobId returned in response
  - request_id in response
  - Subsequent GET `/v1/jobs/:id` returns updated status

---

#### GET `/v1/jobs/:id`
- **Purpose:** Fetch job status + results (polling)
- **Auth:** Required (job owner or admin)
- **Response:**
  ```json
  {
    "job_id": "job-abc-123",
    "status": "pending" | "running" | "completed" | "failed" | "cancelled",
    "progress": 0.5,
    "result": { "fairness_score": 93.5, ... } (if completed),
    "error": "..." (if failed),
    "created_at": "2026-01-12T10:00:00Z",
    "completed_at": "2026-01-12T10:05:00Z" (if done),
    "request_id": "req-abc-123"
  }
  ```
- **Forbidden:** Non-owner or non-admin returns 403
- **E2E Assertions:**
  - Owner can fetch
  - Non-owner cannot fetch (403)
  - Admin can fetch any job
  - Status updates on poll

---

#### POST `/v1/jobs/:id/cancel`
- **Purpose:** Cancel running job
- **Auth:** Required (job owner or admin)
- **Response:**
  ```json
  {
    "job_id": "job-abc-123",
    "status": "cancelled",
    "request_id": "req-abc-123"
  }
  ```
- **Audit Log:** "job_cancelled" with job_id, request_id
- **E2E Assertions:**
  - Owner can cancel own job
  - Non-owner cannot cancel (403)
  - Admin can cancel any job
  - Audit log entry created

---

#### GET `/v1/jobs`
- **Purpose:** List jobs (with pagination/filtering)
- **Auth:** Required (User, Admin)
- **Query Params:**
  - `user_id` (optional; admin can filter by user)
  - `status` (optional; "pending", "completed", "failed", etc.)
  - `limit` (default 20)
  - `offset` (default 0)
- **Response:**
  ```json
  {
    "jobs": [
      { "job_id": "...", "status": "...", ... }
    ],
    "total": 42,
    "request_id": "req-abc-123"
  }
  ```
- **E2E Assertions:**
  - Returns user's jobs (filtered if not admin)
  - Admin sees all jobs
  - Pagination works

---

#### GET `/v1/reports`
- **Purpose:** List completed analysis reports
- **Auth:** Required (all authenticated)
- **Query Params:**
  - `published` (optional; "true" for published only)
  - `user_id` (optional; admin filter)
  - `limit`, `offset` (pagination)
- **Response:**
  ```json
  {
    "reports": [
      {
        "report_id": "rep-abc",
        "title": "Model XYZ Fairness Check",
        "fairness_score": 93.5,
        "created_at": "2026-01-12T10:00:00Z",
        "owner_id": "<uid>",
        "published": true,
        "request_id": "req-abc-123"
      }
    ],
    "total": 10,
    "request_id": "req-abc-123"
  }
  ```
- **Auditor Visibility:** Only published reports
- **Admin Visibility:** All reports
- **User Visibility:** Own reports + published reports
- **E2E Assertions:**
  - Auditor sees published only
  - Admin sees all
  - User sees own + published

---

#### GET `/v1/reports/:id`
- **Purpose:** Fetch detailed report + explanations
- **Auth:** Required (owner, admin, or if published)
- **Response:**
  ```json
  {
    "report_id": "rep-abc",
    "title": "...",
    "fairness_scores": { ... },
    "explanations": { ... },
    "owner_id": "<uid>",
    "published": true,
    "created_at": "2026-01-12T10:00:00Z",
    "request_id": "req-abc-123"
  }
  ```
- **Forbidden:** Non-owner, non-admin, unpublished → 403
- **E2E Assertions:**
  - Owner can fetch
  - Admin can fetch
  - Auditor can fetch if published
  - Non-owner cannot fetch unpublished (403)

---

#### POST `/v1/reports/:id/export`
- **Purpose:** Generate signed export artifact
- **Auth:** Required (owner, admin, or auditor if allowed)
- **Request Body:**
  ```json
  {
    "format": "pdf" | "json" | "csv",
    "scope": "full" | "summary" | "metrics_only",
    "include_pii": false
  }
  ```
- **Response:**
  ```json
  {
    "export_id": "export-xyz",
    "status": "created" | "pending_approval",
    "download_url": "https://...",
    "signed_at": "2026-01-12T10:00:00Z",
    "signature": "...",
    "request_id": "req-abc-123"
  }
  ```
- **Auditor Export:**
  - If `config.require_admin_approval_for_auditor_export == true`:
    - Response: `status: "pending_approval"`
    - Admin must approve via `/v1/admin/exports/:id/approve`
- **Audit Log:** "report_export" with report_id, format, scope, include_pii, request_id, user_role
- **E2E Assertions:**
  - Owner can export
  - Admin can export
  - Auditor export may require approval
  - request_id in response
  - Audit log entry created

---

#### GET `/v1/admin/users`
- **Purpose:** List all users (admin only)
- **Auth:** Required (Admin)
- **Response:**
  ```json
  {
    "users": [
      { "user_id": "...", "email": "...", "role": "...", "created_at": "..." }
    ],
    "total": 42,
    "request_id": "req-abc-123"
  }
  ```
- **Forbidden:** Non-admin → 403
- **E2E Assertions:**
  - Admin can fetch
  - Non-admin cannot fetch (403)

---

#### POST `/v1/admin/users`
- **Purpose:** Create new user (admin only)
- **Auth:** Required (Admin)
- **Request Body:**
  ```json
  {
    "email": "newuser@example.com",
    "role": "user" | "auditor" | "analyst" | "reviewer",
    "initial_password": "..." (or invite link)
  }
  ```
- **Response:**
  ```json
  {
    "user_id": "<uid>",
    "email": "...",
    "role": "...",
    "created_at": "...",
    "request_id": "req-abc-123"
  }
  ```
- **Audit Log:** "user_created" with email, role, request_id
- **E2E Assertions:**
  - Admin can create user
  - Non-admin cannot (403)
  - Audit log entry created

---

#### PUT `/v1/admin/users/:id`
- **Purpose:** Update user (role, status)
- **Auth:** Required (Admin)
- **Request Body:**
  ```json
  {
    "role": "auditor" | "admin" | "user",
    "status": "active" | "inactive"
  }
  ```
- **Response:**
  ```json
  {
    "user_id": "...",
    "email": "...",
    "role": "...",
    "request_id": "req-abc-123"
  }
  ```
- **Audit Log:** "user_updated" with old_role, new_role, request_id
- **E2E Assertions:**
  - Admin can update
  - Non-admin cannot (403)
  - Audit log entry created with old/new values

---

#### DELETE `/v1/admin/users/:id`
- **Purpose:** Delete user (admin only)
- **Auth:** Required (Admin)
- **Audit Log:** "user_deleted" with user_id, email, role, request_id
- **E2E Assertions:**
  - Admin can delete
  - Non-admin cannot (403)
  - User cannot be accessed after delete
  - Audit log entry created

---

#### GET `/v1/admin/audit-log`
- **Purpose:** Fetch audit trail (admin + auditor)
- **Auth:** Required (Admin, Auditor)
- **Query Params:**
  - `user_id` (optional)
  - `action` (optional; "login", "export", "role_change", etc.)
  - `start_date`, `end_date` (ISO 8601)
  - `limit`, `offset` (pagination)
- **Response:**
  ```json
  {
    "logs": [
      {
        "log_id": "...",
        "timestamp": "2026-01-12T10:00:00Z",
        "user_id": "...",
        "user_email": "...",
        "role": "...",
        "action": "export" | "role_change" | "login" | "job_submitted",
        "resource": "report:abc" | "user:xyz",
        "status": "success" | "failure",
        "request_id": "req-abc-123",
        "details": { ... }
      }
    ],
    "total": 100,
    "request_id": "req-abc-123"
  }
  ```
- **Auditor Visibility:** All logs (read-only)
- **Admin Visibility:** All logs (can filter)
- **E2E Assertions:**
  - Admin can fetch all logs
  - Auditor can fetch all logs
  - Non-admin/non-auditor cannot (403)
  - Logs include request_id

---

#### PUT `/v1/admin/policies`
- **Purpose:** Update system policies (admin only)
- **Auth:** Required (Admin)
- **Request Body:**
  ```json
  {
    "fairness_threshold": 0.8,
    "require_admin_approval_for_auditor_export": true,
    "audit_log_retention_days": 365
  }
  ```
- **Response:**
  ```json
  {
    "policies": { ... },
    "request_id": "req-abc-123"
  }
  ```
- **Audit Log:** "policy_updated" with old_value, new_value, request_id
- **E2E Assertions:**
  - Admin can update
  - Non-admin cannot (403)
  - Audit log entry includes old/new values

---

## 3️⃣ CRITICAL BEHAVIOR CONTRACTS

### **Role-Based Access Control (RBAC)**

| **Action** | **User** | **Auditor** | **Admin** | **Analyst** | **Reviewer** |
|---|---|---|---|---|---|
| Upload dataset | ✅ | ❌ | ✅ | ✅ | ❌ |
| Run analysis | ✅ | ❌ | ✅ | ✅ | ❌ |
| View fairness metrics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Re-run analysis on ExplainBoard | ✅ | ❌ | ✅ | ✅ | ❌ |
| Edit prediction parameters | ✅ | ❌ | ✅ | ✅ | ❌ |
| Export report | ✅ | ⚠️ (may require approval) | ✅ | ✅ | ⚠️ (may require approval) |
| View audit log | ❌ | ✅ | ✅ | ❌ | ❌ |
| Manage users | ❌ | ❌ | ✅ | ❌ | ❌ |
| Edit policies | ❌ | ❌ | ✅ | ❌ | ❌ |
| View unpublished reports | Owners only | ❌ | ✅ | Owners only | ❌ |
| Approve auditor exports | ❌ | ❌ | ✅ | ❌ | ❌ |
| Review reports | ❌ | ❌ | ✅ | ❌ | ✅ |

**Legend:**
- ✅ = Allowed
- ❌ = Forbidden
- ⚠️ = Conditional (depends on config/approval flow)

---

### **Request ID Propagation**

**Generation & Flow:**
1. Backend generates `request_id` on every API call (UUID format)
2. Returned in response body or headers: `X-Request-ID: req-abc-123`
3. Frontend logs `request_id` in error messages and export confirmations
4. Audit log includes `request_id` for every action
5. User-facing error messages include `request_id` (for support troubleshooting)

**E2E Assertion:**
- Every API call response includes `request_id`
- Export modal shows `request_id` in confirmation
- Audit log entry includes `request_id`
- Failed job detail shows `request_id` + retry button

---

### **Degraded Explainability Behavior**

**Scenario:** SHAP engine unavailable or slow

**Frontend Response:**
1. User navigates to ExplainBoard
2. Backend returns 500 or delayed response
3. Frontend shows degradation banner: "Explainability metrics temporarily unavailable. Showing cached results."
4. Display cached SHAP values if available
5. Disable "Re-Run" button (gray out)
6. All exports marked as "Partial Explainability — metrics cached as of [date]"

**E2E Assertions:**
- Degradation banner appears
- Cached data shown
- Re-run button disabled
- Export disclaimer added
- No silent failures

---

### **Long-Running Job Persistence**

**Requirement:** Job must survive browser refresh and network loss

**Implementation:**
1. Job submitted → backend returns `job_id` immediately
2. Frontend stores `job_id` in `localStorage` (or state)
3. Frontend polls `/v1/jobs/:id` every 2-5 seconds
4. On network loss, polling retries with exponential backoff
5. On browser refresh, frontend recovers `job_id` from `localStorage` and resumes polling
6. Job never duplicated (backend idempotency key validation)

**E2E Assertions:**
- File upload creates job instantly
- Browser refresh doesn't lose job status
- Network interruption handled (polling resumes)
- Duplicate submission rejected
- Failed job shows `request_id` + retry button

---

### **Auditor Read-Only Enforcement**

**UI Level:**
- ExplainBoard shows "Read-Only Audit View" banner
- Re-run button hidden or disabled (gray)
- Parameter edit fields disabled
- Export button visible (may require approval)

**API Level:**
- Auditor POST to `/api/v1/explain` with parameter edits → 403 Forbidden
- Auditor POST to `/v1/jobs` → 403 Forbidden
- Auditor GET `/v1/reports/:id` → 200 (if published or approved)
- Auditor POST `/v1/reports/:id/export` → 200 or 202 (if approval required)

**E2E Assertions:**
- Auditor cannot submit new jobs (403)
- Auditor can view reports (if published)
- Auditor cannot re-run analysis
- Auditor export shows approval flow (if required)

---

### **Admin Override Context**

**ExplainBoard Admin Mode:**
- Red banner: "Administrative Override Context"
- All parameters editable
- Re-run button enabled
- Full audit trail logged
- Explicit warning on parameter edits: "This action is being audited"

**E2E Assertions:**
- Admin sees red "Override" banner
- Admin can re-run + edit parameters
- All edits logged with admin_id + request_id
- Non-admins never see admin mode

---

## 4️⃣ DETERMINISTIC TEST DATA & SEED REQUIREMENTS

### **Firebase Test Users** (pre-configured)

```json
{
  "users": [
    {
      "email": "testuser@ethixai.com",
      "password": "TestPassword123!",
      "uid": "user-001",
      "role": ["user"]
    },
    {
      "email": "testauditor@ethixai.com",
      "password": "TestPassword123!",
      "uid": "auditor-001",
      "role": ["auditor"]
    },
    {
      "email": "testadmin@ethixai.com",
      "password": "TestPassword123!",
      "uid": "admin-001",
      "role": ["admin"]
    },
    {
      "email": "testanalyst@ethixai.com",
      "password": "TestPassword123!",
      "uid": "analyst-001",
      "role": ["analyst"]
    },
    {
      "email": "testreviewer@ethixai.com",
      "password": "TestPassword123!",
      "uid": "reviewer-001",
      "role": ["reviewer"]
    }
  ]
}
```

### **Sample Dataset for Upload**

```csv
age,income,credit_history,loan_amount,approval
30,50000,good,10000,yes
45,75000,excellent,25000,yes
25,35000,fair,5000,no
55,90000,good,30000,yes
```

### **Database Reset Procedure** (before each test suite)

1. Clear Firestore collections: `users`, `jobs`, `reports`, `audit_logs`, `policies`
2. Reload test users with defined roles
3. Reload seed policies (fairness thresholds, etc.)
4. Clear `/tmp` directories for upload artifacts

---

## 5️⃣ AUTHENTICATION & SESSION FLOW

### **Login Flow**

1. **User enters email + password** → `/login` form
2. **Firebase authenticate** → `signInWithEmailAndPassword(auth, email, password)`
3. **Firebase returns UID + ID token**
4. **Frontend exchanges token** → `POST /auth/firebase/exchange { idToken }`
5. **Backend validates token** → Firebase Admin SDK
6. **Backend creates JWT** → Stores in HttpOnly cookie or returns as token
7. **Backend fetches roles** → Firestore `users/:uid` document
8. **Frontend redirects** → `/dashboard` (or role-specific landing)

### **Session Persistence**

- **Cookie Mode (Preferred):** Backend sets HttpOnly `auth_token` cookie; frontend doesn't handle JWT
- **Token Mode (Legacy):** Frontend stores JWT in `localStorage`; includes in Authorization header

### **Role Verification**

- **Frontend:** Reads roles from Firebase custom claims or `/v1/users/me`
- **Backend:** Authoritative source is JWT + role claims
- **Every protected route:** Backend validates role in middleware

---

## 6️⃣ AUDIT LOGGING SCHEMA

**Every audit log entry must include:**

```json
{
  "log_id": "log-uuid",
  "timestamp": "2026-01-12T10:00:00.000Z",
  "user_id": "uid-xxx",
  "user_email": "user@example.com",
  "user_role": ["auditor"],
  "action": "export|login|role_change|job_submitted|job_cancelled|policy_updated|user_created|user_deleted",
  "resource": "report:abc|user:xyz|job:def",
  "status": "success|failure",
  "request_id": "req-uuid",
  "details": {
    "old_value": "...",
    "new_value": "...",
    "reason": "...",
    "error_message": "..."
  },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

**Mandatory Audit Triggers:**

- ✅ User login
- ✅ User logout
- ✅ Role assigned / changed / revoked
- ✅ Policy edited
- ✅ Report exported
- ✅ Analysis job submitted
- ✅ Analysis job cancelled
- ✅ User created / deleted
- ✅ Auditor export approved / rejected
- ✅ Parameter edits on ExplainBoard (admin + user)

---

## 7️⃣ E2E TEST COVERAGE TARGETS

### **Must-Have Test Cases (Phase 3 Priority)**

1. **Auth Flow**
   - ✅ User login + redirect to `/dashboard`
   - ✅ Auditor login + redirect to dashboard
   - ✅ Admin login + redirect to `/admin` (optional, or `/dashboard/admin`)
   - ✅ Logout + session invalidated
   - ✅ Invalid credentials → error message

2. **Dashboard Upload**
   - ✅ User can upload dataset
   - ✅ Job created + appears in `/jobs` list instantly
   - ✅ Job persists across refresh
   - ✅ Auditor cannot upload (403 or hidden button)

3. **Job Polling**
   - ✅ Job status updates (pending → running → completed)
   - ✅ Failed job shows `request_id` + retry button
   - ✅ Network loss handled (polling resumes)

4. **ExplainBoard**
   - ✅ User sees "Interactive Analysis Mode" banner
   - ✅ Auditor sees "Read-Only Audit View" banner
   - ✅ Admin sees "Administrative Override Context" banner
   - ✅ User can re-run (button enabled)
   - ✅ Auditor cannot re-run (button disabled or hidden)
   - ✅ Admin can re-run + edit parameters
   - ✅ Degraded state shows banner + cached data

5. **Export**
   - ✅ Export modal opens
   - ✅ Format selector works
   - ✅ Export creates audit log entry
   - ✅ Auditor export may require approval
   - ✅ Audit log includes `request_id`

6. **RBAC Enforcement**
   - ✅ Auditor cannot upload (403 or redirect)
   - ✅ Auditor cannot run analysis (403 or redirect)
   - ✅ User cannot access `/admin` (403 or redirect)
   - ✅ Non-auditor cannot access audit log (403)

7. **Audit Log**
   - ✅ Admin sees all audit entries
   - ✅ Auditor sees all audit entries
   - ✅ Each entry includes `request_id`
   - ✅ Filter by action/user works
   - ✅ Non-admin/non-auditor cannot access (403)

8. **Admin User Management**
   - ✅ Admin can create user
   - ✅ Admin can assign role
   - ✅ Admin can delete user
   - ✅ Non-admin cannot access (403)
   - ✅ User creation logged in audit

9. **Error Handling**
   - ✅ 403 Forbidden shows error page
   - ✅ 404 Not Found shows error page
   - ✅ 500 Server Error shows error page with `request_id`

---

## 🔒 SECURITY CONTRACTS (CRITICAL)

### **Forbidden Actions (Must Block)**

| Action | Enforcement Level |
|---|---|
| Auditor uploads dataset | UI: Hidden button; API: 403 |
| Auditor re-runs analysis | UI: Disabled button; API: 403 |
| Non-admin accesses user management | UI: Hidden link; API: 403 |
| Non-auditor accesses audit log | UI: Hidden link; API: 403 |
| User views others' unpublished reports | API: 403 |
| Auditor exports without approval (if required) | API: 202 + pending_approval |
| Non-owner cancels job | UI: Hidden button; API: 403 |
| Non-owner deletes report | UI: Hidden button; API: 403 |

### **Must-Never Happen (Test Failure if Observed)**

1. Auditor can submit job (should be 403)
2. Non-admin can see admin page
3. Request without `request_id` in response
4. Export without audit log entry
5. Silent degradation (no banner shown)
6. Role-based redirect missing (e.g., admin logs in, but lands on `/dashboard` not `/admin`)
7. Audit log missing (action not logged)

---

## 📊 E2E TEST EXECUTION READINESS

| **Criterion** | **Status** | **Notes** |
|---|---|---|
| Page Contracts Locked | ✅ | 15 pages defined above |
| API Inventory Complete | ✅ | 20+ endpoints mapped |
| RBAC Matrix Defined | ✅ | 5 roles, 10 actions |
| Test Data Seed Ready | ✅ | Firebase test users defined |
| request_id Propagation Defined | ✅ | Schema & contract in Section 3 |
| Audit Logging Schema Locked | ✅ | 9 mandatory triggers defined |
| Test Coverage Targets Defined | ✅ | 60+ test cases planned |
| Security Contracts Locked | ✅ | 8 forbidden actions, 7 must-never |

---

## 🚀 NEXT PHASE: SELENIUM TEST DEPLOYMENT

**Standing by for approval to execute Phase 3: E2E Test Deployment**

Once this intelligence is locked, generate Selenium test suites for:
1. **Auth flow tests** (login, logout, redirects)
2. **Dashboard + upload tests** (RBAC enforcement)
3. **ExplainBoard tests** (role-based UI + degradation)
4. **Export + audit tests** (approval workflows, request_id validation)
5. **Admin tests** (user management, policy editing)
6. **Error handling tests** (403, 404, 500 pages)

All tests will conform strictly to page contracts + API inventory above. No deviations. No improvisation.

---

**END OF INTELLIGENCE REPORT**

---

**Classification:** OPERATIONAL (Binding for QA Execution)  
**Owner:** QA Operations  
**Approved for:** Selenium E2E Deployment (Phase 3)  
**Last Updated:** 2026-01-12  

