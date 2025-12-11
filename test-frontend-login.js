#!/usr/bin/env node

/**
 * Test script to simulate the exact frontend login flow
 * This helps us identify what's failing in the frontend UI
 */

const API_BASE = 'http://localhost:5000';

// Mock localStorage
const localStorage = {
  _store: {},
  getItem(key) {
    return this._store[key] || null;
  },
  setItem(key, value) {
    this._store[key] = value;
  },
  removeItem(key) {
    delete this._store[key];
  },
};

async function makeRequest(method, path, body = null) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  // Simulate API interceptor: add backend token if available
  const backend = localStorage.getItem('backend_access_token');
  if (backend) {
    headers.Authorization = `Bearer ${backend}`;
    console.log(`[api] Attaching Authorization header for ${method} ${path}`);
  } else {
    console.log(`[api] No Authorization header for ${method} ${path}`);
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`[api] ${method} ${path}`);
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    console.error(`[api] ERROR ${response.status}:`, data);
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }

  console.log(`[api] SUCCESS ${response.status}`);
  return data;
}

async function testLogin() {
  const email = 'analyst-test@example.com';
  const password = 'AnalystPass123!';

  console.log('\n=== Testing Frontend Login Flow ===\n');
  console.log(`Attempting login with: ${email}\n`);

  try {
    // Step 1: Call /auth/login
    console.log('[Step 1] POST /auth/login');
    const loginResp = await makeRequest('POST', '/auth/login', {
      email,
      password,
      deviceName: 'frontend',
    });

    const access = loginResp?.accessToken || loginResp?.access_token;
    const refresh = loginResp?.refreshToken || loginResp?.refresh_token;

    if (access) {
      console.log('[Step 1] Token received, storing in localStorage\n');
      localStorage.setItem('backend_access_token', access);

      // Decode and log token
      try {
        const payload = access.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        console.log('[Step 1] Token claims:', decoded);
      } catch (e) {
        console.log('[Step 1] Could not decode token:', e.message);
      }
    }

    if (refresh) {
      console.log('[Step 1] Refresh token received\n');
      localStorage.setItem('backend_refresh_token', refresh);
    }

    // Step 2: Fetch user info with the token
    console.log('\n[Step 2] GET /v1/users/me (with Authorization header)');
    const meResp = await makeRequest('GET', '/v1/users/me');

    console.log('[Step 2] User info received\n');
    console.log('[Step 2] User data:', JSON.stringify(meResp, null, 2));

    const role = meResp?.role;
    console.log(`\n[Step 2] User role: ${role}`);

    console.log('\n=== LOGIN FLOW SUCCESSFUL ===\n');
    return true;
  } catch (err) {
    console.error('\n=== LOGIN FLOW FAILED ===\n');
    console.error('[ERROR]', err.message);
    return false;
  }
}

testLogin();
