const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { authGuard } = require('../middleware/authGuard');
const { requireRole } = require('../middleware/rbac');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');
const {
  createRetrainRequest,
  getRetrainRequest,
  updateRetrainRequestStatus,
  listModelVersions,
  promoteModel,
  writeAudit,
  getRetrainMetrics,
  listRetrainRequestsByModel,
} = require('../storage/models');
const { triggerRetrain, completeExternalRetrain } = require('../jobs/retrain');
const { asyncHandler, validationError, notFoundError } = require('../errorHandler');

// Conditional auth: use Firebase when configured; else local JWT
// authGuard and rbac.requireRole are used for authentication and authorization

// Trigger retrain (admin only)
router.post(
  '/v1/models/:id/trigger-retrain',
  authGuard,
  requireRole('admin'),
  body('reason').isString().isLength({ min: 3 }),
  body('baseline_snapshot_id').optional().isString(),
  body('notes').optional().isString(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422);
      throw validationError(errors.array());
    }

    const modelId = req.params.id;
    const actor = req.headers['x-user'] || 'system';
    
    const payload = {
      reason: req.body.reason,
      baseline_snapshot_id: req.body.baseline_snapshot_id,
      notes: req.body.notes,
    };
    
    const created = await createRetrainRequest(modelId, payload);
    await writeAudit('retrain_requested', { reason: payload.reason }, actor, modelId, created.requestId);

    // Kick off worker asynchronously (GitHub Actions if configured, else local simulated pipeline)
    setImmediate(() => {
      triggerRetrain(modelId, payload, created.requestId, actor)
        .catch(e => logger.error({ err: e?.message }, 'retrain_async_failed'));
    });

    res.status(202).json({
      status: 'queued',
      requestId: created.requestId
    });
  }),
);

// External runner (e.g. GitHub Actions workflow) reports completion + performance metrics.
// Authenticated with a shared secret rather than a user token since the caller is CI, not a user.
router.post(
  '/v1/retrain/:requestId/complete',
  body('status').optional().isString(),
  body('performance_metrics').optional().isObject(),
  asyncHandler(async (req, res) => {
    const secret = process.env.RETRAIN_CALLBACK_SECRET;
    if (secret && req.headers['x-retrain-secret'] !== secret) {
      res.status(401);
      throw new Error('unauthorized');
    }
    const updated = await completeExternalRetrain(req.params.requestId, req.body || {});
    if (!updated) {
      res.status(404);
      throw notFoundError('Retrain request');
    }
    res.json({ status: 'ok', requestId: req.params.requestId });
  }),
);

// Performance metrics for a completed retrain request (admin only)
router.get(
  '/v1/retrain/:requestId/performance',
  authGuard,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const metrics = await getRetrainMetrics(req.params.requestId);
    if (!metrics) {
      res.status(404);
      throw notFoundError('Performance metrics');
    }
    res.json({ requestId: req.params.requestId, metrics: metrics.metrics, recordedAt: metrics.recordedAt });
  }),
);

// Retrain history for a model, enriched with performance metrics (admin only)
router.get(
  '/v1/models/:id/retrain-history',
  authGuard,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const requests = await listRetrainRequestsByModel(req.params.id, limit);
    const enriched = await Promise.all(requests.map(async (r) => ({
      ...r,
      performance_metrics: (await getRetrainMetrics(r.requestId))?.metrics || null,
    })));
    res.json({ model_id: req.params.id, count: enriched.length, retrainHistory: enriched });
  }),
);

// Retrain status (admin only)
router.get('/v1/retrain/:requestId', authGuard, requireRole('admin'), asyncHandler(async (req, res) => {
  const doc = await getRetrainRequest(req.params.requestId);
  if (!doc) {
    res.status(404);
    throw notFoundError('Retrain request');
  }
  res.json(doc);
}));

// List model versions (auth required)
router.get('/v1/models/:id/versions', authGuard, asyncHandler(async (req, res) => {
  const arr = await listModelVersions(req.params.id);
  res.json(arr);
}));

// Promote model (admin only)
router.post(
  '/v1/models/:id/promote',
  authGuard,
  requireRole('admin'),
  body('version').isString().isLength({ min: 1 }),
  body('requestId').optional().isString(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422);
      throw validationError(errors.array());
    }
    
    const { version, requestId } = req.body;
    const actor = req.headers['x-user'] || 'system';
    
    // Gate: must reference a validated retrain request if provided
    if (requestId) {
      const r = await getRetrainRequest(requestId);
      if (!r) {
        res.status(400);
        throw new Error('invalid_request');
      }
      if (r.status !== 'validated_pass') {
        res.status(400);
        throw new Error('not_validated');
      }
    }
    
    const promoted = await promoteModel(req.params.id, version, (requestId ? (await getRetrainRequest(requestId))?.artifacts?.validation_report : {}), actor);
    if (!promoted) {
      res.status(404);
      throw notFoundError('Model version');
    }
    
    await writeAudit('model_promoted', { version }, actor, req.params.id, requestId || null);
    res.status(200).json({ status: 'promoted', version: promoted.version });
  }),
);

module.exports = router;
