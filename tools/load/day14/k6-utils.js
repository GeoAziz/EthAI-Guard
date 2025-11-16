import http from 'k6/http';
import { check, sleep } from 'k6';

export function randomEmail() {
  return `user_${Math.random().toString(36).substring(2)}@ethai.test`;
}

export function register(base) {
  const email = randomEmail();
  const res = http.post(`${base}/auth/register`, JSON.stringify({ name: 'Load User', email, password: 'PerfPass123!' }), {
    headers: { 'Content-Type': 'application/json' }
  });
  check(res, { 'register status 200|400': r => r.status === 200 || r.status === 400 });
  return email;
}

export function login(base, email) {
  const res = http.post(`${base}/auth/login`, JSON.stringify({ email, password: 'PerfPass123!' }), {
    headers: { 'Content-Type': 'application/json' }
  });
  check(res, { 'login ok': r => r.status === 200 });
  const body = res.json() || {};
  return body.accessToken;
}

export function analyze(base, token, rows = 200) {
  // Columnar dataset for ai_core
  const feature1 = Array.from({ length: rows }, (_, i) => (i % 10) / 10 + Math.random() * 0.01);
  const feature2 = Array.from({ length: rows }, (_, i) => 1 - ((i % 10) / 10) + Math.random() * 0.01);
  const target = Array.from({ length: rows }, (_, i) => i % 2);
  const payload = { dataset_name: 'perf', data: { feature1, feature2, target } };
  const res = http.post(`${base}/analyze`, JSON.stringify(payload), {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Test-Bypass-RateLimit': '1' }
  });
  check(res, { 'analyze 200': r => r.status === 200 });
  const reportId = res.json('reportId');
  return reportId;
}

export function getReport(base, token, id) {
  const res = http.get(`${base}/report/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
  check(res, { 'report 200': r => r.status === 200 });
  return res;
}

export function listReports(base, token, userId) {
  // Provided userId retrieval not exposed by login response; skip listing or simulate
  const res = http.get(`${base}/reports/${userId || '1'}`, { headers: { 'Authorization': `Bearer ${token}` } });
  check(res, { 'reports 200': r => r.status === 200 || r.status === 404 });
  return res;
}

export function sleepShort() { sleep(Math.random() * 0.5); }
