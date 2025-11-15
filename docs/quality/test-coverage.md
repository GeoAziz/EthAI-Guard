# 📊 Test Coverage Framework & Goals

**Last Updated**: Day 12  
**Status**: ENFORCED  
**Review Cycle**: Quarterly

---

## Purpose

This document defines:
1. **Coverage targets** for each module
2. **Test types** required
3. **Must-cover scenarios** for MVP readiness
4. **Measurement methodology**
5. **Enforcement policies**

---

## Coverage Targets

### Thresholds by Module

| Module | Current Coverage | Target Coverage | Priority | Status |
|--------|------------------|-----------------|----------|--------|
| **Backend (API)** | ~65–70% | **85%+** | P0 | 🟡 In Progress |
| **ai_core** | ~80% | **90%+** | P0 | 🟡 In Progress |
| **Frontend** | ~50–60% | **70%+** | P1 | 🔴 Below Target |
| **Middleware** | ~40% | **80%+** | P0 | 🔴 Below Target |
| **Utils/Helpers** | ~60% | **90%+** | P1 | 🟡 In Progress |

### Coverage Calculation

**Formula**:
```
Coverage % = (Lines Executed / Total Lines) × 100
```

**Measurement Tools**:
- **Backend**: Jest with `--coverage` flag
- **ai_core**: pytest with `pytest-cov`
- **Frontend**: Jest with React Testing Library

**Exclusions**:
- Test files themselves
- Configuration files (`.eslintrc`, `.prettierrc`, etc.)
- Build artifacts
- Mock data / fixtures
- Migration scripts (unless business logic)

---

## Test Types (All Required)

### 1. Unit Tests
**Purpose**: Test individual functions/classes in isolation  
**Coverage Target**: 90%+ of business logic  
**Tools**: Jest (JS), pytest (Python)

**Scope**:
- Pure functions (no side effects)
- Data transformations
- Validation logic
- Error handling
- Edge cases

**Example**:
```javascript
// backend/src/utils/validation.test.js
describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });
  
  it('should reject invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false);
  });
  
  it('should reject null/undefined', () => {
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
  });
});
```

---

### 2. Integration Tests
**Purpose**: Test interactions between modules/services  
**Coverage Target**: 80%+ of critical paths  
**Tools**: Jest + Supertest (backend), pytest + requests (ai_core)

**Scope**:
- API endpoint → service → database
- Backend → ai_core communication
- Authentication flow
- Data pipeline (upload → analysis → report)

**Example**:
```javascript
// backend/tests/integration/auth.test.js
describe('POST /api/auth/login', () => {
  it('should return tokens for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'ValidPass123!' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
  });
  
  it('should return 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });
    
    expect(response.status).toBe(401);
  });
});
```

---

### 3. End-to-End (E2E) Tests
**Purpose**: Test complete user workflows across UI → backend → ai_core  
**Coverage Target**: 5–10 critical user journeys  
**Tools**: Cypress, Playwright, Selenium

**Scope**:
- User login → dashboard → submit report → view results
- Token refresh flow
- Error handling (network failures, timeouts)
- Multi-tab session behavior

**Example**:
```javascript
// frontend/cypress/e2e/analysis-flow.cy.js
describe('Analysis Workflow', () => {
  it('should complete full analysis from upload to report', () => {
    cy.login('analyst@example.com', 'ValidPass123!');
    cy.visit('/dashboard');
    
    cy.get('[data-testid="upload-button"]').click();
    cy.get('input[type="file"]').attachFile('sample-report.pdf');
    cy.get('[data-testid="submit-button"]').click();
    
    cy.contains('Analysis submitted', { timeout: 10000 });
    cy.get('[data-testid="analysis-status"]').should('contain', 'Processing');
    
    // Wait for analysis to complete
    cy.get('[data-testid="analysis-status"]', { timeout: 60000 })
      .should('contain', 'Completed');
    
    cy.get('[data-testid="view-report"]').click();
    cy.url().should('include', '/report/');
    cy.get('[data-testid="risk-score"]').should('be.visible');
  });
});
```

---

### 4. Security Regression Tests
**Purpose**: Ensure security controls remain enforced  
**Coverage Target**: 100% of security controls  
**Tools**: Jest, pytest, custom scripts

**Scope**:
- Login throttling (reject after 5 failed attempts)
- Token expiration (reject expired tokens)
- Authorization (reject unauthorized actions)
- Input validation (reject malicious inputs)
- CORS (reject cross-origin requests from untrusted origins)

