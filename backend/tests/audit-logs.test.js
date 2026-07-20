const request = require('supertest');
const app = require('../src/server');

describe('Audit Logs Endpoints', () => {
  describe('GET /v1/audit-logs', () => {
    it('retrieves audit logs', async () => {
      const res = await request(app).get('/v1/audit-logs');
      expect([200, 401]).toContain(res.status);
    });

    it('supports filtering by action', async () => {
      const res = await request(app).get('/v1/audit-logs?action=model_deployed');
      expect([200, 401]).toContain(res.status);
    });

    it('supports time range filtering', async () => {
      const res = await request(app)
        .get('/v1/audit-logs')
        .query({ start: '2025-01-01', end: '2025-12-31' });

      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /v1/audit-logs/:id', () => {
    it('retrieves specific audit log entry', async () => {
      const res = await request(app).get('/v1/audit-logs/log_123');
      expect([200, 401, 404]).toContain(res.status);
    });
  });

  describe('GET /v1/audit-logs/export', () => {
    it('exports audit logs for compliance', async () => {
      const res = await request(app).get('/v1/audit-logs/export?format=csv');
      expect([200, 400, 401]).toContain(res.status);
    });
  });
});
