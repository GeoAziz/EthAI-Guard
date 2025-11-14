let chromium;
try {
  // Prefer local project playwright if available
  chromium = require('playwright').chromium;
} catch (e) {
  try {
    // Fallback to ai_core node_modules if installed there by the script runner
    chromium = require('../ai_core/node_modules/playwright').chromium;
  } catch (e2) {
    console.error('Playwright not found. Please run `npm install playwright` in the project root.');
    process.exit(1);
  }
}
const fs = require('fs');

async function screenshot(url, outPath) {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('Loading', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
    // Wait for the report content to load client-side
    await page.waitForSelector('text=Compliance Summary, text=Fairness Charts', { timeout: 15000 }).catch(() => {});
    // Take full-page screenshot
    await page.screenshot({ path: outPath, fullPage: true });
    console.log('Saved screenshot to', outPath);
  } catch (err) {
    console.error('Screenshot failed:', err.message || err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  const url = process.argv[2] || 'http://localhost:3000/report/6917661e5bbce093e28a3e4b';
  const out = process.argv[3] || 'docs/report-screenshot.png';
  // ensure docs dir exists
  fs.mkdirSync('docs', { recursive: true });
  screenshot(url, out);
}
