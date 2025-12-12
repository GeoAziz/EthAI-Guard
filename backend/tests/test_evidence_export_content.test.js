const request = require('supertest');
const app = require('../src/server');

describe('Evidence export content', () => {
  test('bundle includes drift and fairness sections', async () => {
    const res = await request(app)
      .post('/v1/alerts/test-alert/export')
      .send({});
    expect(res.statusCode).toBe(200);
    // Read the JSON file that was written
    const fs = require('fs');
    const path = res.body.path;
    let jsonPath = path;
    if (path.endsWith('.tar.gz')) {
      // if archived, locate the json inside the same directory
      const dir = require('path').dirname(path);
      const files = fs.readdirSync(dir);
      const json = files.find(f => f.endsWith('case_bundle.json'));
      expect(json).toBeTruthy();
      jsonPath = require('path').join(dir, json);
    }
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(data).toHaveProperty('drift_snapshot');
    expect(data).toHaveProperty('fairness_metrics');
    expect(data).toHaveProperty('evaluations');
    expect(data.drift_snapshot).toHaveProperty('metrics');
    expect(data.fairness_metrics).toHaveProperty('demographic_parity_diff');
  }, 10000); // Increase timeout to 10 seconds
});
