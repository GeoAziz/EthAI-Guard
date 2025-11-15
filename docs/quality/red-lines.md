# 🚫 Red Lines for Code Acceptance

**Last Updated**: Day 12  
**Status**: ENFORCED  
**Violation Policy**: PR rejection until fixed

---

## Purpose

These are **non-negotiable** standards for EthixAI. Code that violates red lines will be rejected in PR review, blocked by CI, or flagged in audits.

This document ensures:
- **Long-term maintainability** (5–10 year horizon)
- **Regulatory compliance** (SOC 2, financial audits)
- **Team scalability** (new developers can onboard safely)
- **Security posture** (no silent failures, no leakage paths)

---

## ❌ Absolutely Forbidden

### 1. Commented-Out Code
**Why**: Creates confusion, clutters codebase, hides intent  
**Examples**:
```javascript
// const oldFunction = () => { ... };  // ❌ FORBIDDEN
// return response.data;  // ❌ FORBIDDEN
```

**Action**: Delete commented code. Use git history if needed.

**Exception**: Legitimate documentation comments explaining *why* code works a certain way.

---

### 2. TODO/FIXME Comments in Production Code
**Why**: Indicates incomplete work, technical debt, unresolved issues  
**Examples**:
```javascript
// TODO: Add validation  // ❌ FORBIDDEN
// FIXME: This breaks on edge cases  // ❌ FORBIDDEN
// HACK: Temporary workaround  // ❌ FORBIDDEN
```

**Action**: 
- Fix the issue before merging
- OR create a tracked ticket (Jira, GitHub Issue) and reference it in code with ticket number
- OR document as a known limitation in architecture docs

**Exception**: Test files may have TODO markers for future test cases (not current bugs).

---

### 3. Silent Errors / Bare Exceptions
**Why**: Hides failures, makes debugging impossible, violates audit requirements  
**Examples**:
```javascript
try {
  await riskyOperation();
} catch (error) {
  // ❌ FORBIDDEN: Silent failure
}
```

```python
try:
    risky_operation()
except Exception:  # ❌ FORBIDDEN: Too broad, no handling
    pass
```

**Action**:
- Log the error with context (request_id, user_id, operation)
- Return error via `ErrorEnvelope` schema
- Re-throw if unrecoverable
- Use specific exception types (not bare `Exception`)

**Correct**:
```javascript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Risky operation failed', {
    request_id: req.id,
    user_id: req.user?.id,
    error: error.message,
    stack: error.stack,
  });
  throw new OperationFailedError('Cannot complete request', { cause: error });
}
```

---

### 4. Dynamic Shape Objects (Inconsistent Response Schemas)
**Why**: Breaks client contracts, makes testing impossible, violates API freeze  
**Examples**:
```javascript
// ❌ FORBIDDEN: Response shape changes based on condition
if (condition) {
  return { status: 'success', data: result };
} else {
  return { ok: true, result: result };
}
```

**Action**:
- Use consistent schema (e.g., `ErrorEnvelope` for errors)
- Document response shape in API contract
- Use TypeScript types / JSON Schema validation
- Test response shape in integration tests

**Correct**:
```javascript
// ✅ ALWAYS return same shape
return {
  status: 'success',
  data: result,
  metadata: { request_id: req.id },
};
```

---

### 5. Changing Response Schemas Without Documentation Update
**Why**: Breaks API contract, violates API freeze policy  
**Examples**:
```javascript
// ❌ FORBIDDEN: Changing field name without updating docs
return { userId: user.id };  // Was: user_id
```

**Action**:
- Update `docs/api/api-contract-v1.md` BEFORE merging
- Bump API version if breaking change
- Add deprecation warning for old fields (if backward compat needed)
- Update OpenAPI spec (if exists)

---

### 6. Unlogged Exceptions
**Why**: No audit trail, impossible to debug production issues  
**Examples**:
```javascript
throw new Error('Something failed');  // ❌ FORBIDDEN: Not logged
```

**Action**:
- Log before throwing (or use error middleware to log)
- Include context: request_id, user_id, operation, input params
- Use structured logging (JSON format)

