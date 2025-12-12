const request = require('supertest');
// Ensure environment-driven limits can be toggled during the test
const app = require('../src/server');

describe('Dataset ingest validation', () => {
  let accessToken;
  let datasetId;

  beforeAll(async () => {
    // register and login
    await request(app).post('/auth/register').send({ name: 'Val Test', email: 'val@example.com', password: 'pass' });
    const login = await request(app).post('/auth/login').send({ email: 'val@example.com', password: 'pass' });
    accessToken = login.body.accessToken;
    const up = await request(app).post('/datasets/upload').set('Authorization', `Bearer ${accessToken}`).send({ name: 'validate-csv', type: 'csv' });
    datasetId = up.body.datasetId;
  });

  test('malformed CSV with inconsistent columns returns 400', async () => {
    const csv = 'a,b,c\n1,2\n3,4,5\n'; // second row has only 2 columns
    const b64 = Buffer.from(csv, 'utf8').toString('base64');
    const res = await request(app).post(`/datasets/${datasetId}/ingest`).set('Authorization', `Bearer ${accessToken}`).send({ filename: 'bad.csv', content_base64: b64 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('malformed_csv');
  });

  test('oversized upload returns 413', async () => {
    // set max to a tiny number for the test
    process.env.MAX_UPLOAD_BYTES = '10';
    const csv = 'col1,col2\n1234567890,1\n';
    const b64 = Buffer.from(csv, 'utf8').toString('base64');
    // ensure our payload size is > 10 bytes after decoding
    const res = await request(app).post(`/datasets/${datasetId}/ingest`).set('Authorization', `Bearer ${accessToken}`).send({ filename: 'big.csv', content_base64: b64 });
    expect(res.statusCode).toBe(413);
    expect(res.body.error).toBe('file_too_large');
  });
});
