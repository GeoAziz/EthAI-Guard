const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../logger');
const { getEvaluations } = require('../storage/evaluations');
const { listModelVersions, listAudits } = require('../storage/models');

const BASE_DIR = process.env.EVIDENCE_DIR || path.join(process.cwd(), 'tmp', 'evidence');
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function collectData(alertId, req) {
  const out = {
    alert_id: alertId,
    collected_at: new Date().toISOString(),
    model: { id: req.body?.model_id || 'demo', version: 'unknown', sha: null },
    drift_snapshot: {
      window_start: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      window_end: new Date().toISOString(),
      overall_status: 'unknown',
      metrics: {
        psi: null,
        kl_divergence: null,
        wasserstein: null,
      },
    },
    fairness_metrics: {
      demographic_parity_diff: null,
      equal_opportunity_diff: null,
      groups: {},
    },
    evaluations: [],
    logs: [],
    ci: {
      provider: process.env.GITHUB_ACTIONS ? 'github' : (process.env.CI ? 'generic' : 'none'),
      run_id: process.env.GITHUB_RUN_ID || null,
      run_number: process.env.GITHUB_RUN_NUMBER || null,
      actor: process.env.GITHUB_ACTOR || null,
      sha: process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA || null,
      ref: process.env.GITHUB_REF || null,
    },
    validation_comparison: {},
  };
  try {
    const evals = await getEvaluations({ limit: 10000 });
    out.evaluations = evals;
  } catch (e) {
    logger.warn({ err: e?.message }, 'evidence_get_evals_failed');
  }

  // Pull latest drift snapshot from Mongo if available
  try {
    const db = req?.app?.locals?.db;
    const modelId = req.body?.model_id || 'default-model';
    if (db) {
      const latest = await db.collection('drift_snapshots')
        .findOne({ model_id: modelId }, { sort: { window_end: -1 } });
      if (latest) {
        out.drift_snapshot = latest;
      }
    }
  } catch (e) {
    logger.warn({ err: e?.message }, 'evidence_get_drift_failed');
  }

  // Include model versions and audits for validation comparison
  try {
    const modelId = req.body?.model_id || 'default-model';
    const versions = await listModelVersions(modelId);
    out.model.versions = versions;
    const active = versions.find(v => v.status === 'active');
    const candidate = versions.find(v => v.status === 'ready_for_promote');
    out.validation_comparison = {
      active_version: active?.version || null,
      candidate_version: candidate?.version || null,
      active_overall: active?.validation_report?.overall_score || null,
      candidate_overall: candidate?.validation_report?.overall_score || null,
    };
    const audits = await listAudits({ modelId });
    out.logs = audits.slice(0, 100); // include recent 100 audit events
  } catch (e) {
    logger.warn({ err: e?.message }, 'evidence_get_versions_audits_failed');
  }
  return out;
}

function writeJSONBundle(dir, data) {
  const file = path.join(dir, 'case_bundle.json');
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

function tryCreateTarGz(dir) {
  // best-effort tar.gz using optional archiver
  try {
    const archiver = require('archiver');
    const outPath = path.join(dir, 'case_bundle.tar.gz');
    const output = fs.createWriteStream(outPath);
    const archive = archiver('tar', { gzip: true, gzipOptions: { level: 9 } });
    archive.pipe(output);
    // add all files in dir
    archive.glob('**/*', { cwd: dir });
    return new Promise((resolve, reject) => {
      output.on('close', () => resolve(outPath));
      archive.on('error', reject);
      archive.finalize();
    });
  } catch (e) {
    return null;
  }
}

const { authGuard } = require('../middleware/authGuard');
const { requireRole } = require('../middleware/rbac');

// Only admins may export evidence bundles
router.post('/v1/alerts/:id/export', authGuard, requireRole('admin'), async (req, res) => {
  const alertId = req.params.id;
  try {
    ensureDir(BASE_DIR);
    const dir = path.join(BASE_DIR, `${alertId}-${Date.now()}`);
    ensureDir(dir);
    const data = await collectData(alertId, req);
    const jsonPath = writeJSONBundle(dir, data);

    let bundlePath = jsonPath;
    const maybeTar = await tryCreateTarGz(dir);
    if (maybeTar) {
      bundlePath = maybeTar;
    }

    const buf = fs.readFileSync(bundlePath);
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    const { size } = fs.statSync(bundlePath);

    const result = { status: 'exported', path: bundlePath, size, sha256, publish: { target: 'none', url: null } };
    // Optional: publishing stubs can be added here (S3, GitHub Releases, GridFS)
    // if (process.env.EVIDENCE_PUBLISH_TARGET === 's3') { ... }
    return res.json(result);
  } catch (e) {
    logger.error({ err: e }, 'evidence_export_failed');
    return res.status(500).json({ error: 'export_failed' });
  }
});

module.exports = router;