**Correct**:
```javascript
logger.error('Validation failed', {
  request_id: req.id,
  user_id: req.user?.id,
  error: 'Missing required field: email',
  input: req.body,
});
throw new ValidationError('Missing required field: email');
```

---

### 7. Mixing Business Logic with Presentation Logic
**Why**: Makes code untestable, violates separation of concerns  
**Examples**:
```javascript
// ❌ FORBIDDEN: Business logic in React component
function UserProfile() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // ❌ Complex business logic in UI component
    fetch('/api/user')
      .then(res => res.json())
      .then(data => {
        const processed = complexTransformation(data);
        const validated = validateAndSanitize(processed);
        setUser(validated);
      });
  }, []);
  
  return <div>{user?.name}</div>;
}
```

**Action**:
- Extract business logic to services/hooks/helpers
- UI components should only handle rendering + user interactions
- Test business logic independently

**Correct**:
```javascript
// ✅ Business logic in custom hook
function useUserProfile() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchAndProcessUser().then(setUser);
  }, []);
  
  return user;
}

// Component only handles rendering
function UserProfile() {
  const user = useUserProfile();
  return <div>{user?.name}</div>;
}
```

---

### 8. Non-Deterministic Functions
**Why**: Makes testing impossible, causes flaky behavior  
**Examples**:
```javascript
// ❌ FORBIDDEN: Random behavior
function getNextAction() {
  if (Math.random() > 0.5) {
    return 'action_a';
  }
  return 'action_b';
}
```

**Action**:
- Use deterministic logic
- If randomness needed, make it injectable (dependency injection)
- Use seeded RNG for tests

**Correct**:
```javascript
// ✅ Deterministic
function getNextAction(rng = Math.random) {
  if (rng() > 0.5) {
    return 'action_a';
  }
  return 'action_b';
}

// In tests: getNextAction(() => 0.6)
```

---

### 9. Hardcoded Strings in Logic
**Why**: Typos cause runtime errors, impossible to refactor, no single source of truth  
**Examples**:
```javascript
if (user.role === 'admin') {  // ❌ FORBIDDEN: Magic string
  // ...
}

fetch('https://api.example.com/data');  // ❌ FORBIDDEN: Hardcoded URL
```

**Action**:
- Use constants for all repeated strings
- Use enums for fixed sets (roles, statuses)
- Use environment variables for URLs/config

**Correct**:
```javascript
// constants.js
export const USER_ROLES = {
  ADMIN: 'admin',
  ANALYST: 'analyst',
  AUDITOR: 'auditor',
  VIEWER: 'viewer',
};

// usage
if (user.role === USER_ROLES.ADMIN) {
  // ...
}

// config.js
export const API_BASE_URL = process.env.REACT_APP_API_URL;
```

---

### 10. Hardcoding API URLs in Frontend
**Why**: Breaks across environments (dev/staging/prod), impossible to configure  
**Examples**:
```javascript
fetch('http://localhost:3000/api/users');  // ❌ FORBIDDEN
```

**Action**:
- Use environment variables
- Use a config module that reads from `.env`

**Correct**:
```javascript
// config.js
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// usage
fetch(`${API_BASE_URL}/api/users`);
```

---

## ✅ Mandatory Requirements

### 1. Every Error Must Map to ErrorEnvelope
**Schema**:
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { "field": "email" }
  },
  "metadata": {
    "request_id": "req-123",
    "timestamp": "2025-11-15T10:00:00Z"
  }
}
```

**Action**:
- All API errors must use this schema
- Frontend must handle this schema
- Document error codes in API contract

---

### 2. Every Endpoint Must Have Documented Schema
**Action**:
- Add to `docs/api/api-contract-v1.md`
- Include: path, method, request body, response, error codes
- Mark as `stable` or `experimental`

**Example**:
```markdown
### POST /v1/api/analysis/submit
**Status**: Stable  
**Request**:
```json
{
  "report_url": "https://example.com/report.pdf",
  "user_id": "user-123"
}
```
**Response 200**:
```json
{
  "status": "success",
  "data": {
    "analysis_id": "analysis-456",
    "status": "processing"
  }
}
```
**Errors**: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `500 INTERNAL_ERROR`
```

---

### 3. Every Module Must Include Architecture Note
**Action**:
- Add a `README.md` or `ARCHITECTURE.md` to each module
- Explain: purpose, dependencies, data flow, key decisions

**Example**:
```markdown
# backend/src/auth/

