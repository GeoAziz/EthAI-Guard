#!/usr/bin/env node
/**
 * Simple health-check worker.
 * - Reads list of endpoints (hardcoded below)
 * - Pings each endpoint every `INTERVAL_MS` and records result
 * - If MONGO_URI is provided, upserts status into `status_meta` document and creates incidents on failure
 * - Otherwise logs results and writes to public/demo-status.json (best-effort)
 */
const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');
// Prometheus client for worker metrics (optional)
let promClient = null;
let METRICS_ENABLED = true;
try {
  promClient = require('./node_modules/prom-client');
} catch (e) {
  try {
    // If installed at workspace root or by npm --prefix, require normally
    promClient = require('prom-client');
  } catch (e2) {
    METRICS_ENABLED = false;
    console.warn('prom-client not available; worker metrics disabled');
  }
}

const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '30000', 10);
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB || 'ethai';
// Leader-election lock TTL (ms) and renew interval (ms)
const WORKER_LOCK_TTL_MS = Number(process.env.WORKER_LOCK_TTL_MS || 60_000);
const WORKER_RENEW_INTERVAL_MS = Number(process.env.WORKER_RENEW_INTERVAL_MS || Math.floor(WORKER_LOCK_TTL_MS / 2));

const endpoints = [
  { id: 'api-gateway', name: 'API Gateway', url: process.env.API_GATEWAY_URL || 'https://localhost:3000/api/health' },
  { id: 'analysis-engine', name: 'Analysis Engine', url: process.env.ANALYSIS_ENGINE_URL || 'https://localhost:8000/health' },
  { id: 'mongodb', name: 'MongoDB Atlas', url: process.env.MONGO_PING_URL || 'https://localhost:27017' },
  { id: 'firebase', name: 'Firebase Auth', url: process.env.FIREBASE_HEALTH_URL || 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig' },
  { id: 'shap', name: 'SHAP Processing', url: process.env.SHAP_URL || 'https://localhost:8501/health' }
];

// Worker metrics (optional)
const WORKER_METRICS_PORT = Number(process.env.WORKER_METRICS_PORT || 9500);
const PUSHGATEWAY_URL = process.env.PUSHGATEWAY_URL || null;
let checksTotal, checksFailed, lastCheck;
let pushgateway = null;
// Expose owner globally for Pushgateway grouping
let WORKER_OWNER = null;
function startMetricsServer() {
  const http = require('http');
  if (!METRICS_ENABLED) {
    console.log('Metrics disabled (prom-client not installed). To enable, run: npm install prom-client');
    // Provide no-op metric objects
    checksTotal = { inc: () => {} };
    checksFailed = { inc: () => {} };
    lastCheck = { set: () => {} };

    const server = http.createServer(async (req, res) => {
      if (req.url === '/metrics') {
        res.setHeader('Content-Type', 'text/plain; version=0.0.4');
        res.end('# metrics disabled: prom-client not installed\n');
        return;
      }
      res.statusCode = 404;
      res.end('not found');
    });
    server.listen(WORKER_METRICS_PORT, () => console.log(`Worker metrics placeholder listening on :${WORKER_METRICS_PORT}`));
    return;
  }

  // prom-client is available
  checksTotal = new promClient.Counter({ name: 'status_worker_checks_total', help: 'Total status checks performed' });
  checksFailed = new promClient.Counter({ name: 'status_worker_checks_failed_total', help: 'Total failed checks' });
  lastCheck = new promClient.Gauge({ name: 'status_worker_last_check_timestamp', help: 'Unix timestamp of last check' });

  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      try {
        res.setHeader('Content-Type', promClient.register.contentType);
        res.end(await promClient.register.metrics());
      } catch (e) {
        res.statusCode = 500;
        res.end('metrics error');
      }
      return;
    }
    res.statusCode = 404;
    res.end('not found');
  });
  server.listen(WORKER_METRICS_PORT, () => console.log(`Worker metrics listening on :${WORKER_METRICS_PORT}`));

  // Configure Pushgateway if requested
  if (PUSHGATEWAY_URL) {
    try {
      // Support basic auth via PUSHGATEWAY_USER and PUSHGATEWAY_PASSWORD or prebuilt PUSHGATEWAY_AUTH
      const headers = {};
      const user = process.env.PUSHGATEWAY_USER;
      const pass = process.env.PUSHGATEWAY_PASSWORD;
      const preAuth = process.env.PUSHGATEWAY_AUTH; // base64 or 'Basic ...'
      if (preAuth) {
        headers.Authorization = preAuth.startsWith('Basic ') ? preAuth : `Basic ${preAuth}`;
      } else if (user && pass) {
        const b64 = Buffer.from(`${user}:${pass}`).toString('base64');
        headers.Authorization = `Basic ${b64}`;
      }
      const opts = Object.keys(headers).length ? { headers } : undefined;
      pushgateway = new promClient.Pushgateway(PUSHGATEWAY_URL, opts);
      console.log('Configured Pushgateway at', PUSHGATEWAY_URL);
    } catch (e) {
      console.warn('Failed to configure Pushgateway', e && e.message);
      pushgateway = null;
    }
  }
}