**Example**:
```javascript
// backend/tests/security/auth.security.test.js
describe('Login Throttling', () => {
  it('should block login after 5 failed attempts', async () => {
    const email = 'test@example.com';
    
    // Try 5 failed logins
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrong' });
    }
    
    // 6th attempt should be blocked
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong' });
    
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('TOO_MANY_ATTEMPTS');
  });
});
```

---

### 5. Load & Stress Baseline Tests
**Purpose**: Ensure system handles expected load  
**Coverage Target**: P50, P95, P99 latency under load  
**Tools**: Locust, k6, JMeter

**Scope**:
- API endpoints can handle 100 req/s
- Database queries remain < 100ms under load
- AI analysis completes within SLA (< 2 minutes)
- No memory leaks during sustained load

**Example**:
```python
# tools/load/locustfile.py
from locust import HttpUser, task, between

class EthixAIUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login and get tokens
        response = self.client.post('/api/auth/login', json={
            'email': 'loadtest@example.com',
            'password': 'ValidPass123!'
        })
        self.token = response.json()['access_token']
    
    @task(3)
    def get_dashboard(self):
        self.client.get('/api/dashboard', headers={
            'Authorization': f'Bearer {self.token}'
        })
    
    @task(1)
    def submit_analysis(self):
        self.client.post('/api/analysis/submit', json={
            'report_url': 'https://example.com/report.pdf'
        }, headers={
            'Authorization': f'Bearer {self.token}'
        })
```

---

## Must-Cover Scenarios

### Authentication & Authorization

- [ ] **Login with valid credentials** → Returns tokens
- [ ] **Login with invalid credentials** → Returns 401
- [ ] **Login with missing fields** → Returns 400 with validation errors
- [ ] **Login throttling** → Blocks after 5 failed attempts
- [ ] **Token refresh** → Returns new access token
- [ ] **Token expiration** → Rejects expired access token
- [ ] **Token revocation** → Rejects revoked refresh token
- [ ] **Unauthorized access** → Rejects requests without valid token
- [ ] **Forbidden access** → Rejects requests without required role
- [ ] **Logout** → Revokes refresh token

### Analysis Pipeline

- [ ] **Submit analysis** → Creates analysis record, returns analysis_id
- [ ] **AI Core processes analysis** → Updates status to "completed"
- [ ] **AI Core error handling** → Updates status to "failed" with error message
- [ ] **Get analysis status** → Returns current status
- [ ] **Get analysis results** → Returns risk scores, anomalies, recommendations
- [ ] **Cancel analysis** → Stops processing, marks as "cancelled"
- [ ] **Analysis timeout** → Marks as "failed" after 5 minutes

### Error Handling

- [ ] **Network error** → Displays user-friendly error, retries
- [ ] **Validation error** → Displays field-specific errors
- [ ] **Server error (500)** → Displays generic error, logs details
- [ ] **Not found (404)** → Displays "resource not found"
- [ ] **Rate limit (429)** → Displays "too many requests, try again later"

### UI/UX

- [ ] **Page load** → Renders within 2 seconds
- [ ] **Form submission** → Shows loading indicator, then success/error
- [ ] **Table sorting** → Correctly sorts by column
- [ ] **Pagination** → Loads next page without full reload
- [ ] **Responsive design** → Works on mobile, tablet, desktop
- [ ] **Accessibility** → Keyboard navigation works, screen reader compatible

### Metrics & Observability

- [ ] **Request ID propagation** → All logs include request_id
- [ ] **Structured logging** → Logs are JSON formatted
- [ ] **Prometheus metrics** → Expose `/metrics` endpoint
- [ ] **Health check** → `/health` returns 200 with status

### Session Management

- [ ] **Multi-tab sessions** → Login in tab A works in tab B
- [ ] **Session expiration** → Redirects to login after inactivity
- [ ] **Concurrent logins** → Allows multiple devices
- [ ] **Force logout** → Admin can revoke user sessions

---

## Measurement Methodology

### Running Coverage

**Backend**:
```bash
cd backend
npm test -- --coverage --watchAll=false

# View HTML report
open coverage/lcov-report/index.html
```

**ai_core**:
```bash
cd ai_core
pytest --cov=. --cov-report=html --cov-report=term

# View HTML report
open htmlcov/index.html
```

**Frontend**:
```bash
cd frontend
npm test -- --coverage --watchAll=false

# View HTML report
open coverage/lcov-report/index.html
```

### CI Integration

Coverage runs automatically on every PR:
```yaml
# .github/workflows/test-coverage.yml
- name: Run tests with coverage
  run: npm test -- --coverage --watchAll=false
  
- name: Check coverage threshold
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 85" | bc -l) )); then
      echo "Coverage $COVERAGE% is below threshold 85%"
      exit 1
    fi
```

