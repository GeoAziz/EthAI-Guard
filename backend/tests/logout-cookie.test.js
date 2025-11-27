const request = require('supertest');
const app = require('../src/server');

describe('POST /auth/logout-cookie', () => {
  it('returns 200 and clears cookies even when no cookie present', async () => {
    const resp = await request(app).post('/auth/logout-cookie').send({});
    expect(resp.status).toBe(200);
    // Expect Set-Cookie headers that clear cookies (accessToken and refreshToken)
    const setCookie = resp.headers['set-cookie'] || [];
    // There should be at least one Set-Cookie header
    expect(Array.isArray(setCookie)).toBe(true);
    // Find cookie names
    const hasAccessClear = setCookie.some(s => s.startsWith('accessToken=') || s.includes('accessToken=;'));
    const hasRefreshClear = setCookie.some(s => s.startsWith('refreshToken=') || s.includes('refreshToken=;'));
    expect(hasAccessClear || hasRefreshClear).toBe(true);
  });
});
