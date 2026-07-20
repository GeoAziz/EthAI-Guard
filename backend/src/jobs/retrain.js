const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');
const {
  createRetrainRequest,
  getRetrainRequest,
  updateRetrainRequestStatus,
  createModelVersion,
  writeAudit,
  recordRetrainMetrics,
} = require('../storage/models');

const BASE_DIR = process.env.RETRAIN_DIR || path.join(process.cwd(), 'tmp', 'retrain');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function makeDataset(requestId) {
  const dir = path.join(BASE_DIR, requestId);
  ensureDir(dir);
  const file = path.join(dir, 'training_data_v1.jsonl');
  const rows = [];
  for (let i = 0; i < 500; i++) {
    rows.push(JSON.stringify({
      features: { income: Math.floor(Math.random() * 100000), credit_score: 500 + Math.floor(Math.random() * 350) },
      target: i % 2,
    }));
  }
  fs.writeFileSync(file, rows.join('\n'));
  return { dir, datasetPath: file };
}

function simulateTraining(datasetPath) {
  const version = `v${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12)}`;
  const model = { version, trained_on: path.basename(datasetPath), created_at: new Date().toISOString(), params: { type: 'demo' } };
  return model;
}

async function runValidation(modelName, modelVersion) {
  const url = `${process.env.AI_CORE_URL || 'http://ai-core:8000'}/validation/validate-model`;
  try {
    const resp = await axios.post(url, {
      model_name: modelName,
      model_version: modelVersion,
      include_html_report: false,
      include_edge_cases: true,
      include_stability_test: true,
      num_synthetic_cases: 200,
    }, { timeout: 60_000 });
    return { ok: true, report: resp.data };
  } catch (e) {
    logger.error({ err: e?.message }, 'retrain_validation_failed');
    return { ok: false, error: e?.message };
  }
}

async function startRetrainWithId(modelId, payload, requestId, actor = 'system') {
  const req = { requestId };
  await writeAudit('retrain_triggered', { reason: payload.reason, baseline_snapshot_id: payload.baseline_snapshot_id }, actor, modelId, requestId);

  // Stage: preparing
  await updateRetrainRequestStatus(requestId, 'preparing', { note: 'Preparing dataset' });
  const { dir, datasetPath } = makeDataset(requestId);

  // Stage: training
  await updateRetrainRequestStatus(requestId, 'training', { note: 'Training started' });
  const model = simulateTraining(datasetPath);
  const modelMetaPath = path.join(dir, 'model.json');
  fs.writeFileSync(modelMetaPath, JSON.stringify(model, null, 2));

  // Stage: validating
  await updateRetrainRequestStatus(requestId, 'validating', { note: 'Running automated validation' });
  const val = await runValidation(`model_${modelId}`, model.version);
  if (!val.ok) {
    await updateRetrainRequestStatus(requestId, 'failed', { note: 'Validation failed', artifacts: { error: val.error } });
    await writeAudit('retrain_failed', { error: val.error }, actor, modelId, requestId);
    return { requestId, result: 'failed' };
  }

  // Create model version
  const mv = await createModelVersion(modelId, model.version, { artifacts_dir: dir });
  const artifacts = { dataset: datasetPath, model_meta: modelMetaPath, validation_report: val.report };
  await updateRetrainRequestStatus(requestId, 'validated_pass', { note: 'Validation passed', artifacts });
  await writeAudit('retrain_validated', { version: model.version }, actor, modelId, requestId);

  return { requestId, result: 'validated_pass', version: mv.version };
}
async function startRetrain(modelId, payload, actor = 'system') {
  const req = await createRetrainRequest(modelId, payload);
  await startRetrainWithId(modelId, payload, req.requestId, actor);
  return { requestId: req.requestId };
}

/**
 * Dispatch retraining to the GitHub Actions workflow instead of the local
 * simulated pipeline. Requires GITHUB_ACTIONS_TOKEN; falls back to the local
 * pipeline when not configured so existing (test) behavior is unaffected.
 */
async function dispatchGithubWorkflow(modelId, payload, requestId, actor = 'system') {
  const githubToken = process.env.GITHUB_ACTIONS_TOKEN;
  const githubRepo = process.env.GITHUB_REPOSITORY || 'GeoAziz/EthAI-Guard';
  const [owner, repo] = githubRepo.split('/');
  const workflowFile = process.env.GITHUB_RETRAIN_WORKFLOW || 'model-retrain.yml';

  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  try {
    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`,
      { ref: process.env.GITHUB_RETRAIN_REF || 'main', inputs: { model_id: modelId, request_id: requestId, reason: payload.reason || '' } },
      { headers, timeout: 10_000 },
    );

    // workflow_dispatch has no run id in its response; look up the most
    // recently created run for this workflow that started after our dispatch.
    const dispatchedAt = Date.now();
    const runsResp = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/runs?per_page=5`,
      { headers, timeout: 10_000 },
    );
    const run = (runsResp.data.workflow_runs || [])
      .find(r => Math.abs(new Date(r.created_at).getTime() - dispatchedAt) < 60_000);

    await updateRetrainRequestStatus(requestId, 'running', {
      note: 'GitHub Actions workflow dispatched',
      artifacts: { workflow_url: run ? run.html_url : null, workflow_run_id: run ? run.id : null },
    });
    await writeAudit('retrain_dispatched_github', { requestId, runId: run ? run.id : null }, actor, modelId, requestId);
    return { requestId, result: 'dispatched', workflow_run_id: run ? run.id : null };
  } catch (e) {
    logger.warn({ err: e?.message, requestId, modelId }, 'github_workflow_dispatch_failed');
    await updateRetrainRequestStatus(requestId, 'queued_local', {
      note: 'GitHub dispatch failed; queued for local processing',
      artifacts: { github_dispatch_error: e?.message },
    });
    return startRetrainWithId(modelId, payload, requestId, actor);
  }
}

/**
 * Single entry point routes callers use to kick off retraining, choosing
 * between the GitHub-Actions-backed pipeline and the local simulated one.
 */
async function triggerRetrain(modelId, payload, requestId, actor = 'system') {
  if (process.env.GITHUB_ACTIONS_TOKEN) {
    return dispatchGithubWorkflow(modelId, payload, requestId, actor);
  }
  return startRetrainWithId(modelId, payload, requestId, actor);
}

/**
 * Callback for external runners (e.g. the GitHub Actions workflow itself)
 * to report completion and performance metrics back to the backend.
 */
async function completeExternalRetrain(requestId, { status, performance_metrics, workflow_url } = {}) {
  const req = await getRetrainRequest(requestId);
  if (!req) {
    return null;
  }
  await updateRetrainRequestStatus(requestId, status || 'validated_pass', {
    note: 'External retrain runner reported completion',
    artifacts: { ...(req.artifacts || {}), workflow_url: workflow_url || req.artifacts?.workflow_url, performance_metrics },
  });
  if (performance_metrics) {
    await recordRetrainMetrics(requestId, req.modelId, performance_metrics);
  }
  await writeAudit('retrain_completed_external', { status, performance_metrics }, 'system', req.modelId, requestId);
  return getRetrainRequest(requestId);
}

module.exports = { startRetrain, startRetrainWithId, triggerRetrain, dispatchGithubWorkflow, completeExternalRetrain };
