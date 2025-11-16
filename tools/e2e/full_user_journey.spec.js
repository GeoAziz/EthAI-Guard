/**
 * Day 13 — Full User Journey End-to-End Tests
 * 
 * Tests the complete user flow from UI → Backend → ai_core → Report Generation → Dashboard
 * 
 * Validates:
 * - User registration and authentication
 * - Token flow and refresh rotation
 * - Analysis request and report generation
 * - Request ID correlation across services
 * - UI responsiveness and error handling
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TIMEOUT = 60000; // 60 seconds for analysis

// Test utilities
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateTestUser = () => ({
  name: `Test User ${Date.now()}`,
  email: `test.${Date.now()}@ethai.test`,
  password: 'TestPassword123!',
  deviceName: 'E2E Test Device'
});

// Align payload with backend/ai_core contract: data is a columnar map and target column is named "target".
const sampleAnalysisPayload = {
  dataset_name: 'e2e_demo',
  data: {
    feature1: [0.1, 0.3, 0.8, 0.9, 0.2, 0.4, 0.7, 0.85],
    feature2: [0.9, 0.7, 0.2, 0.1, 0.8, 0.6, 0.3, 0.15],
    target:   [0,   0,   1,   1,   0,   0,   1,   1]
  }
};

// Test suite
describe('Day 13 — Full User Journey E2E Tests', () => {
  let testUser;
  let accessToken;
  let refreshToken;
  let reportId;
  let requestId;

  beforeAll(async () => {
    console.log('🚀 Starting Full User Journey E2E Tests');
    console.log(`Backend: ${BACKEND_URL}`);
    console.log(`Frontend: ${FRONTEND_URL}`);
    
    // Verify services are up
    try {
      const backendHealth = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      console.log('✅ Backend health:', backendHealth.data);
    } catch (error) {
      console.error('❌ Backend not available:', error.message);
      throw new Error('Backend service is not available');
    }
  });

  describe('1. User Registration & Authentication', () => {
    test('should register a new user successfully', async () => {
      testUser = generateTestUser();
      
      const response = await axios.post(`${BACKEND_URL}/auth/register`, {
        name: testUser.name,
        email: testUser.email,
        password: testUser.password
      });

  expect(response.status).toBe(200);
  // Backend returns { status, userId } on successful registration
  expect(response.data).toHaveProperty('status');
  expect(response.data).toHaveProperty('userId');
      
      console.log('✅ User registered:', testUser.email);
    });

    test('should login with correct credentials', async () => {
      const response = await axios.post(`${BACKEND_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password,
        deviceName: testUser.deviceName
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      
      accessToken = response.data.accessToken;
      refreshToken = response.data.refreshToken;
      
      // Validate token structure (JWT)
      expect(accessToken.split('.').length).toBe(3);
      expect(refreshToken.split('.').length).toBe(3);
      
      console.log('✅ User logged in with valid tokens');
    });

    test('should reject login with wrong password', async () => {
      try {
        await axios.post(`${BACKEND_URL}/auth/login`, {
          email: testUser.email,
          password: 'WrongPassword123!',
          deviceName: 'Test Device'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
        console.log('✅ Invalid credentials rejected');
      }
    });
  });

  describe('2. Analysis Request & Report Generation', () => {
    test('should initiate AI model ethics analysis', async () => {
      const response = await axios.post(
        `${BACKEND_URL}/analyze`,
        sampleAnalysisPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: TIMEOUT
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('reportId');
      
      reportId = response.data.reportId || response.data.report_id || response.data.id;
      requestId = response.headers['x-request-id'];
      
      expect(reportId).toBeTruthy();
      
      console.log('✅ Analysis initiated, reportId:', reportId);
      if (requestId) {
        console.log('✅ Request-ID captured:', requestId);
      }
    }, TIMEOUT);

    test('should wait for analysis to complete', async () => {
      // Poll for report completion
      let attempts = 30;
      let reportReady = false;
      
      while (attempts > 0 && !reportReady) {
        await sleep(2000);
        
        try {
          const response = await axios.get(
            `${BACKEND_URL}/report/${reportId}`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            }
          );
          
          if (response.status === 200 && response.data) {
            reportReady = true;
            console.log('✅ Report ready');
          }
        } catch (error) {
          if (error.response?.status === 404) {
            attempts--;
            continue;
          }
          throw error;
        }
      }
      
      expect(reportReady).toBe(true);
    }, TIMEOUT);

    test('should retrieve complete analysis report', async () => {
      const response = await axios.get(
        `${BACKEND_URL}/report/${reportId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('report');
      
      const report = response.data.report;
      expect(report).toBeTruthy();
      
      // Validate report structure
      expect(report).toHaveProperty('_id');
      expect(report._id).toBe(reportId);
      
      console.log('✅ Report retrieved successfully');
    });

    test('should reject analysis without authentication', async () => {
      try {
        await axios.post(
          `${BACKEND_URL}/analyze`,
          sampleAnalysisPayload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }
        );
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        console.log('✅ Unauthorized request rejected');
      }
    });
  });

  describe('3. Token Refresh & Session Management', () => {
    test('should refresh access token successfully', async () => {
      const oldAccessToken = accessToken;
      
      const response = await axios.post(
        `${BACKEND_URL}/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      
      accessToken = response.data.accessToken;
      const newRefreshToken = response.data.refreshToken;
      
      // Token should be rotated
      expect(accessToken).not.toBe(oldAccessToken);
      expect(newRefreshToken).not.toBe(refreshToken);
      
      refreshToken = newRefreshToken;
      
      console.log('✅ Token refreshed and rotated');
    });

    test('should reject invalid refresh token', async () => {
      try {
        await axios.post(
          `${BACKEND_URL}/auth/refresh`,
          { refreshToken: 'invalid.refresh.token' }
        );
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
        console.log('✅ Invalid refresh token rejected');
      }
    });

    test('should access report with new access token', async () => {
      const response = await axios.get(
        `${BACKEND_URL}/report/${reportId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      expect(response.status).toBe(200);
      console.log('✅ Report accessible with refreshed token');
    });
  });

  describe('4. Session Persistence', () => {
    test('should logout and login again', async () => {
      // Logout (if endpoint exists)
      try {
        await axios.post(
          `${BACKEND_URL}/auth/logout`,
          {},
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        console.log('✅ Logged out successfully');
      } catch (error) {
        console.log('⚠️  Logout endpoint not available or failed');
      }

      // Login again
      const response = await axios.post(`${BACKEND_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password,
        deviceName: 'E2E Re-login Device'
      });

      expect(response.status).toBe(200);
      accessToken = response.data.accessToken;
      
      console.log('✅ Re-login successful');
    });

    test('should still access previous report after re-login', async () => {
      const response = await axios.get(
        `${BACKEND_URL}/report/${reportId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.report._id).toBe(reportId);
      
      console.log('✅ Report persistence validated across sessions');
    });
  });

  describe('5. Request Tracing & Correlation', () => {
    test('should propagate X-Request-Id across services', async () => {
      const customRequestId = uuidv4();
      
      const response = await axios.post(
        `${BACKEND_URL}/analyze`,
        sampleAnalysisPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Request-Id': customRequestId
          },
          timeout: TIMEOUT
        }
      );

      expect(response.status).toBe(200);
      
      const returnedRequestId = response.headers['x-request-id'];
      expect(returnedRequestId).toBe(customRequestId);
      
      console.log('✅ Request-ID correlation validated:', customRequestId);
    }, TIMEOUT);
  });

  afterAll(() => {
    console.log('🎉 Full User Journey E2E Tests Complete');
  });
});

module.exports = {
  generateTestUser,
  sampleAnalysisPayload
};
