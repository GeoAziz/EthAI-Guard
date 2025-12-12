#!/usr/bin/env node
/* eslint-disable no-console */
const puppeteer = require('puppeteer-core')
const { AxePuppeteer } = require('axe-puppeteer')
const fs = require('fs')

async function run(url) {
  const executablePath = process.env.CHROMIUM_PATH || process.env.CHROME_PATH || (
    fs.existsSync('/usr/bin/chromium') && '/usr/bin/chromium'
  ) || (
    fs.existsSync('/usr/bin/chromium-browser') && '/usr/bin/chromium-browser'
  ) || (
    fs.existsSync('/snap/bin/chromium') && '/snap/bin/chromium'
  ) || (
    fs.existsSync('/usr/bin/google-chrome') && '/usr/bin/google-chrome'
  )

  if (!executablePath) {
    console.error('No Chromium executable found. Set CHROMIUM_PATH env var to your chromium/chrome binary.');
    process.exit(3)
  }

  const browser = await puppeteer.launch({ executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'networkidle2' })
  const results = await new AxePuppeteer(page).analyze()
  await browser.close()
  const violations = results.violations || []
  console.log(`Axe results for ${url}: ${violations.length} violations`)
  violations.forEach(v => {
    console.log('\n', v.id, v.impact, v.description)
    v.nodes.slice(0, 5).forEach(n => console.log(' - ', n.html))
  })
  if (violations.some(v => v.impact === 'critical')) {
    console.error('Critical accessibility violations found')
    process.exit(2)
  }
  process.exit(0)
}

const url = process.argv[2] || 'http://localhost:3000/dashboard/admin/access-requests'
run(url).catch(err => {
  console.error(err)
  process.exit(1)
})
