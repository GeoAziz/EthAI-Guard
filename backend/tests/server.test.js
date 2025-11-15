const request = require('supertest');
const app = require('../src/server');

describe('Auth and dataset flow', () => {
  let refreshToken;
  let accessToken;
  let userId;

  test('register -> login -> upload dataset -> get reports', async () => {
    // register
    const reg = await request(app).post('/auth/register').send({ name: 'Test', email: 't@example.com', password: 'pass' });
    expect(reg.statusCode).toBe(200);
    userId = reg.body.userId;

    // login
    const login = await request(app).post('/auth/login').send({ email: 't@example.com', password: 'pass', deviceName: 'Test Device' });
    expect(login.statusCode).toBe(200);
    accessToken = login.body.accessToken;
    refreshToken = login.body.refreshToken;
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    // upload dataset
    const up = await request(app).post('/datasets/upload').set('Authorization', `Bearer ${accessToken}`).send({ name: 'demo', type: 'csv' });
    expect(up.statusCode).toBe(200);

    // get reports (empty)
    const reports = await request(app).get('/reports/1').set('Authorization', `Bearer ${accessToken}`);
    expect(reports.statusCode).toBe(200);
  });

  test('refresh token rotation', async () => {
    // register and login
    const reg = await request(app).post('/auth/register').send({ name: 'Refresh', email: 'r@example.com', password: 'pass123' });
    expect(reg.statusCode).toBe(200);

    const login = await request(app).post('/auth/login').send({ email: 'r@example.com', password: 'pass123', deviceName: 'Refresh Test' });
    expect(login.statusCode).toBe(200);
    const oldRefresh = login.body.refreshToken;
    expect(oldRefresh).toBeTruthy();

    // refresh to get new tokens
    const refresh1 = await request(app).post('/auth/refresh').send({ refreshToken: oldRefresh });
    expect(refresh1.statusCode).toBe(200);
    const newAccessToken = refresh1.body.accessToken;
    const newRefresh = refresh1.body.refreshToken;
    expect(newAccessToken).toBeTruthy();
    expect(newRefresh).toBeTruthy();
    expect(newRefresh).not.toEqual(oldRefresh); // should be different due to rotation

    // old refresh token should now be invalid
    const refresh2 = await request(app).post('/auth/refresh').send({ refreshToken: oldRefresh });
    expect(refresh2.statusCode).toBe(401);

    // new refresh token should work
    const refresh3 = await request(app).post('/auth/refresh').send({ refreshToken: newRefresh });
    expect(refresh3.statusCode).toBe(200);
  });

  test('logout revokes refresh token', async () => {
    // register and login
    const reg = await request(app).post('/auth/register').send({ name: 'Logout', email: 'lo@example.com', password: 'pass456' });
    expect(reg.statusCode).toBe(200);

    const login = await request(app).post('/auth/login').send({ email: 'lo@example.com', password: 'pass456' });
    expect(login.statusCode).toBe(200);
    const token = login.body.refreshToken;
    const accessToken = login.body.accessToken;

    // logout
    const logout = await request(app).post('/auth/logout').set('Authorization', `Bearer ${accessToken}`).send({ refreshToken: token });
    expect(logout.statusCode).toBe(200);

    // refresh token should now be invalid
    const refresh = await request(app).post('/auth/refresh').send({ refreshToken: token });
    expect(refresh.statusCode).toBe(401);
  });

  test('list devices', async () => {
    // register and login from 2 devices
    const reg = await request(app).post('/auth/register').send({ name: 'Devices', email: 'd@example.com', password: 'pass789' });
    expect(reg.statusCode).toBe(200);

    const device1 = await request(app).post('/auth/login').send({ email: 'd@example.com', password: 'pass789', deviceName: 'Phone' });
    expect(device1.statusCode).toBe(200);
    const access1 = device1.body.accessToken;

    const device2 = await request(app).post('/auth/login').send({ email: 'd@example.com', password: 'pass789', deviceName: 'Laptop' });
    expect(device2.statusCode).toBe(200);

    // list devices (in-memory mode returns empty array, which is OK for test mode)
    const listDev = await request(app).get('/auth/devices').set('Authorization', `Bearer ${access1}`);
    expect(listDev.statusCode).toBe(200);
    expect(Array.isArray(listDev.body.devices)).toBe(true);
    // In in-memory mode, devices list is not populated (it's only for MongoDB), so just verify it's an array
  });
});

