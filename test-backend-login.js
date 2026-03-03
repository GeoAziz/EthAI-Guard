#!/usr/bin/env node

/**
 * Test backend login endpoint directly to verify token exchange works
 */

const https = require('https');

const API_BASE = 'https://ethai-guard.onrender.com';

async function testBackendLogin() {
  console.log('\n🔐 Testing Backend Login Endpoint\n');

  const testUsers = [
    { email: 'promote-test@example.com', password: 'PromotePass123!' },
    { email: 'analyst-test@example.com', password: 'AnalystPass123!' },
  ];

  for (const user of testUsers) {
    console.log(`📝 Testing: ${user.email}`);

    try {
      const response = await new Promise((resolve, reject) => {
        const data = JSON.stringify({
          email: user.email,
          password: user.password,
          deviceName: 'test-direct',
        });

        const options = {
          hostname: 'ethai-guard.onrender.com',
          port: 443,
          path: '/auth/login',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
          },
          rejectUnauthorized: false,
        };

        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve({ status: res.statusCode, body });
          });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
      });

      console.log(`   Status: ${response.status}`);

      try {
        const parsed = JSON.parse(response.body);
        if (parsed.accessToken) {
          const token = parsed.accessToken;
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            console.log(`   ✓ Token received - role: ${payload.role}`);
          }
        } else if (parsed.error) {
          console.log(`   ❌ Error: ${parsed.error}`);
        }
      } catch (e) {
        console.log(`   Response: ${response.body.substring(0, 100)}`);
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }

    console.log();
  }
}

testBackendLogin();
