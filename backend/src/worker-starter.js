const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

function findWorkerPath() {
  // Prefer repo-root based path (when process started from repo root)
  const p1 = path.resolve(process.cwd(), 'tools', 'status', 'worker.js');
  if (fs.existsSync(p1)) {
    return p1;
  }

  // Fallback relative to this file (backend/src -> repo root)
  const p2 = path.join(__dirname, '..', '..', 'tools', 'status', 'worker.js');
  if (fs.existsSync(p2)) {
    return p2;
  }

  return null;
}

function startWorkerIfEnabled() {
  if (process.env.ENABLE_STATUS_WORKER !== '1') {
    return null;
  }

  const workerPath = findWorkerPath();
  if (!workerPath) {
    logger.warn('[worker-starter] worker script not found; expected at tools/status/worker.js');
    return null;
  }

  try {
    const child = spawn(process.execPath, [workerPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
      env: { ...process.env },
    });

    child.stdout.on('data', d => logger.info({ msg: d.toString().trim() }, '[status-worker]'));
    child.stderr.on('data', d => logger.error({ msg: d.toString().trim() }, '[status-worker][err]'));

    child.on('exit', (code, signal) => logger.warn({ code, signal }, '[status-worker] exited'));

    // allow parent to exit independently of worker
    child.unref();
    logger.info({ pid: child.pid }, '[worker-starter] spawned status worker');
    return child;
  } catch (err) {
    logger.error({ err }, '[worker-starter] failed to spawn worker');
    return null;
  }
}

module.exports = { startWorkerIfEnabled };
