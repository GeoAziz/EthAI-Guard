# Playwright Accessibility (Axe) Integration Plan

Goal
- Add a minimal Playwright-based accessibility smoke test that runs axe on key routes in CI. The test will fail CI when serious/critical violations are detected.

Why
- Axe smoke-check is already available as a dev tool. Playwright tests provide a stable, headful browser environment and integrate well with GitHub Actions and review apps.

High-level approach
1. Add Playwright as a dev dependency in `frontend` (optional: use `@playwright/test`).
2. Create a test file `frontend/tests/a11y.spec.ts` that:
   - Launches a Chromium browser (prefer system Chromium or Playwright's bundled browser).
   - Navigates to a list of target routes (configurable via env or test config).
   - Injects `axe-core` into the page and runs `axe.run()`.
   - Fails the test if any violations are found with impact `serious` or `critical`.
3. Add a small GitHub Actions job to run `npx playwright test frontend/tests/a11y.spec.ts` in PRs (can be gated behind a secret TARGET_URL or run against preview deploys).

Files to add
- `frontend/tests/a11y.spec.ts` — Playwright test that runs axe against a list of routes.
- Optionally: `frontend/playwright.config.ts` to configure retries, baseURL, and browser options.

Sample test logic (pseudo):
- const targets = [process.env.TARGET_URL || 'http://localhost:3000', ...]
- for each target+route: page.goto(url); await page.addScriptTag({ content: axeCore.source }); const results = await page.evaluate(() => axe.run()); assert no serious/critical violations.

CI considerations
- Playwright can download browsers during `npm ci` (adds time). Use Playwright's `--with-deps` images or cache browsers in CI.
- If you have a deployed review app, set `TARGET_URL` in GitHub Actions secrets and run against that URL.
- Failing criteria: set via env `FAIL_ON_SEVERITY=serious`.

Next steps I can do now (pick one):
- Scaffold `frontend/tests/a11y.spec.ts` test file and a basic `playwright.config.ts` (no deps install). I will not add Playwright to `package.json` to avoid adding heavy deps without your OK.
- Or, add the Playwright devDependency and scaffold tests, then run a quick local Playwright run (requires installing browsers). Choose this if you want the tests runnable immediately.

Notes
- This plan keeps the axe-check script for quick, fast runs and adds Playwright for CI-level integration and automated tests per route.
- We should decide whether to use Playwright's bundled browsers or system Chromium in CI for speed and caching.
