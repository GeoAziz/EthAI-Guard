const request = require('supertest');
const fs = require('fs');
const app = require('../src/server');

jest.setTimeout(20000);

describe('Evidence export', () => {
  test('export endpoint returns artifact info', async () => {
    const resp = await request(app).post('/v1/alerts/alert-123/export');
    expect(resp.statusCode).toBe(200);
    expect(resp.body.status).toBe('exported');
    expect(resp.body.sha256).toBeTruthy();
    expect(typeof resp.body.size).toBe('number');
    if (resp.body.path) {
      expect(fs.existsSync(resp.body.path)).toBe(true);
    }
  });
});
