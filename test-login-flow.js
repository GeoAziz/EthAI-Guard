#!/usr/bin/env node

/**
 * Comprehensive test script to verify the complete login flow
 * Tests: Firebase auth → Backend token exchange → User data fetch
 */

const https = require('https');
const url = require('url');

// Test configuration
const API_BASE = 'https://ethai-guard.onrender.com';
const FIREBASE_PROJECT = 'studio-8429244671-dd548';
const TEST_USERS = [
  { email: 'promote-test@example.com', password: 'PromotePass123!', expectedRole: 'admin' },
  { email: 'analyst-test@example.com', password: 'AnalystPass123!', expectedRole: 'analyst' },
  { email: 'reviewer-test@example.com', password: 'ReviewerPass123!', expectedRole: 'reviewer' },
  { email: 'user-test@example.com', password: 'UserPass123!', expectedRole: 'user' },
  { email: 'guest-test@example.com', password: 'GuestPass123!', expectedRole: 'guest' },
];

// Helper: Make HTTPS request
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(path.startsWith('http') ? path : API_BASE + path);
    const options = {
      method,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      rejectUnauthorized: false, // Allow self-signed certs
    };

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(bodyStr);
    }

    req.end();
  });
}

// Helper: Decode JWT
function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

// Main test
async function testLoginFlow() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 COMPREHENSIVE LOGIN FLOW TEST');
  console.log('='.repeat(70));
  console.log(`API Base: ${API_BASE}`);
  console.log(`Firebase Project: ${FIREBASE_PROJECT}`);
  console.log(`Testing ${TEST_USERS.length} users\n`);

  let passed = 0;
  let failed = 0;

  for (const testUser of TEST_USERS) {
    console.log(`\n📝 Testing: ${testUser.email}`);
    console.log('-'.repeat(70));

    try {
      // Step 1: Login via backend /auth/login
      console.log(`  [Step 1] POST /auth/login`);
      const loginRes = await makeRequest('POST', '/auth/login', {
        email: testUser.email,
        password: testUser.password,
        deviceName: 'test-script',
      });

      if (loginRes.status !== 200) {
        console.log(
          `  ❌ Login failed: HTTP ${loginRes.status}`,
          JSON.stringify(loginRes.body).substring(0, 100),
        );
        failed++;
        continue;
      }

      const accessToken = loginRes.body?.accessToken;
      if (!accessToken) {
        console.log(`  ❌ No accessToken in response`);
        failed++;
        continue;
      }

      console.log(`  ✓ Token received (length: ${accessToken.length})`);

      // Decode and inspect token
      const decoded = decodeJwt(accessToken);
      if (decoded) {
        console.log(`  ✓ Token claims: sub=${decoded.sub}, role=${decoded.role}`);
      }

      // Step 2: Fetch user info using token
      console.log(`  [Step 2] GET /v1/users/me (with Authorization header)`);
      const meRes = await makeRequest('GET', '/v1/users/me', null, {
        Authorization: `Bearer ${accessToken}`,
      });

      if (meRes.status !== 200) {
        console.log(`  ❌ User fetch failed: HTTP ${meRes.status}`, JSON.stringify(meRes.body).substring(0, 100));
        failed++;
        continue;
      }

      const userRole = meRes.body?.data?.role || meRes.body?.role;
      console.log(`  ✓ User data retrieved: role=${userRole}`);

      // Verify role matches expectation
      if (userRole === testUser.expectedRole) {
        console.log(`  ✅ Role matches: ${userRole}`);
        passed++;
      } else {
        console.log(`  ⚠️  Role mismatch: expected ${testUser.expectedRole}, got ${userRole}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passed}/${TEST_USERS.length}`);
  console.log(`❌ Failed: ${failed}/${TEST_USERS.length}`);

  if (passed === TEST_USERS.length) {
    console.log('\n🎉 All login flows working correctly!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check configuration.');
    process.exit(1);
  }
}

testLoginFlow().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
