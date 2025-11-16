import { register, login, analyze, sleepShort } from './k6-utils.js';
import { check } from 'k6';

export const options = {
  scenarios: {
    explain_heavy: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { duration: '1m', target: Number(__ENV.RATE_TARGET || 20) },
        { duration: '3m', target: Number(__ENV.RATE_TARGET || 20) },
        { duration: '1m', target: 0 }
      ]
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<15000']
  }
};

const BASE = __ENV.BASE_URL || 'http://localhost:5000';

export default function() {
  const email = register(BASE);
  const token = login(BASE, email);
  // Large row count triggers heavier SHAP path CPU
  analyze(BASE, token, Number(__ENV.ROWS || 2000));
  sleepShort();
}
