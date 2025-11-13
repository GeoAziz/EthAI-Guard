const axios = require('axios');

// Simple e2e smoke test script. Requires services to be running:
// - system_api (Express) at SYSTEM_API_URL (default http://localhost:5000)
// - ai_core at AI_CORE_URL (not required directly by this script)

const SYSTEM_API_URL = process.env.SYSTEM_API_URL || 'http://localhost:5000';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('Starting smoke test against', SYSTEM_API_URL);

  try {
    // health
    const h = await axios.get(`${SYSTEM_API_URL}/health`);
    console.log('System health:', h.status);

    // register user
    const email = `smoketest+${Date.now()}@example.com`;
    const register = await axios.post(`${SYSTEM_API_URL}/auth/register`, { name: 'smoketest', email, password: 'Password123!' });
    console.log('Registered user:', register.data);

    // login
    const login = await axios.post(`${SYSTEM_API_URL}/auth/login`, { email, password: 'Password123!' });
    console.log('Login tokens received');
    const token = login.data.accessToken;

    // upload a small dataset (we use example payload)
    const payload = { dataset_name: 'smoke_example', data: { age: [20,30,40], income: [100,200,300] } };

    const analyze = await axios.post(`${SYSTEM_API_URL}/analyze`, payload, { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 });
    console.log('Analyze response:', analyze.status, Object.keys(analyze.data));

    // if a reportId or analysisId present, try to fetch it
    const reportId = analyze.data.reportId || analyze.data.analysisId || analyze.data.analysis_id;
    if (reportId) {
      // give some time for persistence
      await sleep(2000);
      const rpt = await axios.get(`${SYSTEM_API_URL}/report/${reportId}`, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Fetched report:', rpt.status, rpt.data?.report?._id ? 'ok' : 'missing');
    }

    console.log('Smoke test passed');
    process.exit(0);
  } catch (err) {
    console.error('Smoke test failed:', err?.response?.data || err.message || err);
    process.exit(2);
  }
}

run();
