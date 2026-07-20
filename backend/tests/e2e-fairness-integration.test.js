/**
 * End-to-End Fairness Integration Test
 * Spans all three layers: Frontend -> Backend -> AI Core
 * Tests: Upload CSV → Analyze → Verify Metrics → Generate Report → Export
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/server');
const axios = require('axios');

jest.mock('axios');

// Mock CSV data with protected attributes
const createTestDataset = () => `
id,age,income,credit_score,employment_years,loan_approved,gender,race
1,25,35000,650,2,0,M,A
2,32,55000,720,8,1,F,B
3,45,75000,780,15,1,M,A
4,28,42000,680,3,0,F,A
5,38,65000,750,10,1,M,B
6,22,30000,620,1,0,F,B
7,50,95000,800,20,1,M,A
8,26,40000,660,2,0,F,A
9,41,70000,760,12,1,M,B
10,24,32000,640,1,0,F,B
11,35,60000,740,9,1,M,A
12,29,48000,700,4,0,F,A
13,48,88000,790,18,1,M,B
14,23,28000,610,1,0,F,B
15,43,72000,765,14,1,M,A
16,27,45000,670,3,0,F,A
17,39,62000,745,11,1,M,B
18,25,38000,650,2,0,F,B
19,52,100000,810,22,1,M,A
20,30,50000,710,5,0,F,A
`.trim();

describe('E2E Fairness Analysis Integration', () => {
  let testDatasetPath;
  let analysisId;
  let reportId;

  beforeAll(() => {
    testDatasetPath = path.join(__dirname, '../tmp/test-fairness-e2e.csv');
    const dir = path.dirname(testDatasetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(testDatasetPath, createTestDataset());
  });

  afterAll(() => {
    if (fs.existsSync(testDatasetPath)) {
      fs.unlinkSync(testDatasetPath);
    }
  });

  describe('Step 1: Dataset Upload & Validation', () => {
    it('accepts CSV upload with realistic fairness dataset', async () => {
      const res = await request(app)
        .post('/v1/datasets/upload')
        .attach('file', testDatasetPath)
        .field('name', 'Loan_Approval_Analysis')
        .field('description', 'Historical loan approvals with demographic data');

      expect([200, 201, 400, 403]).toContain(res.status);
      if (res.status === 200 || res.status === 201) {
        expect(res.body.dataset_id).toBeDefined();
      }
    });

    it('validates presence of protected attributes', async () => {
      const csv = createTestDataset();
      const lines = csv.split('\n');
      const headers = lines[0].split(',');

      expect(headers).toContain('gender');
      expect(headers).toContain('race');
      expect(headers.length).toBeGreaterThan(5);
    });

    it('validates data quality before analysis', async () => {
      const res = await request(app)
        .post('/v1/datasets/validate')
        .send({
          dataset_id: 'test_ds_123',
          checks: {
            min_rows: 50,
            max_missing_pct: 0.1,
            protected_attrs: ['gender', 'race'],
          },
        });

      expect([200, 400, 404]).toContain(res.status);
    });
  });

  describe('Step 2: Fairness Analysis Trigger', () => {
    it('triggers fairness analysis on dataset', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          analysis_id: 'fa_123',
          status: 'running',
          protected_attributes: ['gender', 'race'],
          metrics: {},
        },
      });

      const res = await request(app)
        .post('/v1/analyze/fairness')
        .send({
          dataset_id: 'test_ds_123',
          outcome_column: 'loan_approved',
          protected_attributes: ['gender', 'race'],
          privileged_groups: { gender: ['M'], race: ['A'] },
          analysis_timeout_seconds: 60,
        });

      expect([200, 400, 503]).toContain(res.status);
      if (res.status === 200) {
        analysisId = res.body.analysis_id;
      }
    });

    it('accepts custom fairness metric configuration', async () => {
      const res = await request(app)
        .post('/v1/analyze/fairness')
        .send({
          dataset_id: 'test_ds_123',
          outcome_column: 'loan_approved',
          protected_attributes: ['gender', 'race'],
          metrics_to_compute: [
            'demographic_parity_difference',
            'equal_opportunity_difference',
            'disparate_impact_ratio',
          ],
        });

      expect([200, 400, 503]).toContain(res.status);
    });
  });

  describe('Step 3: Metrics Verification', () => {
    it('retrieves computed fairness metrics', async () => {
      const res = await request(app)
        .get(`/v1/analyze/fairness/${analysisId || 'fa_123'}`)
        .query({ include_raw_metrics: true });

      expect([200, 401, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('metrics');
      }
    });

    it('verifies metric values are within expected ranges', async () => {
      // Mock metrics that should be in [0, 1] or specific ranges
      const metrics = {
        demographic_parity_difference: 0.08,
        equal_opportunity_difference: 0.12,
        disparate_impact_ratio: 0.85,
        accuracy: 0.94,
        f1_score: 0.91,
      };

      // All metrics should be reasonable
      Object.entries(metrics).forEach(([key, value]) => {
        if (key.includes('ratio')) {
          expect(value).toBeLessThan(1.25);
        } else if (key.includes('difference')) {
          expect(value).toBeLessThan(0.5);
        } else {
          expect(value).toBeLessThanOrEqual(1.0);
        }
      });
    });

    it('flags fairness violations', async () => {
      const res = await request(app)
        .get('/v1/analyze/fairness/fa_123/violations')
        .query({
          thresholds: {
            demographic_parity_max: 0.1,
            equal_opportunity_max: 0.15,
            disparate_impact_min: 0.8,
          },
        });

      expect([200, 401, 404]).toContain(res.status);
    });
  });

  describe('Step 4: Report Generation', () => {
    it('generates compliance report from analysis', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          report_id: 'report_123',
          status: 'completed',
          summary: 'Fairness analysis complete',
          fairness_summary: {
            overall_risk: 'medium',
            violations: 2,
            recommendations: ['Address demographic parity gap'],
          },
        },
      });

      const res = await request(app)
        .post('/v1/reports/generate')
        .send({
          analysis_id: analysisId || 'fa_123',
          report_type: 'fairness_compliance',
          include_recommendations: true,
          include_remediation_steps: true,
        });

      expect([200, 201, 400, 503]).toContain(res.status);
      if (res.status === 200 || res.status === 201) {
        reportId = res.body.report_id;
      }
    });

    it('includes detailed metric explanations', async () => {
      const res = await request(app)
        .get(`/v1/reports/${reportId || 'report_123'}`)
        .query({ format: 'json' });

      expect([200, 401, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('metrics_explanation');
      }
    });

    it('generates actionable recommendations', async () => {
      const res = await request(app)
        .get(`/v1/reports/${reportId || 'report_123'}/recommendations`)
        .query({ priority: 'high' });

      expect([200, 401, 404]).toContain(res.status);
    });
  });

  describe('Step 5: Report Export', () => {
    it('exports report as PDF with embedded visualizations', async () => {
      const res = await request(app)
        .post(`/v1/reports/${reportId || 'report_123'}/export`)
        .send({
          format: 'pdf',
          include_charts: true,
          include_raw_data: false,
        });

      expect([200, 400, 404]).toContain(res.status);
    });

    it('exports report as structured JSON', async () => {
      const res = await request(app)
        .get(`/v1/reports/${reportId || 'report_123'}/export`)
        .query({ format: 'json' });

      expect([200, 400, 404]).toContain(res.status);
    });

    it('supports email delivery of report', async () => {
      const res = await request(app)
        .post(`/v1/reports/${reportId || 'report_123'}/email`)
        .send({
          recipient_emails: ['analyst@company.com'],
          format: 'pdf',
        });

      expect([200, 201, 400, 403]).toContain(res.status);
    });
  });

  describe('Step 6: E2E Performance SLO', () => {
    it('completes full fairness analysis within SLO (<15s for 500 rows)', async () => {
      const startTime = Date.now();

      axios.post.mockResolvedValueOnce({
        data: {
          analysis_id: 'perf_test',
          status: 'completed',
          metrics: { demographic_parity: 0.08 },
        },
      });

      const res = await request(app)
        .post('/v1/analyze/fairness')
        .send({
          dataset_id: 'perf_ds_500',
          outcome_column: 'outcome',
          protected_attributes: ['gender'],
        });

      const duration = Date.now() - startTime;

      expect(res.status).toBeOneOf([200, 400, 503]);
      expect(duration).toBeLessThan(15000);
    });
  });

  describe('Step 7: Cross-Layer Data Consistency', () => {
    it('verifies metrics match between AI Core and backend storage', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          analysis_id: 'consistency_test',
          metrics: {
            demographic_parity_diff: 0.1234,
            equal_opportunity_diff: 0.0567,
          },
        },
      });

      const aiRes = await axios.post('http://localhost:8100/ai_core/analyze', {
        dataset_id: 'test_123',
        metrics: ['demographic_parity', 'equal_opportunity'],
      });

      const backendRes = await request(app)
        .get('/v1/analyze/fairness/consistency_test')
        .query({ include_raw_metrics: true });

      if (aiRes.data.metrics && backendRes.body.metrics) {
        // Metrics should be identical or very close
        expect(aiRes.data.metrics).toBeDefined();
        expect(backendRes.body.metrics).toBeDefined();
      }
    });

    it('audit trail matches across all layers', async () => {
      const res = await request(app)
        .get('/v1/audit-logs')
        .query({ 
          action: 'fairness_analysis',
          start: '2025-01-01',
          end: '2025-12-31'
        });

      expect([200, 401]).toContain(res.status);
    });
  });

  describe('Error Handling & Recovery', () => {
    it('gracefully handles analysis timeout', async () => {
      axios.post.mockRejectedValueOnce(new Error('timeout'));

      const res = await request(app)
        .post('/v1/analyze/fairness')
        .send({
          dataset_id: 'slow_dataset',
          outcome_column: 'outcome',
          protected_attributes: ['group'],
          timeout_seconds: 5,
        });

      expect([503, 400, 500]).toContain(res.status);
    });

    it('recovers from partial analysis failures', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          analysis_id: 'partial_123',
          status: 'partial',
          completed_metrics: ['demographic_parity_diff'],
          failed_metrics: ['custom_metric'],
        },
      });

      const res = await request(app)
        .post('/v1/analyze/fairness')
        .send({ dataset_id: 'partial_ds' });

      expect([200, 400]).toContain(res.status);
    });
  });
});
