const request = require('supertest');
const app = require('../src/server');

describe('Datasets presign + ingest flow', () => {
  let accessToken;
  let datasetId;

  test('register and login', async () => {
    const reg = await request(app).post('/auth/register').send({ name: 'DS Test', email: 'ds@example.com', password: 'pass' });
    expect(reg.statusCode).toBe(200);

    const login = await request(app).post('/auth/login').send({ email: 'ds@example.com', password: 'pass' });
    expect(login.statusCode).toBe(200);
    accessToken = login.body.accessToken;
    expect(accessToken).toBeTruthy();
  });

  test('create dataset record', async () => {
    const up = await request(app).post('/datasets/upload').set('Authorization', `Bearer ${accessToken}`).send({ name: 'demo-csv', type: 'csv' });
    expect(up.statusCode).toBe(200);
    expect(up.body.datasetId).toBeTruthy();
    datasetId = up.body.datasetId;
  });

  test('presign and ingest small CSV', async () => {
    const presign = await request(app).post(`/datasets/${datasetId}/presign`).set('Authorization', `Bearer ${accessToken}`).send({});
    expect(presign.statusCode).toBe(200);
    expect(presign.body.uploadUrl).toBeTruthy();

    const csv = 'name,age\nAlice,30\nBob,25\n';
    const b64 = Buffer.from(csv, 'utf8').toString('base64');
    const ingest = await request(app).post(`/datasets/${datasetId}/ingest`).set('Authorization', `Bearer ${accessToken}`).send({ filename: 'sample.csv', content_base64: b64 });
    expect(ingest.statusCode).toBe(200);
    expect(ingest.body.status).toBe('ingested');
    expect(ingest.body.rows).toBe(2);
    expect(Array.isArray(ingest.body.header)).toBe(true);
    expect(Array.isArray(ingest.body.rowsPreview)).toBe(true);
    expect(ingest.body.rowsPreview.length).toBeGreaterThan(0);
  });
});