async function ping(url) {
  try {
    const start = Date.now();
    const res = await fetch(url, { method: 'GET', timeout: 8000 });
    const latency = Date.now() - start;
    const ok = res && (res.status >= 200 && res.status < 400);
    return { ok, status: res ? res.status : 0, latency };
  } catch (err) {
    return { ok: false, status: 0, latency: null, error: String(err) };
  }
}

async function writeDemoFile(statusObj) {
  const p = path.join(process.cwd(), 'public', 'demo-status.json');
  try {
    fs.writeFileSync(p, JSON.stringify(statusObj, null, 2));
    console.log('Wrote demo status to', p);
  } catch (err) {
    console.error('Failed to write demo file', err);
  }
}

async function runChecksAndPersist(dbClient) {
  const results = [];
  for (const ep of endpoints) {
    const r = await ping(ep.url);
    results.push({ id: ep.id, name: ep.name, ok: r.ok, status: r.status || (r.ok ? 200 : 0), latency: r.latency, lastChecked: new Date().toISOString(), error: r.error });
  }

  const overallStatus = results.every(r => r.ok) ? 'operational' : (results.some(r => !r.ok) ? 'degraded' : 'operational');
  const statusObj = {
    lastChecked: new Date().toISOString(),
    overall: { status: overallStatus, uptime30d: '99.9%' },
    services: results.map(r => ({ id: r.id, name: r.name, status: r.ok ? 'operational' : 'down', uptime: r.ok ? '99.9%' : '0%', latency: r.latency ? `${r.latency}ms` : 'n/a', lastChecked: r.lastChecked })),
    incidents: []
  };

  if (MONGO_URI && dbClient) {
    try {
      // dbClient may be either a MongoClient or already a Db instance depending on caller.
      const db = (typeof dbClient.db === 'function') ? dbClient.db(DB_NAME) : dbClient;

      await db.collection('status_meta').updateOne({ _id: 'singleton' }, { $set: statusObj }, { upsert: true });

      // Create or update incidents for services that are down (deduplicate)
      for (const s of statusObj.services) {
        if (s.status !== 'operational') {
          const title = `${s.name} Unreachable`;
          const now = new Date().toISOString();
          const existing = await db.collection('incidents').findOne({ title, services: { $in: [s.id] }, resolved: false });
          if (existing) {
            // Update timestamp and count
            await db.collection('incidents').updateOne({ _id: existing._id }, { $set: { updatedAt: now }, $inc: { occurrences: 1 } });
          } else {
            const inc = {
              id: `inc-${Date.now()}-${s.id}`,
              date: now,
              createdAt: now,
              updatedAt: now,
              title,
              description: `Health check failed for ${s.name} (${s.id})`,
              resolved: false,
              severity: 'major',
              services: [s.id],
              occurrences: 1
            };
            await db.collection('incidents').insertOne(inc);
          }
        }
      }

      console.log('Persisted health check results to MongoDB');
      // metrics: increment checks total and failed counts
      try {
        checksTotal.inc();
        const failedCount = statusObj.services.filter(s => s.status !== 'operational').length;
        if (failedCount > 0) checksFailed.inc(failedCount);
        lastCheck.set(Date.now() / 1000);
        // optionally push to Pushgateway
        if (pushgateway && WORKER_OWNER) {
          pushgateway.pushAdd({ jobName: 'status_worker', groupings: { owner: WORKER_OWNER } }, err => {
            if (err) console.error('Pushgateway push failed', err);
          });
        } else if (pushgateway) {
          pushgateway.pushAdd({ jobName: 'status_worker' }, err => { if (err) console.error('Pushgateway push failed', err); });
        }
      } catch (me) {
        console.warn('metrics update failed', me && me.message);
      }
    } catch (err) {
      console.error('Failed to persist to MongoDB', err);
      await writeDemoFile(statusObj);
    }
  } else {
    await writeDemoFile(statusObj);
    // metrics for demo file path (still record checks)
    try {
      checksTotal.inc();
      const failedCount = statusObj.services.filter(s => s.status !== 'operational').length;
      if (failedCount > 0) checksFailed.inc(failedCount);
      lastCheck.set(Date.now() / 1000);
      if (pushgateway && WORKER_OWNER) {
        pushgateway.pushAdd({ jobName: 'status_worker', groupings: { owner: WORKER_OWNER } }, err => { if (err) console.error('Pushgateway push failed', err); });
      } else if (pushgateway) {
        pushgateway.pushAdd({ jobName: 'status_worker' }, err => { if (err) console.error('Pushgateway push failed', err); });
      }
    } catch (me) {
      console.warn('metrics update failed', me && me.message);
    }
  }
}