### Coverage Reports

**Weekly**: Automated report sent to engineering team  
**Monthly**: Detailed analysis with trends, gaps, recommendations  
**Quarterly**: Review with stakeholders, adjust targets if needed

---

## Weak Areas (Need Immediate Attention)

### Backend
- **Auth middleware**: 45% coverage (target: 90%)
- **Error handling**: 50% coverage (target: 85%)
- **RBAC logic**: 60% coverage (target: 90%)

**Action**: Add tests for:
- Token validation edge cases
- Permission checks for all roles
- Error response formats

### ai_core
- **Model orchestration**: 70% coverage (target: 90%)
- **Preprocessing**: 75% coverage (target: 90%)
- **Error recovery**: 60% coverage (target: 85%)

**Action**: Add tests for:
- Invalid input handling
- Model loading failures
- Timeout scenarios

### Frontend
- **Component logic**: 55% coverage (target: 70%)
- **State management**: 40% coverage (target: 70%)
- **Error boundaries**: 30% coverage (target: 80%)

**Action**: Add tests for:
- User interactions (clicks, inputs)
- State updates
- Error boundary fallbacks

---

## Enforcement Policy

### PR Requirements
- [ ] Coverage must not decrease (vs. target branch)
- [ ] New code must have ≥ 80% coverage
- [ ] Critical paths must have 100% coverage

### Exceptions
Exceptions require:
1. **Written justification** in PR description
2. **Tech lead approval**
3. **Tracked ticket** to add tests later

Allowed exceptions:
- UI components with complex mocking requirements (defer to E2E tests)
- Generated code (migrations, schemas)
- Temporary debugging code (must be removed before merge)

### Consequences
- **Coverage below threshold**: PR blocked by CI
- **Critical path uncovered**: PR rejected in review
- **Repeated violations**: Escalation to engineering manager

---

## Tools & Integrations

### Coverage Tools
- **Jest** (JavaScript): `npm test -- --coverage`
- **pytest-cov** (Python): `pytest --cov`
- **Istanbul/nyc**: Alternative for Node.js

### Reporting Tools
- **Codecov**: PR comments with coverage diff
- **Coveralls**: Badge for README
- **SonarQube**: Code quality + coverage analysis

### IDE Integration
- **VS Code**: Coverage Gutters extension
- **WebStorm**: Built-in coverage visualization
- **PyCharm**: Built-in coverage tools

---

## Best Practices

### 1. Test Pyramid
- **70% Unit Tests**: Fast, isolated, many
- **20% Integration Tests**: Moderate speed, test interactions
- **10% E2E Tests**: Slow, test full flows, few

### 2. Test Naming
```javascript
// ✅ Good: Describes behavior
it('should return 401 when token is expired')

// ❌ Bad: Vague
it('test login')
```

### 3. Arrange-Act-Assert Pattern
```javascript
it('should calculate risk score correctly', () => {
  // Arrange
  const data = { anomalies: 5, severity: 'high' };
  
  // Act
  const score = calculateRiskScore(data);
  
  // Assert
  expect(score).toBeGreaterThan(0.7);
});
```

### 4. Mock External Dependencies
```javascript
// Mock database
jest.mock('../database', () => ({
  findUser: jest.fn(),
}));

// Mock HTTP requests
jest.mock('axios');
```

### 5. Don't Test Implementation Details
```javascript
// ❌ Bad: Tests internal state
expect(component.state.count).toBe(1);

// ✅ Good: Tests behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

---

## Roadmap

### Month 1 (Current)
- [ ] Reach 85% backend coverage
- [ ] Reach 90% ai_core coverage
- [ ] Add E2E tests for 5 critical flows
- [ ] Enable coverage enforcement in CI

### Month 2
- [ ] Reach 70% frontend coverage
- [ ] Add security regression tests for all controls
- [ ] Setup Codecov integration
- [ ] Publish weekly coverage reports

### Month 3
- [ ] Reach 90% coverage across all modules
- [ ] Add performance regression tests
- [ ] Automate coverage trend analysis
- [ ] Document coverage best practices

---

## References

- [Jest Coverage](https://jestjs.io/docs/cli#--coverageboolean)
- [pytest-cov](https://pytest-cov.readthedocs.io/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Google Test Blog](https://testing.googleblog.com/)

---

**Status**: ACTIVE  
**Last Review**: Day 12  
**Next Review**: Day 42  
**Owner**: QA Team + Engineering
