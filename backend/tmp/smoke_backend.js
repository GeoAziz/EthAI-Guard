/* eslint-disable no-console */
const base = process.env.BASE_URL || 'http://127.0.0.1:5053';

async function main() {
  const ts = Date.now();
  const email = `smoke_${ts}@example.com`;
  const password = 'pass1234567890';

  // Register
  let r = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Smoke', email, password })
  });
  if (!r.ok) throw new Error(`register failed ${r.status}`);
  const reg = await r.json();
  const userId = reg.userId;

  // Login
  r = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, deviceName: 'Smoke Device' })
  });
  if (!r.ok) throw new Error(`login failed ${r.status}`);
  let login = await r.json();
  let accessToken = login.accessToken;
  let refreshToken = login.refreshToken;

  // Upload dataset
  r = await fetch(`${base}/datasets/upload`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name: 'demo', type: 'csv' })
  });
  if (!r.ok) throw new Error(`upload failed ${r.status}`);
  const upload = await r.json();

  // List reports for user (owner allowed)
  r = await fetch(`${base}/reports/${userId}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!r.ok) throw new Error(`reports failed ${r.status}`);
  const reports = await r.json();

  // Refresh token rotation
  r = await fetch(`${base}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  if (!r.ok) throw new Error(`refresh1 failed ${r.status}`);
  const ref1 = await r.json();
  accessToken = ref1.accessToken;
  const newRefresh = ref1.refreshToken;

  // Old refresh should be invalid now
  r = await fetch(`${base}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  if (r.status !== 401) throw new Error(`expected 401 on old refresh, got ${r.status}`);

  // Analyze using fallback
  r = await fetch(`${base}/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ dataset_name: 'demo', data: { age: [25, 31, 44] } })
  });
  if (!r.ok) throw new Error(`analyze failed ${r.status}`);
  const analyze = await r.json();

  console.log(JSON.stringify({ ok: true, userId, uploadId: upload.id, reportsCount: (reports.reports||[]).length, analysisId: analyze.analysisId }));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
