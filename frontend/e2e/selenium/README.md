# Selenium E2E Testing Suite

Enterprise-grade Selenium + Pytest infrastructure for cross-browser E2E testing. This complements the existing Playwright suite by adding robust cross-browser validation for business-critical flows.

## 📁 Directory Structure

```
frontend/e2e/selenium/
├── conftest.py              # Pytest fixtures and configuration
├── pytest.ini               # Pytest settings and markers
├── requirements.txt         # Python dependencies
├── README.md                # This file
├── pages/
│   ├── __init__.py
│   ├── base_page.py         # Base page object with common methods
│   ├── login_page.py        # Login page object
│   └── dashboard_page.py    # Dashboard page object
├── tests/
│   ├── __init__.py
│   └── test_smoke_dashboard.py  # Golden-path smoke tests
└── utils/
    ├── __init__.py
    ├── auth_helpers.py      # Auth token injection utilities
    ├── wait_helpers.py      # Explicit wait utilities
    └── test_data.py         # Test constants and data
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Chrome and/or Firefox browser installed
- Backend server running on `http://localhost:5000`
- Frontend server running on `http://localhost:3000`

### Installation

1. Navigate to the selenium directory:
   ```bash
   cd frontend/e2e/selenium
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running Tests

Run all smoke tests:
```bash
pytest -m smoke
```

Run specific test file:
```bash
pytest tests/test_smoke_dashboard.py
```

Run with verbose output:
```bash
pytest -v
```

Run in headed mode (see browser):
```bash
HEADLESS=false pytest -m smoke
```

Run on specific browser:
```bash
pytest tests/test_smoke_dashboard.py::test_authenticated_user_can_load_dashboard_chrome
```

Generate HTML report:
```bash
pytest --html=reports/selenium-report.html --self-contained-html
```

## 🔧 Configuration

### Environment Variables

Configure test execution via environment variables:

```bash
# Application URLs
export BASE_URL=http://localhost:3000        # Frontend URL
export BACKEND_URL=http://localhost:5000     # Backend API URL

# Browser settings
export HEADLESS=true                         # Run headless (true/false)

# Test users (if different from defaults)
export TEST_USER_EMAIL=test-user@ethixai.com
export TEST_USER_PASSWORD=TestUser123!
```

### Test Markers

Tests are organized with pytest markers:

- `@pytest.mark.smoke` - Critical path smoke tests
- `@pytest.mark.regression` - Full regression suite
- `@pytest.mark.auth` - Authentication tests
- `@pytest.mark.dashboard` - Dashboard functionality
- `@pytest.mark.cross_browser` - Cross-browser tests

Run specific marker:
```bash
pytest -m smoke
pytest -m "smoke and auth"
pytest -m "not regression"  # Exclude regression tests
```

## 📝 Writing Tests

### Basic Test Structure

```python
import pytest
from pages.dashboard_page import DashboardPage

@pytest.mark.smoke
def test_my_feature(authenticated_browser, base_url):
    """Test description."""
    driver = authenticated_browser
    
    # Initialize page object
    page = DashboardPage(driver, base_url)
    
    # Navigate to page
    page.navigate()
    
    # Perform actions and assertions
    assert page.is_dashboard_loaded()
```

### Using Page Objects

```python
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage

def test_login_flow(chrome_driver, base_url):
    """Test complete login flow."""
    driver = chrome_driver
    
    # Login page
    login = LoginPage(driver, base_url)
    login.navigate()
    login.login('user@example.com', 'password')
    
    # Dashboard page
    dashboard = DashboardPage(driver, base_url)
    assert dashboard.is_dashboard_loaded()
```

### Auth Bypass (Recommended)

For most tests, bypass UI login for faster, more reliable tests:

```python
@pytest.mark.smoke
def test_with_auth_bypass(authenticated_browser, base_url):
    """Test using auth bypass fixture."""
    driver = authenticated_browser  # Already authenticated!
    
    dashboard = DashboardPage(driver, base_url)
    dashboard.navigate()
    assert dashboard.is_dashboard_loaded()
```

Available auth fixtures:
- `authenticated_browser` - Standard user
- `admin_browser` - Admin role
- `analyst_browser` - Analyst role

### Manual Auth Injection

```python
from utils.auth_helpers import create_authenticated_session

def test_manual_auth(chrome_driver, base_url, backend_url):
    """Manually inject auth tokens."""
    create_authenticated_session(chrome_driver, backend_url, role='admin')
    
    # Now driver has admin auth
    dashboard = DashboardPage(chrome_driver, base_url)
    dashboard.navigate()