// Leader-election helpers
function makeOwnerId() {
  const os = require('os');
  return `${os.hostname()}:${process.pid}:${Math.random().toString(36).slice(2,8)}`;
}

async function tryAcquireLock(db, owner) {
  const coll = db.collection('worker_locks');
  const now = Date.now();
  const expiresAt = new Date(now + WORKER_LOCK_TTL_MS);
  // Try to claim lock if it is expired or already ours
  const filter = { _id: 'status_worker', $or: [{ expiresAt: { $lt: new Date(now) } }, { owner }] };
  const update = { $set: { owner, pid: process.pid, expiresAt, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } };
  const opts = { upsert: true, returnDocument: 'after' };
  try {
    const res = await coll.findOneAndUpdate(filter, update, opts);
    if (!res.value) {
      // Could not claim lock
      return false;
    }
    // If owner in document matches us, we hold lock
    return res.value.owner === owner;
  } catch (err) {
    console.error('Lock acquisition error', err);
    return false;
  }
}

async function renewLock(db, owner) {
  const coll = db.collection('worker_locks');
  const now = Date.now();
  const expiresAt = new Date(now + WORKER_LOCK_TTL_MS);
  try {
    const res = await coll.updateOne({ _id: 'status_worker', owner }, { $set: { expiresAt, updatedAt: new Date() } });
    return res.matchedCount > 0;
  } catch (err) {
    console.error('Lock renew error', err);
    return false;
  }
}

async function releaseLock(db, owner) {
  try {
    await db.collection('worker_locks').deleteOne({ _id: 'status_worker', owner });
  } catch (err) {
    console.error('Failed to release lock', err);
  }
}

async function main() {
  console.log('Starting health-check worker, interval:', INTERVAL_MS);
  let client = null;
  let db = null;
  let owner = makeOwnerId();
  // Allow overriding the owner id (useful for CI/GitHub Actions runs)
  owner = process.env.WORKER_OWNER || owner;
  WORKER_OWNER = owner;
  let lockHeld = false;
  let renewTimer = null;

  if (MONGO_URI) {
    try {
      const { MongoClient } = require('mongodb');
      client = new MongoClient(MONGO_URI);
      await client.connect();
      db = client.db(DB_NAME);
      console.log('Connected to MongoDB for worker');
    } catch (err) {
      console.error('Failed to connect to MongoDB for worker', err);
      client = null;
    }
  }

  // Start metrics server if prom-client is available
  try {
    startMetricsServer();
  } catch (err) {
    console.warn('Failed to start metrics server', err);
  }

  async function oneRun() {
    if (db) {
      try {
        const ok = await tryAcquireLock(db, owner);
        if (!ok) {
          console.log('Another worker holds the lock; skipping this run');
          return;
        }
        lockHeld = true;
        // Start a renew timer if not running
        if (!renewTimer) {
          renewTimer = setInterval(async () => {
            const okRenew = await renewLock(db, owner);
            if (!okRenew) {
              console.warn('Failed to renew lock; another worker may have stolen it');
            }
          }, WORKER_RENEW_INTERVAL_MS);
        }
      } catch (err) {
        console.error('Error during lock acquisition', err);
      }
    }

    try {
      await runChecksAndPersist(db);
    } finally {
      // If we hold a lock, we keep it for TTL; we only release on graceful shutdown
    }
  }

  // Do first run immediately
  await oneRun();
  const interval = setInterval(oneRun, INTERVAL_MS);

  // Graceful shutdown: clear timers and release lock
  const shutdown = async () => {
    console.log('Shutting down worker');
    clearInterval(interval);
    if (renewTimer) clearInterval(renewTimer);
    if (db && lockHeld) {
      await releaseLock(db, owner);
      console.log('Released leader lock');
    }
    if (client) await client.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('Worker failed', err);
  process.exit(1);
});
