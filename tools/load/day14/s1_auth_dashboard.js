import { register, login, listReports, sleepShort } from './k6-utils.js';
import { Trend } from 'k6/metrics';
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    auth_dashboard: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2m', target: 20 },
        { duration: '1m', target: 0 }
      ]
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<1000', 'p(99)<2500']
  }
};

const BASE = __ENV.BASE_URL || 'http://localhost:5000';
const healthTrend = new Trend('health_latency');

export default function() {
  const h = http.get(`${BASE}/health`);
  healthTrend.add(h.timings.duration);
  check(h, { 'health 200': r => r.status === 200 });
  const email = register(BASE);
  const token = login(BASE, email);
  listReports(BASE, token);
  sleepShort();
}
