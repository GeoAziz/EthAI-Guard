const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');
const {
  createRetrainRequest,
  updateRetrainRequestStatus,
  createModelVersion,
  writeAudit,
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

module.exports = { startRetrain, startRetrainWithId };
