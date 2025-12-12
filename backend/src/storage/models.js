const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

const USE_IN_MEMORY = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === '1';

// In-memory stores
const _retrain = [];
const _versions = [];
const _audits = [];

// Schemas
let RetrainRequestModel, ModelVersionModel, AuditLogModel;

if (!USE_IN_MEMORY) {
  try {
    const RetrainRequestSchema = new mongoose.Schema({
      requestId: { type: String, index: true, unique: true },
      modelId: { type: String, index: true },
      reason: { type: String },
      baseline_snapshot_id: { type: String },
      notes: { type: String },
      status: { type: String, index: true }, // queued, preparing, training, validating, failed, validated_pass, ready_for_promote, promoted
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      artifacts: { type: Object, default: {} },
      history: { type: Array, default: [] },
    }, { minimize: false });
    RetrainRequestModel = mongoose.models.RetrainRequest || mongoose.model('RetrainRequest', RetrainRequestSchema);

    const ModelVersionSchema = new mongoose.Schema({
      modelId: { type: String, index: true },
      version: { type: String },
      status: { type: String, default: 'archived' }, // active, archived, ready_for_promote
      metadata: { type: Object, default: {} },
      validation_report: { type: Object, default: {} },
      promotedBy: { type: String },
      createdAt: { type: Date, default: Date.now },
      promotedAt: { type: Date },
    }, { minimize: false });
    ModelVersionModel = mongoose.models.ModelVersion || mongoose.model('ModelVersion', ModelVersionSchema);

    const AuditLogSchema = new mongoose.Schema({
      event: { type: String, index: true },
      actor: { type: String },
      modelId: { type: String },
      requestId: { type: String },
      details: { type: Object, default: {} },
      createdAt: { type: Date, default: Date.now },
    }, { minimize: false });
    AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
  } catch (e) {
    logger.error({ err: e }, 'models_schema_init_failed');
  }
}

function nowIso() {
  return new Date().toISOString();
}

async function createRetrainRequest(modelId, payload) {
  const requestId = uuidv4();
  const doc = {
    requestId,
    modelId,
    reason: payload.reason,
    baseline_snapshot_id: payload.baseline_snapshot_id || null,
    notes: payload.notes || '',
    status: 'queued',
    createdAt: new Date(),
    updatedAt: new Date(),
    artifacts: {},
    history: [{ ts: nowIso(), status: 'queued' }],
  };
  if (USE_IN_MEMORY || !RetrainRequestModel) {
    _retrain.push(doc);
    return doc;
  }
  const created = await RetrainRequestModel.create(doc);
  return created.toObject();
}

async function getRetrainRequest(requestId) {
  if (USE_IN_MEMORY || !RetrainRequestModel) {
    return _retrain.find(r => r.requestId === requestId) || null;
  }
  const found = await RetrainRequestModel.findOne({ requestId });
  return found ? found.toObject() : null;
}

async function updateRetrainRequestStatus(requestId, status, extra = {}) {
  if (USE_IN_MEMORY || !RetrainRequestModel) {
    const r = _retrain.find(x => x.requestId === requestId);
    if (!r) {
      return null;
    }
    r.status = status;
    r.updatedAt = new Date();
    Object.assign(r.artifacts, extra.artifacts || {});
    r.history.push({ ts: nowIso(), status, note: extra.note });
    return r;
  }
  const upd = await RetrainRequestModel.findOneAndUpdate(
    { requestId },
    { $set: { status, updatedAt: new Date() }, $push: { history: { ts: nowIso(), status, note: extra.note } }, $setOnInsert: {} },
    { new: true },
  );
  if (extra.artifacts) {
    await RetrainRequestModel.updateOne({ requestId }, { $set: { artifacts: extra.artifacts } });
  }
  return upd ? upd.toObject() : null;
}

async function createModelVersion(modelId, version, metadata = {}) {
  const doc = { modelId, version, status: 'ready_for_promote', metadata, createdAt: new Date() };
  if (USE_IN_MEMORY || !ModelVersionModel) {
    _versions.push(doc);
    return doc;
  }
  const created = await ModelVersionModel.create(doc);
  return created.toObject();
}

async function listModelVersions(modelId) {
  if (USE_IN_MEMORY || !ModelVersionModel) {
    return _versions.filter(v => v.modelId === modelId);
  }
  const arr = await ModelVersionModel.find({ modelId }).sort({ createdAt: -1 });
  return arr.map(x => x.toObject());
}

async function promoteModel(modelId, version, validation_report, promotedBy) {
  if (USE_IN_MEMORY || !ModelVersionModel) {
    for (const v of _versions) {
      if (v.modelId === modelId) {
        v.status = 'archived';
      }
    }
    const target = _versions.find(v => v.modelId === modelId && v.version === version);
    if (!target) {
      return null;
    }
    target.status = 'active';
    target.validation_report = validation_report;
    target.promotedBy = promotedBy || 'system';
    target.promotedAt = new Date();
    return target;
  }
  await ModelVersionModel.updateMany({ modelId }, { $set: { status: 'archived' } });
  const upd = await ModelVersionModel.findOneAndUpdate(
    { modelId, version },
    { $set: { status: 'active', validation_report, promotedBy, promotedAt: new Date() } },
    { new: true },
  );
  return upd ? upd.toObject() : null;
}

async function writeAudit(event, details = {}, actor = 'system', modelId = null, requestId = null) {
  const doc = { event, details, actor, modelId, requestId, createdAt: new Date() };
  if (USE_IN_MEMORY || !AuditLogModel) {
    _audits.push(doc);
    return doc;
  }
  const created = await AuditLogModel.create(doc);
  return created.toObject();
}

async function listAudits(filter = {}) {
  if (USE_IN_MEMORY || !AuditLogModel) {
    return _audits.filter(a => {
      if (filter.modelId && a.modelId !== filter.modelId) {
        return false;
      }
      if (filter.requestId && a.requestId !== filter.requestId) {
        return false;
      }
      return true;
    });
  }
  const q = {};
  if (filter.modelId) {
    q.modelId = filter.modelId;
  }
  if (filter.requestId) {
    q.requestId = filter.requestId;
  }
  const arr = await AuditLogModel.find(q).sort({ createdAt: -1 });
  return arr.map(x => x.toObject());
}

module.exports = {
  createRetrainRequest,
  getRetrainRequest,
  updateRetrainRequestStatus,
  createModelVersion,
  listModelVersions,
  promoteModel,
  writeAudit,
  listAudits,
};
