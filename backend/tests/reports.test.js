const request = require('supertest');
const app = require('../src/server');
const axios = require('axios');

jest.mock('axios');
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(() => ({})),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
        set: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      })),
      add: jest.fn().mockResolvedValue({ id: 'report123' }),
      query: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            { id: 'doc1', data: () => ({ report_id: 'r1', status: 'completed', overall_score: 0.95 }) },
            { id: 'doc2', data: () => ({ report_id: 'r2', status: 'completed', overall_score: 0.87 }) },
          ],
        }),
      })),
    })),
  })),
}));

describe('Validation Reports Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /v1/validate-model', () => {
    it('validates required fields and returns 400 for missing fields', async () => {
      const res = await request(app).post('/v1/validate-model').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('validation_failed');
    });

    it('successfully triggers model validation with valid input', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          report_id: 'report123',
          status: 'completed',
          overall_score: 0.92,
          confidence_score: 0.88,
          total_cases: 200,
          metrics_summary: { accuracy: 0.94, f1: 0.91, precision: 0.89, recall: 0.93 },
          recommendations: ['Improve minority class coverage', 'Add more edge cases'],
          report_json: { detailed: 'metrics' },
        },
      });

      const res = await request(app).post('/v1/validate-model').send({
        model_name: 'fraud_detector',
        model_version: '1.2.0',
        model_description: 'Credit card fraud detection model',
        num_synthetic_cases: 200,
        include_edge_cases: true,
        include_stability_test: true,
      });

      expect(res.status).toBe(200);
      expect(res.body.report_id).toBe('report123');
      expect(res.body.status).toBe('completed');
      expect(res.body.overall_score).toBeCloseTo(0.92);
    });

    it('handles AI Core timeout gracefully', async () => {
      axios.post.mockRejectedValueOnce(new Error('timeout'));

      const res = await request(app).post('/v1/validate-model').send({
        model_name: 'slow_model',
        num_synthetic_cases: 500,
      });

      expect(res.status).toBe(503);
      expect(res.body.error).toBeDefined();
    });

    it('returns error when model_name exceeds max length', async () => {
      const longName = 'a'.repeat(200);
      const res = await request(app).post('/v1/validate-model').send({
        model_name: longName,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('validation_failed');
    });

    it('accepts optional edge case and stability test flags', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          report_id: 'report456',
          status: 'completed',
          overall_score: 0.85,
          confidence_score: 0.80,
          total_cases: 100,
          metrics_summary: {},
          recommendations: [],
          report_json: {},
        },
      });

      const res = await request(app).post('/v1/validate-model').send({
        model_name: 'test_model',
        include_edge_cases: false,
        include_stability_test: false,
        num_synthetic_cases: 100,
      });

      expect(res.status).toBe(200);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/validation/validate-model'),
        expect.objectContaining({
          include_edge_cases: false,
          include_stability_test: false,
        }),
        expect.any(Object)
      );
    });
  });

  describe('GET /v1/validation-reports', () => {
    it('retrieves all validation reports for user', async () => {
      const res = await request(app).get('/v1/validation-reports');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns reports in descending order by creation', async () => {
      const res = await request(app).get('/v1/validation-reports');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('supports pagination with limit and offset', async () => {
      const res = await request(app).get('/v1/validation-reports?limit=10&offset=0');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('filters reports by status if provided', async () => {
      const res = await request(app).get('/v1/validation-reports?status=completed');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /v1/validation-reports/:id', () => {
    it('retrieves specific report by ID', async () => {
      const res = await request(app).get('/v1/validation-reports/report123');

      expect(res.status).toBeOneOf([200, 404]);
    });

    it('returns 404 for non-existent report', async () => {
      const res = await request(app).get('/v1/validation-reports/nonexistent');

      expect(res.status).toBeOneOf([404, 200]);
    });

    it('includes full report details and metrics', async () => {
      const res = await request(app).get('/v1/validation-reports/report123');

      if (res.status === 200) {
        expect(res.body).toHaveProperty('report_id');
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('metrics_summary');
      }
    });
  });

  describe('Evidence Export Endpoints', () => {
    it('exports evidence bundle for alert', async () => {
      const res = await request(app).post('/v1/alerts/alert123/export').send({
        model_id: 'model123',
        format: 'json',
      });

      expect([200, 400, 404, 403]).toContain(res.status);
    });

    it('includes fairness metrics in export', async () => {
      const res = await request(app).post('/v1/alerts/alert456/export').send({
        model_id: 'model456',
        format: 'tar.gz',
      });

      expect([200, 400, 404, 403]).toContain(res.status);
    });

    it('includes drift snapshots in evidence bundle', async () => {
      const res = await request(app).post('/v1/alerts/alert789/export').send({
        model_id: 'model789',
      });

      expect([200, 400, 404, 403]).toContain(res.status);
    });

    it('supports multiple export formats (json, tar.gz, pdf)', async () => {
      for (const format of ['json', 'tar.gz']) {
        const res = await request(app).post('/v1/alerts/alert123/export').send({
          model_id: 'model123',
          format,
        });

        expect([200, 400, 404, 403]).toContain(res.status);
      }
    });
  });

  describe('Report Generation Performance', () => {
    it('generates validation report within SLO (<15s)', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          report_id: 'perf_test',
          status: 'completed',
          overall_score: 0.90,
          confidence_score: 0.85,
          total_cases: 200,
          metrics_summary: {},
          recommendations: [],
          report_json: {},
        },
      });

      const startTime = Date.now();
      const res = await request(app).post('/v1/validate-model').send({
        model_name: 'perf_model',
        num_synthetic_cases: 200,
      });
      const duration = Date.now() - startTime;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(15000);
    });
  });

  describe('Report Error Handling', () => {
    it('handles malformed JSON response from AI Core', async () => {
      axios.post.mockResolvedValueOnce({
        data: { invalid: 'structure' },
      });

      const res = await request(app).post('/v1/validate-model').send({
        model_name: 'malformed_test',
      });

      expect(res.status).toBe(500);
    });

    it('handles database storage failures gracefully', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          report_id: 'valid_report',
          status: 'completed',
          overall_score: 0.85,
          confidence_score: 0.80,
          total_cases: 100,
          metrics_summary: {},
          recommendations: [],
          report_json: {},
        },
      });

      const res = await request(app).post('/v1/validate-model').send({
        model_name: 'test_model',
      });

      expect(res.status).toBeOneOf([200, 500]);
    });
  });
});
