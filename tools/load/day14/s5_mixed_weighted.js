import { register, login, analyze, getReport, listReports, sleepShort } from './k6-utils.js';
import { randomSeed, sleep } from 'k6';

randomSeed(1234);

export const options = {
  scenarios: {
    mixed: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 50),
      timeUnit: '1s',
      duration: __ENV.DURATION || '15m',
      preAllocatedVUs: Number(__ENV.PRE_VUS || 100),
      maxVUs: Number(__ENV.MAX_VUS || 300)
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<1000', 'p(99)<2500']
  }
};

const BASE = __ENV.BASE_URL || 'http://localhost:5000';

function chooseScenario() {
  // Weighted mix per spec: 10% S1, 50% S2, 25% S3, 15% S4
  const r = Math.random();
  if (r < 0.10) return 'S1';
  if (r < 0.60) return 'S2';
  if (r < 0.85) return 'S3';
  return 'S4';
}

export default function() {
  const email = register(BASE);
  const token = login(BASE, email);
  const scenario = chooseScenario();
  switch (scenario) {
    case 'S1':
      listReports(BASE, token);
      break;
    case 'S2': {
      const id = analyze(BASE, token, 400);
      if (id) getReport(BASE, token, id);
      break;
    }
    case 'S3': {
      analyze(BASE, token, 1500); // heavier explain dataset
      break;
    }
    case 'S4': {
      const id = analyze(BASE, token, 120);
      if (id) getReport(BASE, token, id);
      listReports(BASE, token);
      break;
    }
  }
  sleepShort();
}