## Purpose
Handles authentication and authorization for EthixAI.

## Dependencies
- JWT library (jsonwebtoken)
- MongoDB (users collection)
- Redis (session storage)

## Key Decisions
- JWT tokens expire after 15 minutes
- Refresh tokens stored in Redis with 7-day TTL
- RBAC with 4 roles: admin, analyst, auditor, viewer

## Data Flow
1. User logs in → validate credentials
2. Generate access token (JWT) + refresh token
3. Store refresh token in Redis
4. Return tokens to client
5. Client includes access token in Authorization header
6. Middleware validates token on each request
```

---

### 4. No Unused Imports
**Why**: Increases bundle size, clutters code  
**Action**: Linters will catch this. Fix before merging.

---

### 5. Type Hints (Python) / PropTypes (React)
**Why**: Catches bugs at compile time, improves IDE support  
**Action**:
- Python: Use type hints on all functions
- React: Use PropTypes on all components

**Examples**:
```python
def calculate_score(data: dict, threshold: float) -> float:
    """Calculate risk score."""
    ...
```

```javascript
MyComponent.propTypes = {
  userId: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
```

---

### 6. Structured Logging with request_id
**Why**: Enables request tracing, debugging, audit compliance  
**Action**: All logs must include `request_id` (or `analysis_id` for AI Core)

**Example**:
```javascript
logger.info('User logged in', {
  request_id: req.id,
  user_id: user.id,
  ip: req.ip,
  timestamp: new Date().toISOString(),
});
```

---

### 7. Input Validation
**Why**: Prevents injection attacks, data corruption  
**Action**: Validate all user inputs (query params, body, headers)

**Tools**:
- Backend: Joi, express-validator
- Frontend: Yup, react-hook-form
- Python: Pydantic, marshmallow

---

### 8. Accessibility (Frontend)
**Why**: Legal requirement (ADA, WCAG), better UX  
**Action**:
- All buttons/links must have `aria-label` (if no visible text)
- All images must have `alt` text
- Keyboard navigation must work (tab, enter, escape)
- Color contrast must meet WCAG AA (4.5:1 for text)

**Linter**: `eslint-plugin-jsx-a11y` enforces this.

---

## Enforcement

### CI Pipeline
- ESLint (backend + frontend): Blocks merge on errors
- Pylint + Flake8 (ai_core): Blocks merge on errors
- Gitleaks: Blocks merge if secrets detected
- CodeQL: Blocks merge on HIGH/CRITICAL vulnerabilities

### PR Review Checklist
- [ ] No commented-out code
- [ ] No TODO/FIXME comments
- [ ] All errors logged
- [ ] Response schemas consistent
- [ ] API docs updated (if API changed)
- [ ] Type hints / PropTypes added
- [ ] Test coverage meets threshold

### Consequences
- **First violation**: PR comment, request changes
- **Repeated violations**: PR rejected, escalation to tech lead
- **Critical violations** (security, data loss): Immediate PR block, incident review

---

## Exceptions

Exceptions to red lines must be:
1. **Documented**: Add comment explaining why
2. **Approved**: Tech lead or architect approval required
3. **Tracked**: Create ticket to remove exception later
4. **Limited**: Use `eslint-disable-next-line` (not file-wide disables)

**Example**:
```javascript
// eslint-disable-next-line no-console
console.log('Debug: starting migration');  // Approved by tech lead, TICKET-123
```

---

## Review Schedule

This document is reviewed:
- **Monthly**: Update with new patterns
- **Quarterly**: Review exceptions, remove outdated rules
- **After incidents**: Add new red lines if needed

---

## References

- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)
- [PEP 8 (Python Style Guide)](https://peps.python.org/pep-0008/)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [API Design Best Practices](https://docs.microsoft.com/en-us/azure/architecture/best-practices/api-design)

---

**Status**: ACTIVE  
**Last Review**: Day 12  
**Next Review**: Day 30  
**Owner**: Engineering Team
