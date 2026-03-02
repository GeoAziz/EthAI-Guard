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
} = require('../storage/models');
const { startRetrain } = require('../jobs/retrain');
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
    
    // Kick off worker asynchronously
    setImmediate(() => {
      const { startRetrainWithId } = require('../jobs/retrain');
      startRetrainWithId(modelId, payload, created.requestId, actor)
        .catch(e => logger.error({ err: e?.message }, 'retrain_async_failed'));
    });
    
    res.status(202).json({ 
      status: 'queued', 
      requestId: created.requestId 
    });
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
