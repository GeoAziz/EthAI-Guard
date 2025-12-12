#!/usr/bin/env node
/* eslint-disable no-console */
const puppeteer = require('puppeteer-core')
const axeCore = require('axe-core')
const fs = require('fs')
const path = require('path')

// Accept URLs either as CLI args or via the URLS env var (comma separated)
const cliUrls = process.argv.slice(2).filter(Boolean)
const envUrls = process.env.URLS ? process.env.URLS.split(',').map(s => s.trim()).filter(Boolean) : []
const urls = cliUrls.length ? cliUrls : (envUrls.length ? envUrls : [process.env.TARGET_URL || 'http://localhost:3000/dashboard/admin/access-requests'])

// Configure behavior via env
const OUTPUT_PATH = process.env.OUTPUT_PATH || path.join(process.cwd(), 'frontend', 'reports', `axe-results-${Date.now()}.json`)
// severity to fail on: critical | serious | moderate | minor (default: serious)
const FAIL_ON_SEVERITY = (process.env.FAIL_ON_SEVERITY || 'serious').toLowerCase()

const severityRank = { critical: 4, serious: 3, moderate: 2, minor: 1 }
const failRank = severityRank[FAIL_ON_SEVERITY] || severityRank['serious']

async function findExecutable() {
  return process.env.CHROMIUM_PATH || process.env.CHROME_PATH || (
    fs.existsSync('/usr/bin/chromium') && '/usr/bin/chromium'
  ) || (
    fs.existsSync('/usr/bin/chromium-browser') && '/usr/bin/chromium-browser'
  ) || (
    fs.existsSync('/snap/bin/chromium') && '/snap/bin/chromium'
  ) || (
    fs.existsSync('/usr/bin/google-chrome') && '/usr/bin/google-chrome'
  )
}

async function runOne(browser, url) {
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  console.log(`Navigating to ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  // inject axe-core into the page and run axe
  await page.evaluate(axeCore.source)
  const results = await page.evaluate(async () => {
    return await axe.run()
  })
  const violations = results.violations || []
  return { url, violations, raw: results }
}

async function main() {
  const executablePath = await findExecutable()
  if (!executablePath) {
    console.error('No Chromium executable found. Set CHROMIUM_PATH env var to your chromium/chrome binary.');
    process.exit(3)
  }

  const browser = await puppeteer.launch({ executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const runs = []
  for (const url of urls) {
    try {
      const r = await runOne(browser, url)
      runs.push(r)
      console.log(`Axe results for ${url}: ${r.violations.length} violations`)
      r.violations.forEach(v => {
        console.log('\n', v.id, v.impact, v.description)
        v.nodes.slice(0, 5).forEach(n => console.log(' - ', n.html))
      })
    } catch (err) {
      console.error(`Failed to run axe on ${url}:`, err && err.message ? err.message : err)
      runs.push({ url, error: String(err) })
    }
  }
  await browser.close()

  // summarize
  let maxRankFound = 0
  let totalViolations = 0
  runs.forEach(r => {
    if (!r.violations) return
    totalViolations += r.violations.length
    r.violations.forEach(v => {
      const rank = severityRank[v.impact] || 0
      if (rank > maxRankFound) maxRankFound = rank
    })
  })

  const summary = { totalViolations, maxRankFound }
  const out = { timestamp: Date.now(), urls, summary, runs }

  // ensure dir exists
  try {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2))
    console.log(`Wrote axe results to ${OUTPUT_PATH}`)
  } catch (err) {
    console.error('Failed to write output file', err)
  }

  if (maxRankFound >= failRank) {
    console.error(`Found accessibility issues at or above configured fail severity (${FAIL_ON_SEVERITY}). Failing.`)
    process.exit(2)
  }

  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
