# ✅ Formal QA Checklist

**Last Updated**: Day 12  
**Status**: MANDATORY  
**Execution**: Pre-release & Major PRs

---

## Purpose

This checklist ensures **manual QA validation** of critical flows before:
- Production deployments
- Major feature releases
- MVP launch
- SOC 2 audits

**Who executes**: QA team, Product Manager, or Senior Engineer  
**Frequency**: Every release candidate  
**Pass criteria**: All P0 items must pass; P1 items must have tracked exceptions

---

## 🔐 Authentication & Session Management

### Login Flow (P0)

- [ ] **Valid credentials** → Successfully logs in, redirects to dashboard
- [ ] **Invalid password** → Shows "Invalid credentials" error
- [ ] **Invalid email** → Shows "Invalid credentials" error (no user enumeration)
- [ ] **Empty fields** → Shows validation errors on both fields
- [ ] **SQL injection attempt** → Safely rejected (e.g., `admin'--`, `1=1`)
- [ ] **XSS attempt** → Safely escaped (e.g., `<script>alert(1)</script>`)
- [ ] **Rate limiting** → 5 failed attempts → "Too many attempts, try again in 15 minutes"
- [ ] **Loading state** → Shows spinner during login request
- [ ] **Network error** → Shows "Network error, please try again"
- [ ] **Server error (500)** → Shows "Server error, please contact support"

### Session Behavior (P0)

- [ ] **Token stored securely** → Tokens not visible in localStorage (use httpOnly cookies or secure storage)
- [ ] **Token expiration** → After 15 minutes, redirects to login on next API call
- [ ] **Token refresh** → Automatically refreshes token before expiration
- [ ] **Refresh token rotation** → Old refresh token invalidated after use
- [ ] **Multi-tab sessions** → Login in tab A reflects in tab B
- [ ] **Session persistence** → Refresh page maintains session
- [ ] **Idle timeout** → After 30 minutes inactivity, shows timeout modal

### Logout (P0)

- [ ] **Logout button** → Clears session, redirects to login
- [ ] **Logout API call** → Revokes refresh token on server
- [ ] **Post-logout navigation** → Cannot access protected pages after logout
- [ ] **Multi-tab logout** → Logout in tab A logs out tab B

### Password Reset (P1)

- [ ] **Request reset** → Sends email with reset link
- [ ] **Reset link valid** → Can set new password
- [ ] **Reset link expired** → Shows "Link expired" after 1 hour
- [ ] **Password validation** → Enforces ≥12 chars, uppercase, lowercase, number, special char
- [ ] **Weak password rejected** → "password123" rejected

### MFA (Future / P1)

- [ ] **Enable MFA** → QR code shown, can scan with authenticator app
- [ ] **Verify MFA code** → Accepts valid TOTP code
- [ ] **Reject invalid MFA code** → Shows "Invalid code"
- [ ] **Backup codes** → Generated and shown once

---

## 📊 Analysis Workflow (Core Feature)

### Submit Analysis (P0)

- [ ] **Upload report** → File picker opens, accepts PDF/Excel/CSV
- [ ] **File size validation** → Rejects files > 10MB
- [ ] **File type validation** → Rejects unsupported types (.exe, .zip)
- [ ] **Progress indicator** → Shows upload progress (0–100%)
- [ ] **Submission success** → Shows "Analysis submitted" + analysis_id
- [ ] **Submission error** → Shows specific error (e.g., "Invalid file format")
- [ ] **Network error** → Shows "Upload failed, please retry"

### Analysis Processing (P0)

- [ ] **Status updates** → Status changes: Pending → Processing → Completed
- [ ] **Real-time updates** → Status updates without page refresh (WebSocket or polling)
- [ ] **Processing time** → Completes within 2 minutes for standard report
- [ ] **Timeout handling** → If > 5 minutes, shows "Analysis taking longer than expected"
- [ ] **Error handling** → If AI Core fails, status → "Failed" with error message

### View Results (P0)

- [ ] **Results page loads** → Shows risk score, anomalies, recommendations
- [ ] **Risk score displayed** → Numerical score (0–100) + color-coded badge
- [ ] **Anomalies listed** → Table with: type, severity, description, location
- [ ] **Recommendations shown** → Actionable recommendations for each anomaly
- [ ] **Export results** → Can download as PDF or JSON
- [ ] **Share results** → Can generate shareable link (if feature exists)

### Cancel Analysis (P1)

- [ ] **Cancel button visible** → While status = "Processing"
- [ ] **Cancel confirmation** → Shows "Are you sure?" modal
- [ ] **Cancel success** → Status changes to "Cancelled"
- [ ] **No results after cancel** → Cannot view results for cancelled analysis

---

## 🎨 UI/UX Quality Checks

### Page Load Performance (P0)

- [ ] **Dashboard loads < 2s** → Measured on 3G network
- [ ] **Analysis results load < 1s** → After clicking "View"
- [ ] **No layout shift** → Content doesn't jump during load (CLS < 0.1)
- [ ] **Skeleton screens** → Show placeholders while loading data

