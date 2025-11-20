const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function findWorkerPath() {
  // Prefer repo-root based path (when process started from repo root)
  const p1 = path.resolve(process.cwd(), 'tools', 'status', 'worker.js');
  if (fs.existsSync(p1)) return p1;

  // Fallback relative to this file (backend/src -> repo root)
  const p2 = path.join(__dirname, '..', '..', 'tools', 'status', 'worker.js');
  if (fs.existsSync(p2)) return p2;

  return null;
}

function startWorkerIfEnabled() {
  if (process.env.ENABLE_STATUS_WORKER !== '1') return null;

  const workerPath = findWorkerPath();
  if (!workerPath) {
    console.warn('[worker-starter] worker script not found; expected at tools/status/worker.js');
    return null;
  }

  try {
    const child = spawn(process.execPath, [workerPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
      env: { ...process.env }
    });

    child.stdout.on('data', d => console.log('[status-worker]', d.toString().trim()));
    child.stderr.on('data', d => console.error('[status-worker][err]', d.toString().trim()));

    child.on('exit', (code, signal) => console.warn('[status-worker] exited', { code, signal }));

    // allow parent to exit independently of worker
    child.unref();
    console.log('[worker-starter] spawned status worker PID', child.pid);
    return child;
  } catch (err) {
    console.error('[worker-starter] failed to spawn worker', err);
    return null;
  }
}

module.exports = { startWorkerIfEnabled };
