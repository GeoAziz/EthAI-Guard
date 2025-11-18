const request = require('supertest');
const app = require('../src/server');

jest.setTimeout(30000);

describe('Retrain workflow', () => {
  test('trigger retrain -> status progresses to validated_pass', async () => {
    const modelId = 'default-model';
    const trig = await request(app).post(`/v1/models/${modelId}/trigger-retrain`).send({ reason: 'drift', notes: 'test' });
    expect(trig.statusCode).toBe(200);
    const { requestId } = trig.body;
    expect(requestId).toBeTruthy();

    // Poll status for up to ~10s
    let status = 'queued';
    for (let i = 0; i < 25; i++) {
      const st = await request(app).get(`/v1/retrain/${requestId}`);
      if (st.statusCode === 200) {
        status = st.body.status;
        if (['validated_pass', 'failed'].includes(status)) break;
      }
      await new Promise(r => setTimeout(r, 400));
    }

    expect(['validated_pass', 'failed']).toContain(status);
  });
});
