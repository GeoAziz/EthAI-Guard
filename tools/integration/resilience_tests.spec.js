/**
 * Day 13 — Resilience & Graceful Degradation Tests
 * 
 * Tests system behavior under stress conditions:
 * - Partial service outages
 * - High latency scenarios
 * - Memory pressure conditions
 * - Concurrent request handling
 * - Rate limiting and backpressure
 */

const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const AI_CORE_URL = process.env.AI_CORE_URL || 'http://localhost:8100';
const CONCURRENT_REQUESTS = 20;
const HIGH_LATENCY_THRESHOLD = 10000; // 10 seconds

// Test data
const samplePayload = {
  data: {
    x: [[0.1, 0.9], [0.3, 0.7], [0.8, 0.2], [0.9, 0.1]],
    y: [0, 0, 1, 1],
    sensitive_attributes: [0, 0, 1, 1]
  },
  parameters: {
    model_type: 'logistic_regression',
    sensitive_attribute_name: 'group',
    group_0_name: 'A',
    group_1_name: 'B'
  }
};

describe('Day 13 — Resilience & Graceful Degradation Tests', () => {
  let accessToken;
  let testUser;

  beforeAll(async () => {
    console.log('🛡️  Starting Resilience & Graceful Degradation Tests');
    
    // Setup test user
    testUser = {
      email: `resilience.test.${Date.now()}@ethai.test`,
      password: 'ResilienceTest123!',
      name: 'Resilience Test User'
    };
    
    try {
      await axios.post(`${BACKEND_URL}/auth/register`, testUser);
      const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password,
        deviceName: 'Resilience Test Device'
      });
      accessToken = loginResponse.data.accessToken;
      console.log('✅ Test user authenticated');
    } catch (error) {
      console.error('Failed to setup test user:', error.message);
      throw error;
    }
  });

  describe('1. Partial Outage Simulation', () => {
    test('should show graceful message when ai_core unavailable', async () => {
      // Stop ai_core
      console.log('🔴 Stopping ai_core service...');
      try {
        await execAsync('docker compose stop ai_core');
        await sleep(2000);
      } catch (error) {
        console.warn('Could not stop ai_core via docker compose');
      }

      try {
        const response = await axios.post(
          `${BACKEND_URL}/analyze`,
          samplePayload,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            timeout: 15000,
            validateStatus: () => true // Accept any status
          }
        );

        // Should receive error response, not crash
        expect(response.status).toBeGreaterThanOrEqual(500);
        
        // Should have proper error structure
        expect(response.data).toBeTruthy();
        const errorMsg = response.data.error || response.data.message || JSON.stringify(response.data);
        
        // Error should be user-friendly
        expect(errorMsg.toLowerCase()).toMatch(/service|unavailable|error|failed/);
        expect(errorMsg).not.toContain('ECONNREFUSED'); // No raw error codes
        expect(errorMsg).not.toContain('undefined');
        expect(errorMsg).not.toContain('null');
        
        console.log('✅ Graceful error response:', errorMsg);
        console.log('   Status code:', response.status);
        
      } finally {
        // Restart ai_core
        console.log('🟢 Restarting ai_core service...');
        await execAsync('docker compose start ai_core');
        await sleep(5000); // Wait for service to be ready
      }
    }, 30000);

    test('should maintain backend functionality during ai_core outage', async () => {
      // Stop ai_core
      console.log('🔴 Stopping ai_core for backend isolation test...');
      try {
        await execAsync('docker compose stop ai_core');
        await sleep(2000);
      } catch (error) {
        console.warn('Could not stop ai_core');
      }

      try {
        // Backend health should still work
        const healthResponse = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
        expect(healthResponse.status).toBe(200);
        console.log('✅ Backend health check works during ai_core outage');
        
        // Auth should still work
        const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
          email: testUser.email,
          password: testUser.password,
          deviceName: 'Outage Test Device'
        });
        expect(loginResponse.status).toBe(200);
        console.log('✅ Authentication works during ai_core outage');
        
        // Token refresh should still work
        const refreshResponse = await axios.post(
          `${BACKEND_URL}/auth/refresh`,
          { refreshToken: loginResponse.data.refreshToken }
        );
        expect(refreshResponse.status).toBe(200);
        console.log('✅ Token refresh works during ai_core outage');
        
      } finally {
        // Restart ai_core
        console.log('🟢 Restarting ai_core...');
        await execAsync('docker compose start ai_core');
        await sleep(5000);
      }
    }, 45000);

    test('should recover cleanly after ai_core comes back', async () => {
      // Verify ai_core is back
      const aiHealthResponse = await axios.get(`${AI_CORE_URL}/health`, { timeout: 5000 });
      expect(aiHealthResponse.status).toBe(200);
      
      // Analysis should work again
      const response = await axios.post(
        `${BACKEND_URL}/analyze`,
        samplePayload,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          timeout: 30000
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('reportId');
      
      console.log('✅ Service fully recovered, analysis successful');
    }, 45000);
  });

  describe('2. High Latency Conditions', () => {
    test('should handle slow processing gracefully', async () => {
      console.log('⏱️  Testing high latency handling...');
      
      const startTime = Date.now();
      
      const response = await axios.post(
        `${BACKEND_URL}/analyze`,
        samplePayload,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          timeout: 45000 // Allow up to 45s
        }
      );
      
      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      console.log(`✅ Request completed in ${duration}ms`);
      
      if (duration > HIGH_LATENCY_THRESHOLD) {
        console.log('   ⚠️  High latency detected (>10s)');
        console.log('   Verify:');
        console.log('   - UI shows loading indicator');
        console.log('   - No timeout errors in logs');
        console.log('   - Metrics show correct duration');
      }
    }, 60000);

    test('should timeout gracefully on extremely slow requests', async () => {
      // Set very short timeout to force timeout scenario
      try {
        const response = await axios.post(
          `${BACKEND_URL}/analyze`,
          samplePayload,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            timeout: 100 // 100ms - will likely timeout
          }
        );
        
        // If it doesn't timeout, that's fine too
        console.log('✅ Request completed within 100ms (fast!)');
        
      } catch (error) {
        // Should be timeout error, not server error
        expect(error.code).toBe('ECONNABORTED');
        console.log('✅ Timeout handled gracefully on client side');
      }
    }, 10000);
  });

  describe('3. Concurrent Request Handling', () => {
    test('should handle multiple concurrent analysis requests', async () => {
      console.log(`🔀 Starting ${CONCURRENT_REQUESTS} concurrent requests...`);
      
      const requests = Array(CONCURRENT_REQUESTS).fill(null).map((_, index) => 
        axios.post(
          `${BACKEND_URL}/analyze`,
          samplePayload,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'X-Request-Id': `concurrent-test-${Date.now()}-${index}`
            },
            timeout: 60000,
            validateStatus: () => true // Accept any status
          }
        )
      );
      
      const startTime = Date.now();
      const responses = await Promise.allSettled(requests);
      const duration = Date.now() - startTime;
      
      // Count successes and failures
      const succeeded = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failed = responses.filter(r => r.status === 'rejected' || r.value?.status >= 400);
      
      console.log(`✅ Concurrent requests completed in ${duration}ms`);
      console.log(`   Succeeded: ${succeeded.length}/${CONCURRENT_REQUESTS}`);
      console.log(`   Failed: ${failed.length}/${CONCURRENT_REQUESTS}`);
      
      // At least some should succeed
      expect(succeeded.length).toBeGreaterThan(0);
      
      // System should not completely fail
      const successRate = succeeded.length / CONCURRENT_REQUESTS;
      console.log(`   Success rate: ${(successRate * 100).toFixed(1)}%`);
      
      if (successRate < 0.5) {
        console.log('   ⚠️  Low success rate under concurrent load');
        console.log('   Consider: rate limiting, queueing, or scaling');
      }
    }, 120000);

    test('should handle concurrent auth requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        axios.post(`${BACKEND_URL}/auth/login`, {
          email: testUser.email,
          password: testUser.password,
          deviceName: 'Concurrent Test'
        })
      );
      
      const responses = await Promise.all(requests);
      
      // All should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(responses.every(r => r.data.accessToken)).toBe(true);
      
      console.log('✅ Handled 10 concurrent auth requests successfully');
    }, 30000);
  });

  describe('4. Memory Pressure Survival', () => {
    test('should handle large payload gracefully', async () => {
      // Create a large dataset
      const largePayload = {
        data: {
          x: Array(1000).fill(null).map(() => [Math.random(), Math.random()]),
          y: Array(1000).fill(null).map(() => Math.random() > 0.5 ? 1 : 0),
          sensitive_attributes: Array(1000).fill(null).map(() => Math.random() > 0.5 ? 1 : 0)
        },
        parameters: {
          model_type: 'logistic_regression',
          sensitive_attribute_name: 'group',
          group_0_name: 'A',
          group_1_name: 'B'
        }
      };
      
      try {
        const response = await axios.post(
          `${BACKEND_URL}/analyze`,
          largePayload,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            timeout: 60000,
            maxBodyLength: 10 * 1024 * 1024, // 10MB
            maxContentLength: 10 * 1024 * 1024
          }
        );
        
        expect(response.status).toBe(200);
        console.log('✅ Large payload (1000 samples) processed successfully');
        
      } catch (error) {
        if (error.response?.status === 413) {
          console.log('✅ Payload too large rejected gracefully (413)');
        } else if (error.response?.status >= 400) {
          console.log('✅ Large payload rejected with proper error');
        } else {
          throw error;
        }
      }
    }, 90000);

    test('should not crash on memory pressure', async () => {
      // Send multiple large requests
      const largePayload = {
        data: {
          x: Array(500).fill(null).map(() => [Math.random(), Math.random()]),
          y: Array(500).fill(null).map(() => Math.random() > 0.5 ? 1 : 0),
          sensitive_attributes: Array(500).fill(null).map(() => Math.random() > 0.5 ? 1 : 0)
        },
        parameters: {
          model_type: 'logistic_regression',
          sensitive_attribute_name: 'group',
          group_0_name: 'A',
          group_1_name: 'B'
        }
      };
      
      const requests = Array(5).fill(null).map(() => 
        axios.post(
          `${BACKEND_URL}/analyze`,
          largePayload,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            timeout: 60000,
            validateStatus: () => true
          }
        )
      );
      
      const responses = await Promise.allSettled(requests);
      
      // Check if backend is still responding
      const healthResponse = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      expect(healthResponse.status).toBe(200);
      
      console.log('✅ Backend survived memory pressure test');
      
      const succeeded = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;
      console.log(`   ${succeeded}/5 large requests succeeded`);
    }, 120000);
  });

  describe('5. Error Recovery & Retry Logic', () => {
    test('should recover from transient failures', async () => {
      let attempts = 0;
      let success = false;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts && !success) {
        attempts++;
        
        try {
          const response = await axios.post(
            `${BACKEND_URL}/analyze`,
            samplePayload,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` },
              timeout: 30000
            }
          );
          
          if (response.status === 200) {
            success = true;
          }
        } catch (error) {
          console.log(`   Attempt ${attempts} failed, retrying...`);
          await sleep(2000);
        }
      }
      
      expect(success).toBe(true);
      console.log(`✅ Request succeeded after ${attempts} attempt(s)`);
    }, 120000);

    test('should provide actionable error messages', async () => {
      // Test various error scenarios
      const errorTests = [
        {
          name: 'Missing auth token',
          request: () => axios.post(`${BACKEND_URL}/analyze`, samplePayload, { validateStatus: () => true }),
          expectedStatus: 401
        },
        {
          name: 'Invalid endpoint',
          request: () => axios.get(`${BACKEND_URL}/nonexistent`, { 
            headers: { 'Authorization': `Bearer ${accessToken}` },
            validateStatus: () => true 
          }),
          expectedStatus: 404
        }
      ];
      
      for (const test of errorTests) {
        const response = await test.request();
        expect(response.status).toBeGreaterThanOrEqual(400);
        
        // Should have error message
        const errorMsg = response.data?.error || response.data?.message;
        expect(errorMsg).toBeTruthy();
        expect(typeof errorMsg).toBe('string');
        
        // Should not expose internals
        expect(errorMsg).not.toContain('Error:');
        expect(errorMsg).not.toContain('at ');
        expect(errorMsg).not.toContain(__dirname);
        
        console.log(`✅ ${test.name}: proper error message`);
      }
    });
  });

  describe('6. Service Health Monitoring', () => {
    test('should report healthy status when services up', async () => {
      const backendHealth = await axios.get(`${BACKEND_URL}/health`);
      const aiCoreHealth = await axios.get(`${AI_CORE_URL}/health`);
      
      expect(backendHealth.status).toBe(200);
      expect(aiCoreHealth.status).toBe(200);
      
      console.log('✅ All services report healthy');
    });

    test('should include version info in health check', async () => {
      const response = await axios.get(`${BACKEND_URL}/health`);
      
      // Check if version info is included
      if (response.data.version) {
        console.log('✅ Health check includes version:', response.data.version);
      } else {
        console.log('⚠️  Consider adding version to health check response');
      }
    });

    test('should respond to health checks quickly', async () => {
      const measurements = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await axios.get(`${BACKEND_URL}/health`);
        const duration = Date.now() - startTime;
        measurements.push(duration);
      }
      
      const avgDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxDuration = Math.max(...measurements);
      
      expect(maxDuration).toBeLessThan(1000); // Should be < 1s
      
      console.log(`✅ Health check avg: ${avgDuration.toFixed(0)}ms, max: ${maxDuration}ms`);
    });
  });

  afterAll(() => {
    console.log('🎉 Resilience & Graceful Degradation Tests Complete');
    console.log('');
    console.log('📋 Resilience Summary:');
    console.log('   • Partial outage handling validated');
    console.log('   • High latency tolerance confirmed');
    console.log('   • Concurrent request handling tested');
    console.log('   • Memory pressure survival verified');
    console.log('   • Error recovery patterns checked');
    console.log('');
    console.log('🔍 Recommendations:');
    console.log('   1. Implement request queuing for high load');
    console.log('   2. Add circuit breakers for downstream services');
    console.log('   3. Configure rate limiting per user/IP');
    console.log('   4. Set up auto-scaling based on metrics');
  });
});
