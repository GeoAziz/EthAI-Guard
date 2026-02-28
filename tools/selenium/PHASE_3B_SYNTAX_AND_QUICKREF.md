# Phase 3B Syntax Check & Quick Reference

This file collects quick commands to verify the syntax of test files and a minimal quick reference for running Phase 3B tests.

## Syntax checks

From `/mnt/devmandrive/EthAI/tools/selenium` run:

```bash
# Quick Node parse check
node -c tests/phase3b.test.js

# ESLint style (if configured)
npx eslint tests/phase3b.test.js || true
```

If `node -c` returns no output, the file parsed successfully.

## Quick mocha sanity runs

```bash
# Run only first test (fast smoke)
npx mocha tests/phase3b.test.js --grep "TC-ADMIN-001" --timeout 60000

# Run one suite
npx mocha tests/phase3b.test.js --grep "Suite 1" --timeout 60000
```

## Environment variables (quick)

- `FRONTEND_URL` (default `http://localhost:3000`)
- `BACKEND_URL` (default `http://localhost:5000`)
- `SELENIUM_HEADLESS` (true|false)
- `TEST_TIMEOUT_MS` (milliseconds)

## Quick troubleshooting

- If tests fail immediately with `ECONNREFUSED`: ensure frontend/backend are running and accessible.
- If `selenium-webdriver` cannot be found: run `npm ci` in this directory.
- If Chrome/ChromeDriver mismatch: install matching chromedriver or use WebDriver manager.
