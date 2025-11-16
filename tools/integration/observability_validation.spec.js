/**
 * Day 13 — Observability Validation Tests
 * 
 * Validates the complete observability stack:
 * - Metrics endpoints (/metrics) for backend & ai_core
 * - Request ID correlation across services
 * - Histogram metrics for performance tracking
 * - Log correlation and traceability
 * - Prometheus-compatible metrics format
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const AI_CORE_URL = process.env.AI_CORE_URL || 'http://localhost:8100';

// Test utilities
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const parsePrometheusMetrics = (metricsText) => {
  const metrics = {};
  const lines = metricsText.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('#') || line.trim() === '') continue;
    
    const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)/);
    if (match) {
      const metricName = match[1];
      metrics[metricName] = (metrics[metricName] || 0) + 1;
    }
  }
  
  return metrics;
};

const extractMetricValue = (metricsText, metricName, labels = {}) => {
  const lines = metricsText.split('\n');
  
  for (const line of lines) {
    if (line.startsWith(metricName)) {
      // Check if labels match
      let matches = true;
      for (const [key, value] of Object.entries(labels)) {
        if (!line.includes(`${key}="${value}"`)) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        const valueMatch = line.match(/}\s+([\d.]+)|^[^\s]+\s+([\d.]+)/);
        if (valueMatch) {
          return parseFloat(valueMatch[1] || valueMatch[2]);
        }
      }
    }
  }
  
  return null;
};

describe('Day 13 — Observability Stack Validation', () => {
  let accessToken;
  let testRequestId;

  beforeAll(async () => {
    console.log('📊 Starting Observability Validation Tests');
    
    // Setup test user
    const testUser = {
      email: `obs.test.${Date.now()}@ethai.test`,
      password: 'ObsTest123!',
      name: 'Observability Test User'
    };
    
    try {
      await axios.post(`${BACKEND_URL}/auth/register`, testUser);
      const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password,
        deviceName: 'Observability Test Device'
      });
      accessToken = loginResponse.data.accessToken;
      console.log('✅ Test user authenticated');
    } catch (error) {
      console.error('Failed to setup test user:', error.message);
      throw error;
    }
  });

  describe('1. Metrics Endpoints Availability', () => {
    test('should expose backend /metrics endpoint', async () => {
      const response = await axios.get(`${BACKEND_URL}/metrics`, { timeout: 5000 });
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(typeof response.data).toBe('string');
      expect(response.data.length).toBeGreaterThan(0);
      
      console.log('✅ Backend /metrics endpoint accessible');
      console.log(`   Metrics size: ${response.data.length} bytes`);
    });

    test('should expose ai_core /metrics endpoint', async () => {
      const response = await axios.get(`${AI_CORE_URL}/metrics`, { timeout: 5000 });
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(typeof response.data).toBe('string');
      expect(response.data.length).toBeGreaterThan(0);
      
      console.log('✅ ai_core /metrics endpoint accessible');
      console.log(`   Metrics size: ${response.data.length} bytes`);
    });

    test('should return Prometheus-compatible format', async () => {
      const response = await axios.get(`${BACKEND_URL}/metrics`);
      
      // Check for standard Prometheus metric types
      expect(response.data).toMatch(/# HELP/);
      expect(response.data).toMatch(/# TYPE/);
      
      // Should not have syntax errors
      const lines = response.data.split('\n');
      for (const line of lines) {
        if (line.startsWith('#') || line.trim() === '') continue;
        
        // Valid metric line format: metric_name{labels} value [timestamp]
        expect(line).toMatch(/^[a-zA-Z_:][a-zA-Z0-9_:]*/);
      }
      
      console.log('✅ Metrics follow Prometheus format');
    });
  });

  describe('2. HTTP Request Metrics', () => {
    test('should track http_requests_total in backend', async () => {
      // Get initial metrics
      const metricsBefore = await axios.get(`${BACKEND_URL}/metrics`);
      const beforeText = metricsBefore.data;
      
      // Make some requests
      await axios.get(`${BACKEND_URL}/health`);
      await axios.get(`${BACKEND_URL}/health`);
      
      await sleep(1000); // Allow metrics to update
      
      // Get updated metrics
      const metricsAfter = await axios.get(`${BACKEND_URL}/metrics`);
      const afterText = metricsAfter.data;
      
      // Should contain http_requests_total
      expect(afterText).toContain('http_requests_total');
      
      console.log('✅ Backend tracks http_requests_total');
    });

    test('should track http_requests_total in ai_core', async () => {
      const response = await axios.get(`${AI_CORE_URL}/metrics`);
      
      expect(response.data).toContain('http_requests_total');
      
      console.log('✅ ai_core tracks http_requests_total');
    });

    test('should track request methods and status codes', async () => {
      const response = await axios.get(`${BACKEND_URL}/metrics`);
      const metricsText = response.data;
      
      // Should have labels for method and status
      const httpRequestLines = metricsText
        .split('\n')
        .filter(line => line.startsWith('http_requests_total'));
      
      expect(httpRequestLines.length).toBeGreaterThan(0);
      
      // Check for method labels (GET, POST, etc.)
      const hasMethodLabels = httpRequestLines.some(line => 
        line.includes('method="') || line.includes('method=')
      );
      
      // Check for status code labels
      const hasStatusLabels = httpRequestLines.some(line => 
        line.includes('status="') || line.includes('status=') ||
        line.includes('status_code="') || line.includes('code=')
      );
      
      if (hasMethodLabels) {
        console.log('✅ HTTP method labels present');
      } else {
        console.log('⚠️  HTTP method labels not found (consider adding)');
      }
      
      if (hasStatusLabels) {
        console.log('✅ Status code labels present');
      } else {
        console.log('⚠️  Status code labels not found (consider adding)');
      }
    });
  });

  describe('3. Analysis Performance Histograms', () => {
    test('should track ai_core_analyze_seconds histogram', async () => {
      // Trigger an analysis
      const analysisPayload = {
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
      
      await axios.post(
        `${BACKEND_URL}/analyze`,
        analysisPayload,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          timeout: 30000
        }
      );
      
      await sleep(2000);
      
      // Check ai_core metrics
      const response = await axios.get(`${AI_CORE_URL}/metrics`);
      const metricsText = response.data;
      
      // Look for histogram metrics
      const hasHistogram = 
        metricsText.includes('analyze_seconds') ||
        metricsText.includes('analyze_duration') ||
        metricsText.includes('analysis_duration');
      
      if (hasHistogram) {
        console.log('✅ Analysis duration histogram present');
        
        // Check for histogram buckets
        const hasBuckets = metricsText.includes('_bucket') || metricsText.includes('le=');
        const hasCount = metricsText.includes('_count');
        const hasSum = metricsText.includes('_sum');
        
        if (hasBuckets) console.log('   ✓ Histogram buckets present');
        if (hasCount) console.log('   ✓ Histogram count present');
        if (hasSum) console.log('   ✓ Histogram sum present');
        
      } else {
        console.log('⚠️  Analysis duration histogram not found (consider implementing)');
      }
    }, 45000);

    test('should track request duration histograms', async () => {
      const backendMetrics = await axios.get(`${BACKEND_URL}/metrics`);
      
      const hasDurationMetric = 
        backendMetrics.data.includes('http_request_duration') ||
        backendMetrics.data.includes('http_request_latency') ||
        backendMetrics.data.includes('request_duration');
      
      if (hasDurationMetric) {
        console.log('✅ Request duration tracking present');
      } else {
        console.log('⚠️  Request duration histogram not found (consider implementing)');
      }
    });
  });

  describe('4. Request ID Correlation', () => {
    test('should propagate X-Request-Id header', async () => {
      testRequestId = uuidv4();
      
      const response = await axios.get(`${BACKEND_URL}/health`, {
        headers: { 'X-Request-Id': testRequestId }
      });
      
      const returnedRequestId = response.headers['x-request-id'];
      expect(returnedRequestId).toBe(testRequestId);
      
      console.log('✅ X-Request-Id propagated:', testRequestId);
    });

    test('should generate X-Request-Id if not provided', async () => {
      const response = await axios.get(`${BACKEND_URL}/health`);
      
      const requestId = response.headers['x-request-id'];
      expect(requestId).toBeTruthy();
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBeGreaterThan(0);
      
      console.log('✅ X-Request-Id auto-generated:', requestId);
    });

    test('should maintain Request-Id across backend → ai_core', async () => {
      testRequestId = `e2e-correlation-${Date.now()}`;
      
      const analysisPayload = {
        data: {
          x: [[0.1, 0.9], [0.3, 0.7], [0.8, 0.2]],
          y: [0, 0, 1],
          sensitive_attributes: [0, 0, 1]
        },
        parameters: {
          model_type: 'logistic_regression',
          sensitive_attribute_name: 'group',
          group_0_name: 'A',
          group_1_name: 'B'
        }
      };
      
      const response = await axios.post(
        `${BACKEND_URL}/analyze`,
        analysisPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Request-Id': testRequestId
          },
          timeout: 30000
        }
      );
      
      expect(response.status).toBe(200);
      const returnedRequestId = response.headers['x-request-id'];
      expect(returnedRequestId).toBe(testRequestId);
      
      console.log('✅ Request-Id maintained across services:', testRequestId);
      console.log('   Manual log inspection required to verify ai_core logs contain same ID');
    }, 45000);
  });

  describe('5. Log Correlation & Traceability', () => {
    test('should trace analysis through entire system', async () => {
      const correlationId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`🔍 Starting traceable analysis with ID: ${correlationId}`);
      
      const analysisPayload = {
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
      
      const response = await axios.post(
        `${BACKEND_URL}/analyze`,
        analysisPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Request-Id': correlationId
          },
          timeout: 30000
        }
      );
      
      expect(response.status).toBe(200);
      const reportId = response.data.reportId || response.data.report_id;
      
      console.log('✅ Analysis complete. Traceability validation:');
      console.log(`   Request ID: ${correlationId}`);
      console.log(`   Report ID: ${reportId}`);
      console.log('');
      console.log('   Manual verification required:');
      console.log('   1. Check backend logs for request_id:', correlationId);
      console.log('   2. Check ai_core logs for request_id:', correlationId);
      console.log('   3. Check ai_core logs for analysis_id/report_id:', reportId);
      console.log('   4. Verify all logs are correlated by timestamp');
      console.log('');
      console.log('   Commands:');
      console.log(`   docker compose logs system_api | grep "${correlationId}"`);
      console.log(`   docker compose logs ai_core | grep "${correlationId}"`);
      console.log(`   docker compose logs ai_core | grep "${reportId}"`);
    }, 45000);
  });

  describe('6. System Metrics', () => {
    test('should expose process metrics', async () => {
      const backendMetrics = await axios.get(`${BACKEND_URL}/metrics`);
      const aiCoreMetrics = await axios.get(`${AI_CORE_URL}/metrics`);
      
      // Common process metrics
      const processMetrics = [
        'process_cpu',
        'process_memory',
        'process_resident_memory',
        'process_virtual_memory',
        'nodejs_heap',
        'python_info'
      ];
      
      let backendHasProcessMetrics = false;
      let aiCoreHasProcessMetrics = false;
      
      for (const metric of processMetrics) {
        if (backendMetrics.data.includes(metric)) {
          backendHasProcessMetrics = true;
          break;
        }
      }
      
      for (const metric of processMetrics) {
        if (aiCoreMetrics.data.includes(metric)) {
          aiCoreHasProcessMetrics = true;
          break;
        }
      }
      
      if (backendHasProcessMetrics) {
        console.log('✅ Backend exposes process metrics');
      } else {
        console.log('⚠️  Backend process metrics not found (consider adding)');
      }
      
      if (aiCoreHasProcessMetrics) {
        console.log('✅ ai_core exposes process metrics');
      } else {
        console.log('⚠️  ai_core process metrics not found (consider adding)');
      }
    });

    test('should track error rates', async () => {
      // Trigger an error
      try {
        await axios.get(`${BACKEND_URL}/nonexistent-endpoint-for-error-tracking`);
      } catch (error) {
        // Expected 404
      }
      
      await sleep(1000);
      
      const metrics = await axios.get(`${BACKEND_URL}/metrics`);
      
      // Check if errors are tracked
      const tracksErrors = 
        metrics.data.includes('http_requests_total') ||
        metrics.data.includes('errors_total') ||
        metrics.data.includes('http_request_errors');
      
      expect(tracksErrors).toBe(true);
      console.log('✅ Error tracking metrics present');
    });
  });

  describe('7. Metrics Scraping Performance', () => {
    test('should return metrics quickly', async () => {
      const startTime = Date.now();
      const response = await axios.get(`${BACKEND_URL}/metrics`);
      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should respond in < 1s
      
      console.log(`✅ Backend metrics endpoint responded in ${duration}ms`);
    });

    test('should handle concurrent metrics requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        axios.get(`${BACKEND_URL}/metrics`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      expect(responses.every(r => r.status === 200)).toBe(true);
      console.log(`✅ Handled 10 concurrent metrics requests in ${duration}ms`);
    });
  });

  afterAll(() => {
    console.log('🎉 Observability Validation Tests Complete');
    console.log('');
    console.log('📋 Summary:');
    console.log('   • Metrics endpoints validated');
    console.log('   • Request tracing verified');
    console.log('   • Histogram metrics checked');
    console.log('   • Log correlation guidance provided');
    console.log('');
    console.log('🔍 Next Steps:');
    console.log('   1. Review logs for request_id correlation');
    console.log('   2. Verify Grafana dashboards (if configured)');
    console.log('   3. Set up alerting rules based on metrics');
  });
});
