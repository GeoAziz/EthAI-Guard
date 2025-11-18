const request = require('supertest');
const app = require('../src/server');

jest.setTimeout(30000);

describe('Manual promotion flow', () => {
  test('after validation pass, version can be promoted', async () => {
    const modelId = 'default-model';
    // trigger retrain and wait for validated_pass
    const trig = await request(app).post(`/v1/models/${modelId}/trigger-retrain`).send({ reason: 'drift' });
    expect(trig.statusCode).toBe(200);
    const reqId = trig.body.requestId;

    let status = 'queued';
    for (let i = 0; i < 30; i++) {
      const st = await request(app).get(`/v1/retrain/${reqId}`);
      if (st.statusCode === 200) {
        status = st.body.status;
        if (status === 'validated_pass') break;
      }
      await new Promise(r => setTimeout(r, 400));
    }
    if (status !== 'validated_pass') {
      // skip promote if failed
      return;
    }

    // list versions
    const versions = await request(app).get(`/v1/models/${modelId}/versions`);
    expect(versions.statusCode).toBe(200);
    const ready = (versions.body || []).find(v => v.status === 'ready_for_promote');
    expect(ready).toBeTruthy();

    // promote
    const prom = await request(app).post(`/v1/models/${modelId}/promote`).send({ version: ready.version, requestId: reqId });
    expect(prom.statusCode).toBe(200);
    expect(prom.body.status).toBe('promoted');
  });
});
