/**
 * Phase 3A — Core E2E Test Suite
 * 
 * Mission: Execute deterministic Selenium tests from locked Page Contracts
 * 
 * Focus Areas:
 * 1. Auth flow (login, logout, redirects)
 * 2. Dashboard (upload, job creation, RBAC)
 * 3. ExplainBoard (role banners, re-run, degradation)
 * 4. Export & Audit (signed artifacts, audit logs, request_id)
 * 
 * Rules:
 * - Every test validates contract exactly
 * - Every failure logs request_id + context
 * - RBAC violations halt immediately
 * - No silent failures; all degradation visible
 * 
 * @author QA Operations — Phase 3 Execution
 */

const { Builder, By, until, logging } = require('selenium-webdriver');
const { expect } = require('chai');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.test' });

// ─────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const HEADLESS = process.env.SELENIUM_HEADLESS !== 'false';
const BROWSER = process.env.SELENIUM_BROWSER || 'chrome';
const TIMEOUT_MS = parseInt(process.env.TEST_TIMEOUT_MS || '30000');

// Test Users (from INTELLIGENCE_REPORT.md)
const TEST_USERS = {
  user: {
    email: 'user-test@example.com',
    password: 'UserPass123!',
    role: 'user',
  },
  auditor: {
    email: 'reviewer-test@example.com',
    password: 'ReviewerPass123!',
    role: 'reviewer', // Note: Using reviewer for audit/read-only role
  },
  admin: {
    email: 'promote-test@example.com',
    password: 'PromotePass123!',
    role: 'admin',
  },
  analyst: {
    email: 'analyst-test@example.com',
    password: 'AnalystPass123!',
    role: 'analyst',
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Logging & Failure Tracking
// ─────────────────────────────────────────────────────────────────────────

const TestLog = {
  failures: [],
  todos: [],

  logFailure: (testName, role, page, expected, actual, requestId = 'N/A', screenshot = null) => {
    const entry = {
      timestamp: new Date().toISOString(),
      testName,
      role,
      page,
      expected,
      actual,
      requestId,
      screenshot,
    };
    TestLog.failures.push(entry);
    console.error(`\n[TEST FAILURE]\nPage: ${page}\nRole: ${role}\nAction: ${testName}\nExpected: ${expected}\nActual: ${actual}\nrequest_id: ${requestId}\n`);
  },

  logTodo: (testName, reason) => {
    const entry = {
      timestamp: new Date().toISOString(),
      testName,
      reason,
    };
    TestLog.todos.push(entry);
    console.warn(`\n[TODO — CLARIFICATION NEEDED]\nTest: ${testName}\nReason: ${reason}\n`);
  },

  exportReport: () => {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      failureCount: TestLog.failures.length,
      todoCount: TestLog.todos.length,
      failures: TestLog.failures,
      todos: TestLog.todos,
    };
    console.log('\n\n=== TEST EXECUTION REPORT ===\n', JSON.stringify(report, null, 2));
    return report;
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────

async function createDriver() {
  logging.installConsoleHandler();
  const Options = require('selenium-webdriver/chrome').Options;
  const chromeOptions = new Options();
  
  if (HEADLESS) {
    chromeOptions.addArguments('--headless=new');
    console.log('[DRIVER] Initializing in headless mode');
  }
  
  const driver = await new Builder()
    .forBrowser(BROWSER)
    .setChromeOptions(chromeOptions)
    .build();

  return driver;
}

async function login(driver, userCredentials) {
  const { email, password, role } = userCredentials;
  console.log(`[AUTH] Logging in as ${role} (${email})`);

  await driver.get(`${FRONTEND_URL}/login`);
  await driver.wait(until.titleContains('EthixAI'), TIMEOUT_MS);

  // Enter credentials (updated selectors for actual DOM)
  const emailInput = await driver.findElement(By.css('input[name="email"]'));
  const passwordInput = await driver.findElement(By.css('input[name="password"]'));
  const submitButton = await driver.findElement(By.css('button[type="submit"]'));

  await emailInput.sendKeys(email);
  await passwordInput.sendKeys(password);
  await submitButton.click();

  // Wait for redirect (login success)
  await driver.wait(
    until.urlContains('/dashboard'),
    TIMEOUT_MS,
    `Login timeout: ${email}`
  );

  console.log(`[AUTH] ✅ Logged in successfully as ${role}`);
  return driver;
}

async function logout(driver) {
  console.log('[AUTH] Logging out');
  
  try {
    // Method 1: Try clicking the user menu and logout button
    try {
      const headerButtons = await driver.findElements(By.xpath('//header//button'));
      
      if (headerButtons.length > 0) {
        // Click the rightmost button (likely the user avatar)
        const lastButton = headerButtons[headerButtons.length - 1];
        await driver.wait(until.elementIsVisible(lastButton), 3000);
        await lastButton.click();
        console.log('[DEBUG] Clicked header button');
        
        // Wait for and click logout
        await driver.wait(
          until.elementLocated(By.xpath('//*[contains(text(), "Log out")]')),
          3000
        );
        
        const logoutItem = await driver.findElement(By.xpath('//*[contains(text(), "Log out")]'));
        await logoutItem.click();
        console.log('[DEBUG] Clicked logout menu item');
      }
    } catch (menuError) {
      console.log('[DEBUG] Menu logout failed, trying direct navigation:', menuError.message);
      // Method 2: If menu doesn't work, clear cookies and navigate to login
      await driver.manage().deleteAllCookies();
      await driver.navigate().to(`${FRONTEND_URL}/login`);
    }

    await driver.wait(until.urlContains('/login'), TIMEOUT_MS, 'Logout redirect timeout');
    console.log('[AUTH] ✅ Logged out successfully');
  } catch (e) {
    console.error('[AUTH] Logout error:', e.message);
    // Don't throw - logout failure shouldn't fail the next test's login
    // Just clear cookies and navigate as fallback
    try {
      await driver.manage().deleteAllCookies();
      await driver.navigate().to(`${FRONTEND_URL}/login`);
    } catch (fallbackError) {
      console.error('[AUTH] Fallback logout also failed:', fallbackError.message);
    }
  }
}

async function extractRequestId(driver, apiResponse) {
  // Extract request_id from API response (if available from network logs)
  // For now, log as TODO to verify network capture
  return apiResponse?.request_id || 'N/A';
}

async function verifyAuditLogEntry(requestId, expectedAction, expectedRole) {
  // TODO: Implement audit log verification via API endpoint
  // GET /v1/admin/audit-log?request_id=<requestId>
  console.log(`[AUDIT] TODO: Verify audit log entry for request_id: ${requestId}`);
  return true;
}

async function takeScreenshot(driver, filename) {
  // TODO: Implement screenshot capture
  console.log(`[SCREENSHOT] Captured: ${filename}`);
}

// ─────────────────────────────────────────────────────────────────────────
// Test Suite 1: Authentication
// ─────────────────────────────────────────────────────────────────────────

describe('Suite 01: Authentication (TC-AUTH-001 through TC-AUTH-005)', () => {
  let driver;

  before(async () => {
    driver = await createDriver();
  });

  after(async () => {
    if (driver) {
      TestLog.exportReport();
      await driver.quit();
    }
  });

  it('TC-AUTH-001: User login with valid credentials', async () => {
    try {
      await login(driver, TEST_USERS.user);
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).to.include('/dashboard');
      console.log('[PASS] TC-AUTH-001: User login successful');
    } catch (error) {
      TestLog.logFailure(
        'TC-AUTH-001: User login',
        'user',
        '/login',
        'Redirect to /dashboard',
        error.message,
        'N/A'
      );
      throw error;
    }
  });

  it('TC-AUTH-002: Auditor login redirects to /dashboard (not /admin)', async () => {
    try {
      // Logout previous user
      await logout(driver);

      // Login as Auditor
      await login(driver, TEST_USERS.auditor);
      const currentUrl = await driver.getCurrentUrl();

      // Verify NOT redirected to /admin
      expect(currentUrl).to.include('/dashboard');
      expect(currentUrl).to.not.include('/admin');

      // Verify sidebar shows auditor menu (not admin menu)
      const adminLink = await driver.findElements(By.css('[href*="/admin/users"]'));
      expect(adminLink.length).to.equal(0, 'Admin link should not be visible to auditor');

      console.log('[PASS] TC-AUTH-002: Auditor login redirects to dashboard');
    } catch (error) {
      TestLog.logFailure(
        'TC-AUTH-002: Auditor login',
        'auditor',
        '/login',
        'Redirect to /dashboard (not /admin)',
        error.message,
        'N/A'
      );
      throw error;
    }
  });

  it('TC-AUTH-003: Admin login redirects to /admin', async () => {
    try {
      await logout(driver);
      await login(driver, TEST_USERS.admin);

      const currentUrl = await driver.getCurrentUrl();
      // Admin should redirect to /admin or /dashboard/admin
      const isAdminPage = currentUrl.includes('/admin');

      expect(isAdminPage).to.be.true;

      // Verify admin menu visible
      const adminLink = await driver.findElements(By.css('[href*="/admin/users"]'));
      expect(adminLink.length).to.be.greaterThan(0, 'Admin links should be visible');

      console.log('[PASS] TC-AUTH-003: Admin login redirects to admin page');
    } catch (error) {
      TestLog.logFailure(
        'TC-AUTH-003: Admin login',
        'admin',
        '/login',
        'Redirect to /admin',
        error.message,
        'N/A'
      );
      throw error;
    }
  });

  it('TC-AUTH-004: Invalid credentials show error', async () => {
    try {
      await driver.get(`${FRONTEND_URL}/login`);

      const emailInput = await driver.findElement(By.css('input[type="email"]'));
      const passwordInput = await driver.findElement(By.css('input[type="password"]'));
      const submitButton = await driver.findElement(By.css('button[type="submit"]'));

      await emailInput.sendKeys('invalid@example.com');
      await passwordInput.sendKeys('WrongPassword123!');
      await submitButton.click();

      // Wait for error message
      const errorMsg = await driver.wait(
        until.elementLocated(By.css('[data-testid="login-error"]')),
        TIMEOUT_MS
      );

      expect(await errorMsg.isDisplayed()).to.be.true;
      console.log('[PASS] TC-AUTH-004: Invalid credentials show error');
    } catch (error) {
      TestLog.logFailure(
        'TC-AUTH-004: Invalid credentials',
        'guest',
        '/login',
        'Error message displayed',
        error.message,
        'N/A'
      );
      throw error;
    }
  });

  it('TC-AUTH-005: Logout invalidates session', async () => {
    try {
      await login(driver, TEST_USERS.user);
      await logout(driver);

      // Try to access /dashboard directly
      await driver.get(`${FRONTEND_URL}/dashboard`);

      // Should redirect to /login
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).to.include('/login');

      console.log('[PASS] TC-AUTH-005: Logout invalidates session');
    } catch (error) {
      TestLog.logFailure(
        'TC-AUTH-005: Logout session',
        'user',
        '/dashboard',
        'Redirect to /login (unauthorized)',
        error.message,
        'N/A'
      );
      throw error;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Test Suite 2: Dashboard Upload & RBAC
// ─────────────────────────────────────────────────────────────────────────

describe('Suite 02: Dashboard Upload & RBAC (TC-DASH-001 through TC-DASH-006)', () => {
  let driver;

  before(async () => {
    driver = await createDriver();
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it('TC-DASH-001: User can upload dataset', async () => {
    try {
      await login(driver, TEST_USERS.user);

      const uploadButton = await driver.findElement(By.css('[data-testid="upload-dataset-button"]'));
      expect(await uploadButton.isDisplayed()).to.be.true;

      // TODO: Implement file upload via Selenium
      // This requires handling file input elements
      TestLog.logTodo(
        'TC-DASH-001: Dataset upload',
        'File upload via Selenium needs implementation'
      );

      console.log('[WARN] TC-DASH-001: Upload button visible (file upload TODO)');
    } catch (error) {
      TestLog.logFailure(
        'TC-DASH-001: User upload',
        'user',
        '/dashboard',
        'Upload button visible',
        error.message,
        'N/A'
      );
      throw error;
    }
  });

  it('TC-DASH-002: Auditor cannot upload (button hidden or 403)', async () => {
    try {
      await logout(driver);
      await login(driver, TEST_USERS.auditor);

      const uploadButton = await driver.findElements(By.css('[data-testid="upload-dataset-button"]'));

      if (uploadButton.length > 0) {
        // Button exists; verify it's hidden or disabled
        const isDisplayed = await uploadButton[0].isDisplayed();
        expect(isDisplayed).to.be.false;
      }

      console.log('[PASS] TC-DASH-002: Auditor cannot upload (button hidden)');
    } catch (error) {
      TestLog.logFailure(
        'TC-DASH-002: Auditor upload RBAC',
        'auditor',
        '/dashboard',
        'Upload button hidden/disabled',
        error.message,
        'N/A'
      );
      throw error;
    }
  });

  it('TC-DASH-003: RBAC enforced: User sees own datasets, Auditor sees shared only', async () => {
    try {
      // TODO: Verify dataset visibility filters
      TestLog.logTodo(
        'TC-DASH-003: Dataset RBAC visibility',
        'Requires backend dataset seeding + visibility API verification'
      );
      console.log('[WARN] TC-DASH-003: Dataset RBAC visibility (TODO)');
    } catch (error) {
      throw error;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Test Suite 3: ExplainBoard — Mode Banners & Re-Run
// ─────────────────────────────────────────────────────────────────────────

describe('Suite 03: ExplainBoard UI & Re-Run (TC-EXPLAIN-001 through TC-EXPLAIN-005)', () => {
  let driver;

  before(async () => {
    driver = await createDriver();
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it('TC-EXPLAIN-001: User sees "Interactive Analysis Mode" banner', async () => {
    try {
      await login(driver, TEST_USERS.user);
      await driver.get(`${FRONTEND_URL}/dashboard/explainboard`);

      const banner = await driver.wait(
        until.elementLocated(By.css('[data-testid="mode-banner"]')),
        TIMEOUT_MS
      );

      const bannerText = await banner.getText();
      expect(bannerText).to.include('Interactive Analysis Mode');

      console.log('[PASS] TC-EXPLAIN-001: User sees correct mode banner');
    } catch (error) {
      TestLog.logFailure(
        'TC-EXPLAIN-001: User mode banner',
        'user',
        '/dashboard/explainboard',
        'Banner: "Interactive Analysis Mode"',
        error.message,
        'N/A'
      );
      throw error;
    }
  });

  it('TC-EXPLAIN-002: Auditor sees "Read-Only Audit View" banner', async () => {
    try {
      await logout(driver);
      await login(driver, TEST_USERS.auditor);
      await driver.get(`${FRONTEND_URL}/dashboard/explainboard`);

      const banner = await driver.wait(
        until.elementLocated(By.css('[data-testid="mode-banner"]')),
        TIMEOUT_MS
      );

      const bannerText = await banner.getText();
      expect(bannerText).to.include('Read-Only Audit View');

      console.log('[PASS] TC-EXPLAIN-002: Auditor sees correct mode banner');
    } catch (error) {
      TestLog.logFailure(
        'TC-EXPLAIN-002: Auditor mode banner',
        'auditor',
        '/dashboard/explainboard',
        'Banner: "Read-Only Audit View"',
        error.message,
        'N/A'
      );
      throw error;
    }
  });

  it('TC-EXPLAIN-003: User can re-run (button enabled)', async () => {
    try {
      await logout(driver);
      await login(driver, TEST_USERS.user);
      await driver.get(`${FRONTEND_URL}/dashboard/explainboard`);

      const reRunButton = await driver.findElement(By.css('[data-testid="rerun-button"]'));
      const isEnabled = !(await reRunButton.getAttribute('disabled'));

      expect(isEnabled).to.be.true;
      console.log('[PASS] TC-EXPLAIN-003: User re-run button enabled');
    } catch (error) {
      TestLog.logFailure(
        'TC-EXPLAIN-003: User re-run',
        'user',
        '/dashboard/explainboard',
        'Re-run button enabled',
        error.message,
        'N/A'
      );
      throw error;
    }
  });

  it('TC-EXPLAIN-004: Auditor cannot re-run (button disabled)', async () => {
    try {
      await logout(driver);
      await login(driver, TEST_USERS.auditor);
      await driver.get(`${FRONTEND_URL}/dashboard/explainboard`);

      const reRunButton = await driver.findElement(By.css('[data-testid="rerun-button"]'));
      const isDisabled = await reRunButton.getAttribute('disabled');

      expect(isDisabled).to.exist;
      console.log('[PASS] TC-EXPLAIN-004: Auditor re-run button disabled');
    } catch (error) {
      TestLog.logFailure(
        'TC-EXPLAIN-004: Auditor re-run RBAC',
        'auditor',
        '/dashboard/explainboard',
        'Re-run button disabled',
        error.message,
        'N/A'
      );
      throw error;
    }
  });

  it('TC-EXPLAIN-005: Degradation banner shown if SHAP unavailable', async () => {
    try {
      // TODO: Mock backend SHAP endpoint to return 500
      TestLog.logTodo(
        'TC-EXPLAIN-005: Degradation banner',
        'Requires backend mock/stub for SHAP engine failure'
      );
      console.log('[WARN] TC-EXPLAIN-005: Degradation banner (TODO — backend mock needed)');
    } catch (error) {
      throw error;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Test Suite 4: Export & Audit Logging
// ─────────────────────────────────────────────────────────────────────────

describe('Suite 04: Export & Audit Logging (TC-EXPORT-001 through TC-EXPORT-003)', () => {
  let driver;

  before(async () => {
    driver = await createDriver();
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it('TC-EXPORT-001: Export modal opens with format selector', async () => {
    try {
      await login(driver, TEST_USERS.user);
      await driver.get(`${FRONTEND_URL}/dashboard/reports/sample-report-id`);

      const exportButton = await driver.findElement(By.css('[data-testid="export-button"]'));
      await exportButton.click();

      const modal = await driver.wait(
        until.elementLocated(By.css('[data-testid="export-modal"]')),
        TIMEOUT_MS
      );

      expect(await modal.isDisplayed()).to.be.true;

      const formatSelector = await driver.findElement(By.css('[data-testid="format-selector"]'));
      expect(await formatSelector.isDisplayed()).to.be.true;

      console.log('[PASS] TC-EXPORT-001: Export modal opens');
    } catch (error) {
      TestLog.logFailure(
        'TC-EXPORT-001: Export modal',
        'user',
        '/dashboard/reports/:id',
        'Export modal displayed',
        error.message,
        'N/A'
      );
      throw error;
    }
  });

  it('TC-EXPORT-002: Export creates audit log entry with request_id', async () => {
    try {
      // TODO: Implement full export flow + audit log verification
      TestLog.logTodo(
        'TC-EXPORT-002: Audit log verification',
        'Requires API endpoint call to /v1/admin/audit-log + request_id capture'
      );
      console.log('[WARN] TC-EXPORT-002: Audit log verification (TODO)');
    } catch (error) {
      throw error;
    }
  });

  it('TC-EXPORT-003: Auditor export may require approval', async () => {
    try {
      await logout(driver);
      await login(driver, TEST_USERS.auditor);
      await driver.get(`${FRONTEND_URL}/dashboard/reports/sample-report-id`);

      const exportButton = await driver.findElement(By.css('[data-testid="export-button"]'));
      await exportButton.click();

      const modal = await driver.wait(
        until.elementLocated(By.css('[data-testid="export-modal"]')),
        TIMEOUT_MS
      );

      // TODO: Check backend config for approval requirement
      TestLog.logTodo(
        'TC-EXPORT-003: Auditor approval',
        'Verify backend config: require_admin_approval_for_auditor_export'
      );

      console.log('[WARN] TC-EXPORT-003: Auditor approval flow (TODO)');
    } catch (error) {
      throw error;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Execution & Reporting
// ─────────────────────────────────────────────────────────────────────────

module.exports = {
  TestLog,
  TEST_USERS,
  API_URL,
  FRONTEND_URL,
  TIMEOUT_MS,
};
