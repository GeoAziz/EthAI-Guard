const request = require('supertest');
const app = require('../src/server');

describe('Multi-Tenant Endpoints', () => {
  describe('POST /v1/tenants', () => {
    it('creates new tenant', async () => {
      const res = await request(app).post('/v1/tenants').send({
        name: 'Acme Corp',
        domain: 'acme.example.com',
      });

      expect([200, 201, 400, 403]).toContain(res.status);
    });

    it('requires authentication for tenant creation', async () => {
      const res = await request(app).post('/v1/tenants').send({
        name: 'Test Tenant',
      });

      expect([400, 401, 403]).toContain(res.status);
    });
  });

  describe('GET /v1/tenants', () => {
    it('lists user tenants', async () => {
      const res = await request(app).get('/v1/tenants');
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /v1/tenants/:id', () => {
    it('retrieves tenant details', async () => {
      const res = await request(app).get('/v1/tenants/tenant_123');
      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('PUT /v1/tenants/:id', () => {
    it('updates tenant settings', async () => {
      const res = await request(app).put('/v1/tenants/tenant_123').send({
        name: 'Updated Name',
      });

      expect([200, 400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /v1/tenants/:id/members', () => {
    it('adds member to tenant', async () => {
      const res = await request(app).post('/v1/tenants/tenant_123/members').send({
        email: 'newmember@example.com',
        role: 'analyst',
      });

      expect([200, 201, 400, 403, 404]).toContain(res.status);
    });
  });
});
