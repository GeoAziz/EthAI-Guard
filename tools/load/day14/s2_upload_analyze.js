import { register, login, analyze, getReport, sleepShort } from './k6-utils.js';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    upload_analyze: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '5m'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<12000']
  }
};

const BASE = __ENV.BASE_URL || 'http://localhost:5000';

export default function() {
  const email = register(BASE);
  const token = login(BASE, email);
  const reportId = analyze(BASE, token, Number(__ENV.ROWS || 500));
  // Poll for report readiness (in-memory typically immediate)
  if (reportId) {
    for (let i = 0; i < 5; i++) {
      const res = getReport(BASE, token, reportId);
      if (res.status === 200) break;
      sleep(1);
    }
  }
  sleepShort();
}
