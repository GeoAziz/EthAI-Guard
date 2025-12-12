#!/usr/bin/env node
// Simple smoke test for /api/status. Usage:
//   node tools/tests/smoke-status.js [--url=http://localhost:3000/api/status] [--expect-source=mongo]

const DEFAULT_URL = 'http://localhost:3000/api/status';
const args = Object.fromEntries(process.argv.slice(2).map(s => s.split('=').map(p => p.trim())));
const url = args['--url'] || args['url'] || DEFAULT_URL;
const expectSource = args['--expect-source'] || args['expectSource'] || null;

async function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

(async ()=>{
  console.log(`Smoke test: fetching ${url}`);
  const maxAttempts = 6;
  for (let i=1;i<=maxAttempts;i++){
    try{
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        console.warn(`Attempt ${i}: HTTP ${res.status}`);
      } else {
        const data = await res.json().catch(()=>null);
        console.log(`Attempt ${i}: OK`);
        if (expectSource){
          const source = data?.source || 'unknown';
          if (source === expectSource){
            console.log(`PASS: source === "${expectSource}"`);
            process.exit(0);
          } else {
            console.warn(`WARN: source is "${source}" (expected "${expectSource}")`);
            // continue attempts in case worker not yet seeded
          }
        } else {
          console.log('PASS: received 200 and JSON');
          process.exit(0);
        }
      }
    }catch(err){
      console.warn(`Attempt ${i}: ${err.message}`);
    }
    if (i < maxAttempts) {
      console.log('Waiting 2s and retrying...');
      await sleep(2000);
    }
  }
  console.error('FAIL: smoke test did not pass after retries');
  process.exit(2);
})();
