import { register, login, analyze, getReport, sleepShort } from './k6-utils.js';
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    report_fetch: {
      executor: 'shared-iterations',
      vus: Number(__ENV.VUS || 50),
      iterations: Number(__ENV.ITER || 1000),
      maxDuration: __ENV.MAXD || '10m'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<800']
  }
};

const BASE = __ENV.BASE_URL || 'http://localhost:5000';

export default function() {
  const email = register(BASE);
  const token = login(BASE, email);
  const reportId = analyze(BASE, token, Number(__ENV.ROWS || 150));
  if (reportId) getReport(BASE, token, reportId);
  // Simulate list reports (userId placeholder 1)
  const list = http.get(`${BASE}/reports/1`, { headers: { 'Authorization': `Bearer ${token}` } });
  check(list, { 'list reports ok': r => r.status === 200 || r.status === 404 });
  sleepShort();
}