### Responsiveness (P0)

- [ ] **Mobile (375px width)** → All content visible, no horizontal scroll
- [ ] **Tablet (768px width)** → Layout adapts correctly
- [ ] **Desktop (1920px width)** → No excessive whitespace
- [ ] **Orientation change** → Works in portrait and landscape

### Animations & Transitions (P0)

- [ ] **All animations < 300ms** → No slow, jarring transitions
- [ ] **Smooth scrolling** → No janky scroll on long pages
- [ ] **Button feedback** → Hover, active, focus states visible
- [ ] **Loading spinners** → Appear immediately (< 100ms) when action starts

### Forms & Inputs (P0)

- [ ] **Autofocus on first field** → Login form focuses email field
- [ ] **Tab navigation** → Can navigate all inputs with Tab key
- [ ] **Enter to submit** → Pressing Enter submits form
- [ ] **Clear error on edit** → Error message clears when user starts typing
- [ ] **Validation feedback** → Shows inline errors (red border + message)
- [ ] **Success feedback** → Shows success message after submission

### Dropdowns & Modals (P1)

- [ ] **Dropdown closes on outside click** → Clicking outside closes dropdown
- [ ] **Modal closes on Escape** → Pressing Esc closes modal
- [ ] **Modal backdrop click** → Clicking backdrop closes modal
- [ ] **Focus trap in modal** → Tab stays within modal (doesn't cycle to background)

### Accessibility (P0)

- [ ] **All buttons have labels** → `aria-label` or visible text
- [ ] **All images have alt text** → Descriptive `alt` attributes
- [ ] **Keyboard navigation works** → Can use site without mouse
- [ ] **Color contrast meets WCAG AA** → Text readable (4.5:1 for normal, 3:1 for large)
- [ ] **Screen reader compatible** → Test with NVDA/JAWS
- [ ] **Focus indicators visible** → Focused elements have visible outline

---

## ⚙️ Error Handling & Edge Cases

### Network Errors (P0)

- [ ] **Offline mode** → Shows "You're offline" banner
- [ ] **Reconnect** → Automatically retries when back online
- [ ] **Timeout** → After 30s, shows "Request timeout, please retry"
- [ ] **Slow connection** → Shows loading indicator, doesn't freeze

### AI Core Errors (P0)

- [ ] **AI model unavailable** → Shows "Service temporarily unavailable"
- [ ] **AI model timeout** → Shows "Analysis taking longer than expected"
- [ ] **Invalid input** → Shows "Unable to process this report format"
- [ ] **Unexpected error** → Shows "Something went wrong, please contact support" + logs error

### Database Errors (P0)

- [ ] **Connection lost** → Shows "Database error, please try again"
- [ ] **Query timeout** → Shows "Request taking too long, please retry"
- [ ] **Constraint violation** → Shows user-friendly error (e.g., "Email already exists")

### Validation Errors (P0)

- [ ] **Missing required fields** → Shows "This field is required"
- [ ] **Invalid format** → Shows "Invalid email format"
- [ ] **Out of range** → Shows "Value must be between 0 and 100"
- [ ] **Multiple errors** → Shows all errors, not just first one

---

## 🔒 Security & Authorization

### RBAC (Role-Based Access Control) (P0)

- [ ] **Admin role** → Can access all pages, all actions
- [ ] **Analyst role** → Can submit/view analyses, no admin pages
- [ ] **Auditor role** → Can view audit logs, no write actions
- [ ] **Viewer role** → Can view dashboards, no actions
- [ ] **Unauthorized access** → Redirects to 403 Forbidden page

### Input Sanitization (P0)

- [ ] **SQL injection prevented** → `'; DROP TABLE users;--` safely escaped
- [ ] **XSS prevented** → `<script>alert(1)</script>` rendered as text
- [ ] **Command injection prevented** → `; rm -rf /` rejected
- [ ] **Path traversal prevented** → `../../etc/passwd` rejected

### Data Exposure (P0)

- [ ] **No sensitive data in URLs** → Tokens, passwords not in query params
- [ ] **No sensitive data in logs** → Passwords, tokens, SSN redacted
- [ ] **Error messages safe** → No stack traces or internal paths exposed
- [ ] **Metrics endpoint safe** → No PII in Prometheus metrics

### CORS (P0)

- [ ] **Trusted origins allowed** → Frontend domain can make requests
- [ ] **Untrusted origins blocked** → Random domain gets CORS error
- [ ] **Credentials handled correctly** → Cookies sent with credentials: 'include'

---

## 📈 Observability & Monitoring

### Logging (P0)

- [ ] **All requests logged** → Access logs include: timestamp, method, path, status, duration
- [ ] **Errors logged** → Error logs include: stack trace, request_id, user_id, context
- [ ] **Audit events logged** → Login, logout, analysis submission logged
- [ ] **Structured logs** → Logs are JSON formatted
- [ ] **No PII in logs** → Passwords, SSN, credit cards redacted

### Metrics (P0)

- [ ] **Prometheus metrics exposed** → `/metrics` endpoint returns data
- [ ] **Request count** → `http_requests_total` increments correctly
- [ ] **Request duration** → `http_request_duration_seconds` tracks latency
- [ ] **Error rate** → `http_requests_errors_total` tracks failures
- [ ] **Custom metrics** → `analysis_submissions_total`, `analysis_duration_seconds`

### Health Checks (P0)

- [ ] **Health endpoint** → `/health` returns 200 with status
- [ ] **Database health** → Reports if DB connection is healthy
- [ ] **AI Core health** → Reports if AI service is reachable
- [ ] **Dependency health** → Reports status of Redis, MongoDB, etc.

### Tracing (P1)

- [ ] **Request ID propagation** → `request_id` flows through all logs/metrics
- [ ] **Distributed tracing** → Can trace request from frontend → backend → AI Core
- [ ] **Trace visualization** → Can view trace in Jaeger/Zipkin

---

## 🌐 Multi-Tab & Concurrency

### Multi-Tab Behavior (P0)

- [ ] **Login in tab A** → Tab B reflects logged-in state
- [ ] **Logout in tab A** → Tab B logs out
- [ ] **Token refresh in tab A** → Tab B uses new token
- [ ] **Session expiration** → All tabs redirect to login

### Concurrent Actions (P1)

- [ ] **Simultaneous analysis submissions** → Both succeed, get unique analysis_ids
- [ ] **Race condition on token refresh** → Only one refresh happens, both tabs use new token
- [ ] **Optimistic locking** → If two users edit same resource, second one gets conflict error

---

## 🚀 Performance Baseline

### Latency (P0)

- [ ] **Login API < 200ms** → p50 latency under 200ms
- [ ] **Dashboard API < 500ms** → p95 latency under 500ms
- [ ] **Analysis submission < 1s** → File upload + DB write < 1s
- [ ] **Analysis results < 500ms** → Fetch results from DB < 500ms

### Load Handling (P1)

- [ ] **100 req/s** → System handles 100 concurrent requests without errors
- [ ] **No memory leaks** → Memory usage stable after 1 hour of load
- [ ] **No connection pool exhaustion** → DB connections released correctly

---

## 📱 Browser Compatibility

### Desktop Browsers (P0)

- [ ] **Chrome (latest)** → All features work
- [ ] **Firefox (latest)** → All features work
- [ ] **Safari (latest)** → All features work
- [ ] **Edge (latest)** → All features work

### Mobile Browsers (P1)

- [ ] **Chrome Android** → All features work
- [ ] **Safari iOS** → All features work
- [ ] **Touch gestures** → Swipe, tap, pinch-to-zoom work

### Deprecated Browsers (Out of Scope)

- ❌ **IE 11**: Not supported
- ❌ **Old Safari < 14**: Not supported

---

## 🐛 Known Issues (Track Separately)

Document any issues found during QA:

| Issue ID | Description | Severity | Status | ETA |
|----------|-------------|----------|--------|-----|
| QA-001 | Dashboard slow on 3G | P1 | In Progress | Week 2 |
| QA-002 | Token refresh race condition | P0 | Fixed | Week 1 |
| QA-003 | Mobile keyboard overlaps input | P1 | Backlog | Week 3 |

---

## Execution Guidelines

### Before Each Test Run

1. **Environment**: Use staging environment (not production)
2. **Test data**: Use dedicated test accounts (test@example.com)
3. **Browser**: Clear cache, disable extensions
4. **Network**: Test on both fast and slow connections (Chrome DevTools throttling)

### During Testing

1. **Document**: Take screenshots of failures
2. **Reproduce**: Verify issue occurs consistently (3+ times)
3. **Context**: Note browser, OS, network conditions
4. **Logs**: Capture browser console errors, network tab

### After Testing

1. **Report**: File bugs in issue tracker with full context
2. **Prioritize**: Mark as P0 (release blocking) or P1 (fix before next release)
3. **Verify fixes**: Re-test after developer marks as fixed
4. **Sign-off**: QA lead approves release after all P0 issues resolved

---

## Sign-Off Template

```
## QA Sign-Off: [Release Version]

**Date**: 2025-11-15  
**Tested By**: [QA Engineer Name]  
**Environment**: Staging  
**Build**: [Git commit SHA]

### Results
- ✅ P0 Items: 95/95 passed
- ✅ P1 Items: 45/50 passed (5 known issues tracked)
- ❌ Blocker: None

### Known Issues
- QA-003: Mobile keyboard overlaps input (P1, tracked)
- QA-007: Slow dashboard on 3G (P1, performance optimization planned)

### Recommendation
**APPROVED FOR PRODUCTION DEPLOYMENT** ✅

**Signature**: [QA Lead Name]
```

---

## References

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Google Web Vitals](https://web.dev/vitals/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Browser Compatibility](https://caniuse.com/)

---

**Status**: ACTIVE  
**Last Review**: Day 12  
**Next Review**: Before each release  
**Owner**: QA Team
