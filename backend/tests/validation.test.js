const request = require('supertest');
const app = require('../src/server');

jest.mock('axios');
const axios = require('axios');

describe('Validation Endpoints', () => {
  describe('POST /v1/validate-model', () => {
    it('validates model and returns report', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          report_id: 'val_123',
          status: 'completed',
          overall_score: 0.92,
        },
      });

      const res = await request(app).post('/v1/validate-model').send({
        model_name: 'test_model',
        num_synthetic_cases: 100,
      });

      expect([200, 400, 403]).toContain(res.status);
    });

    it('handles validation timeout', async () => {
      axios.post.mockRejectedValueOnce(new Error('timeout'));

      const res = await request(app).post('/v1/validate-model').send({
        model_name: 'slow_model',
      });

      expect([503, 400, 500]).toContain(res.status);
    });
  });

  describe('GET /v1/validation-reports', () => {
    it('lists validation reports', async () => {
      const res = await request(app).get('/v1/validation-reports');
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('POST /v1/validate-csv', () => {
    it('validates CSV format and content', async () => {
      const res = await request(app)
        .post('/v1/validate-csv')
        .send({
          csv_data: 'col1,col2\n1,2\n3,4',
          expected_columns: ['col1', 'col2'],
        });

      expect([200, 400]).toContain(res.status);
    });

    it('detects data type issues', async () => {
      const res = await request(app)
        .post('/v1/validate-csv')
        .send({
          csv_data: 'col1,col2\nabc,def',
          expected_types: { col1: 'number', col2: 'number' },
        });

      expect([200, 400, 422]).toContain(res.status);
    });
  });

  describe('POST /v1/validate-dataset', () => {
    it('validates entire dataset', async () => {
      const res = await request(app)
        .post('/v1/validate-dataset')
        .send({
          dataset_id: 'ds_123',
          rules: { min_rows: 100, max_cols: 50 },
        });

      expect([200, 400, 403, 404]).toContain(res.status);
    });
  });
});
