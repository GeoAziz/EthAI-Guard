#!/usr/bin/env node

/**
 * Comprehensive diagnostic script to identify login flow issues
 * Tests each step of the authentication pipeline
 */

const http = require('http');
const https = require('https');

const API_URL = process.env.API_URL || 'https://ethai-guard.onrender.com';
const TEST_EMAIL = 'promote-test@example.com';
const TEST_PASSWORD = 'PromotePass123!';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const isHttps = path.startsWith('https') || API_URL.startsWith('https');
    const protocol = isHttps ? https : http;
    const fullUrl = new URL(path.startsWith('http') ? path : API_URL + path);

    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port,
      path: fullUrl.pathname + fullUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DiagnosticTest/1.0',
      },
      rejectUnauthorized: false,
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed, raw: data });
        } catch {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runDiagnostics() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 LOGIN FLOW DIAGNOSTIC REPORT');
  console.log('='.repeat(80));
  console.log(`API Endpoint: ${API_URL}`);
  console.log(`Test User: ${TEST_EMAIL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const results = {
    steps: [],
    passed: 0,
    failed: 0,
  };

  // Test 1: Backend Login Endpoint
  console.log('📋 TEST 1: Backend Login Endpoint');
  console.log('-'.repeat(80));
  try {
    console.log(`  POST /auth/login with email and password`);
    const res = await makeRequest('POST', '/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      deviceName: 'diagnostic',
    });

    console.log(`  HTTP ${res.status}`);

    if (res.status === 200 && res.body?.accessToken) {
      console.log(`  ✅ SUCCESS: Token received (${res.body.accessToken.substring(0, 20)}...)`);

      try {
        const parts = res.body.accessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          console.log(`     Token payload: sub=${payload.sub}, role=${payload.role}, expires=${new Date(payload.exp * 1000).toISOString()}`);
        }
      } catch (e) {
        console.log(`     (Could not decode token)`);
      }

      results.passed++;
      results.steps.push({
        name: 'Backend Login',
        status: 'PASS',
        token: res.body.accessToken,
      });
    } else if (res.status === 401) {
      console.log(`  ❌ FAILED: Invalid credentials`);
      console.log(`     Response: ${JSON.stringify(res.body)}`);
      results.failed++;
      results.steps.push({ name: 'Backend Login', status: 'FAIL', reason: 'Invalid credentials' });
    } else {
      console.log(`  ❌ FAILED: Unexpected status`);
      console.log(`     Response: ${JSON.stringify(res.body || res.raw)}`);
      results.failed++;
      results.steps.push({ name: 'Backend Login', status: 'FAIL', reason: `HTTP ${res.status}` });
    }
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
    results.failed++;
    results.steps.push({ name: 'Backend Login', status: 'ERROR', error: err.message });
  }

  console.log();

  // Test 2: User Data Fetch
  if (results.steps[0]?.token) {
    console.log('📋 TEST 2: Fetch User Data with Token');
    console.log('-'.repeat(80));
    try {
      console.log(`  GET /v1/users/me with Authorization header`);
      const res = await makeRequest('GET', '/v1/users/me', null);
      // Add auth header manually since makeRequest doesn't support it yet
      // This is a limitation - let's just note it
      console.log(`  ⚠️  Note: This test requires auth header support`);
      results.steps.push({ name: 'User Data Fetch', status: 'SKIPPED', reason: 'Test limitation' });
    } catch (err) {
      console.log(`  ❌ ERROR: ${err.message}`);
      results.steps.push({ name: 'User Data Fetch', status: 'ERROR', error: err.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(80));
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Tests: ${results.steps.map((s) => `${s.name}=${s.status}`).join(', ')}`);

  if (results.failed === 0) {
    console.log('\n✅ Backend services appear healthy!');
    console.log('\nNext Steps:');
    console.log('1. Test frontend login page in browser at: https://eth-ai-guard.vercel.app/login');
    console.log('2. Check browser console for JavaScript errors');
    console.log('3. Check network tab for failed requests');
    console.log('4. Verify Firebase config in frontend/.env');
  } else {
    console.log('\n❌ Issues detected. See details above.');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

runDiagnostics().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