```

## 🧪 Test Data

Test users are defined in `utils/test_data.py`:

```python
TEST_USERS = {
    'user': {
        'email': 'test-user@ethixai.com',
        'password': 'TestUser123!',
        'role': 'user',
    },
    'admin': {
        'email': 'test-admin@ethixai.com',
        'password': 'TestAdmin123!',
        'role': 'admin',
    },
    # ... more roles
}
```

## 📊 Reports and Artifacts

### HTML Reports

HTML test reports are generated automatically:
- Location: `reports/selenium-report.html`
- Includes: Test results, timings, screenshots on failure

### Screenshots

Screenshots are captured automatically on test failure:
- Location: `reports/screenshots/`
- Naming: `{test_name}.png`

Manual screenshot capture:
```python
from pages.base_page import BasePage

page = BasePage(driver)
page.capture_screenshot("my_screenshot.png")
```

### Logs

Test logs are written to:
- Console: INFO level and above
- File: `reports/selenium-test.log` (DEBUG level)

## 🔍 Debugging

### Run in Headed Mode

See the browser during test execution:
```bash
HEADLESS=false pytest -v tests/test_smoke_dashboard.py::test_authenticated_user_can_load_dashboard
```

### Use Breakpoints

Add `import pdb; pdb.set_trace()` in your test:
```python
def test_debug(chrome_driver, base_url):
    driver = chrome_driver
    driver.get(base_url)
    
    import pdb; pdb.set_trace()  # Debugger starts here
    
    # Test continues...
```

### Increase Timeouts

For slow environments, increase timeouts:
```python
from pages.dashboard_page import DashboardPage

dashboard = DashboardPage(driver, timeout=30)  # 30 second timeout
```

## 🔐 Test Users Setup

Tests require these users to exist in the backend:

1. **Standard User**
   - Email: `test-user@ethixai.com`
   - Password: `TestUser123!`
   - Role: `user`

2. **Admin User**
   - Email: `test-admin@ethixai.com`
   - Password: `TestAdmin123!`
   - Role: `admin`

3. **Analyst User**
   - Email: `test-analyst@ethixai.com`
   - Password: `TestAnalyst123!`
   - Role: `analyst`

4. **Reviewer User**
   - Email: `test-reviewer@ethixai.com`
   - Password: `TestReviewer123!`
   - Role: `reviewer`

### Creating Test Users

Using backend API or Firebase Admin SDK:
```bash
# TODO: Add script to create test users
# Or manually create via backend registration endpoint
```

## 🚢 CI Integration

### GitHub Actions Example

```yaml
- name: Run Selenium E2E Tests
  run: |
    cd frontend/e2e/selenium
    pip install -r requirements.txt
    pytest -m smoke --html=reports/selenium-report.html
  env:
    BASE_URL: http://localhost:3000
    BACKEND_URL: http://localhost:5000
    HEADLESS: true
```

### Docker Integration

Run tests in Docker container:
```bash
docker run -it --rm \
  -v $(pwd):/workspace \
  -w /workspace/frontend/e2e/selenium \
  -e BASE_URL=http://host.docker.internal:3000 \
  -e BACKEND_URL=http://host.docker.internal:5000 \
  python:3.11 \
  bash -c "pip install -r requirements.txt && pytest -m smoke"
```

## 📈 Best Practices

1. **Use Auth Bypass**: Avoid UI login in tests for speed and reliability
2. **Page Objects**: Keep test logic in page objects, not test files
3. **Explicit Waits**: Always use explicit waits, never `time.sleep()`
4. **Markers**: Tag tests appropriately for selective execution
5. **Descriptive Names**: Test names should describe what they validate
6. **Independent Tests**: Each test should be able to run independently
7. **Cleanup**: Use fixtures for setup/teardown
8. **Screenshots**: Capture on both success and failure for debugging

## 🆘 Troubleshooting

### WebDriver Not Found

Install WebDriver manually:
```bash
# Chrome
pip install webdriver-manager
```

### Connection Refused

Ensure servers are running:
```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run dev
```

### Element Not Found

Increase timeout or check selector:
```python
# Increase timeout
element = page.wait_for_element(locator, timeout=20)

# Check if element exists
if page.is_visible(locator):
    page.click(locator)
```

### Auth Tokens Expired

Test users should have non-expiring tokens or tests should refresh:
```python
# Tokens are fetched fresh for each test via fixtures
# If issue persists, check backend token expiry settings
```

## 📚 Additional Resources

- [Selenium Documentation](https://www.selenium.dev/documentation/)
- [Pytest Documentation](https://docs.pytest.org/)
- [WebDriver Manager](https://github.com/SergeyPirogov/webdriver_manager)
- [Page Object Pattern](https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/)

## 🤝 Contributing

When adding new tests:

1. Follow existing page object pattern
2. Add appropriate markers
3. Include docstrings
4. Update this README if adding new features
5. Ensure tests pass in both Chrome and Firefox

## 📄 License

Same as parent project.
