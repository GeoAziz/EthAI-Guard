const request = require('supertest');
const app = require('../../src/server');

describe('v1 dataset ingest validation', () => {
  let accessToken;
  let datasetId;
  const testPassword = 'pass';

  beforeAll(async () => {
    await request(app).post('/auth/register').send({ name: 'V1 Val', email: 'v1val@example.com', password: testPassword });
    const login = await request(app).post('/auth/login').send({ email: 'v1val@example.com', password: testPassword });
    accessToken = login.body.accessToken;
    const up = await request(app).post('/v1/datasets').set('Authorization', `Bearer ${accessToken}`).send({ name: 'v1-validate-csv', type: 'csv' });
    datasetId = up.body.datasetId;
  });

  test('quoted fields with commas and embedded newlines are accepted', async () => {
    const csv = 'name,notes\n"Doe, John","He said, ""hello"" to me"\n"Jane","No notes"\n';
    const b64 = Buffer.from(csv, 'utf8').toString('base64');
    const res = await request(app).post(`/v1/datasets/${datasetId}/ingest`).set('Authorization', `Bearer ${accessToken}`).send({ filename: 'quoted.csv', content_base64: b64 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('versionId');
    expect(res.body.header).toEqual(['name', 'notes']);
  });

  test('malformed CSV with inconsistent columns returns 400', async () => {
    const csv = 'a,b,c\n1,2\n3,4,5\n';
    const b64 = Buffer.from(csv, 'utf8').toString('base64');
    const res = await request(app).post(`/v1/datasets/${datasetId}/ingest`).set('Authorization', `Bearer ${accessToken}`).send({ filename: 'bad.csv', content_base64: b64 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('malformed_csv');
  });
});
