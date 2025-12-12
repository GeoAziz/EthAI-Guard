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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const modelId = req.params.id;
    const actor = req.headers['x-user'] || 'system';
    try {
      const payload = {
        reason: req.body.reason,
        baseline_snapshot_id: req.body.baseline_snapshot_id,
        notes: req.body.notes,
      };
      const created = await createRetrainRequest(modelId, payload);
      await writeAudit('retrain_requested', { reason: payload.reason }, actor, modelId, created.requestId);
      // kick off worker asynchronously
      setImmediate(() => {
        const { startRetrainWithId } = require('../jobs/retrain');
        startRetrainWithId(modelId, payload, created.requestId, actor).catch(e => logger.error({ err: e?.message }, 'retrain_async_failed'));
      });
      return res.json({ status: 'queued', requestId: created.requestId });
    } catch (e) {
      logger.error({ err: e }, 'trigger_retrain_failed');
      return res.status(500).json({ error: 'Failed to trigger retrain' });
    }
  },
);

// Retrain status (admin only)
router.get('/v1/retrain/:requestId', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const doc = await getRetrainRequest(req.params.requestId);
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }
    return res.json(doc);
  } catch (e) {
    return res.status(500).json({ error: 'status_failed' });
  }
});

// List model versions (auth required)
router.get('/v1/models/:id/versions', authGuard, async (req, res) => {
  try {
    const arr = await listModelVersions(req.params.id);
    return res.json(arr);
  } catch (e) {
    return res.status(500).json({ error: 'list_versions_failed' });
  }
});

// Promote model (admin only)
router.post(
  '/v1/models/:id/promote',
  authGuard,
  requireRole('admin'),
  body('version').isString().isLength({ min: 1 }),
  body('requestId').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { version, requestId } = req.body;
    const actor = req.headers['x-user'] || 'system';
    try {
      // Gate: must reference a validated retrain request if provided
      if (requestId) {
        const r = await getRetrainRequest(requestId);
        if (!r) {
          return res.status(400).json({ error: 'invalid_request' });
        }
        if (r.status !== 'validated_pass') {
          return res.status(400).json({ error: 'not_validated' });
        }
      }
      const promoted = await promoteModel(req.params.id, version, (requestId ? (await getRetrainRequest(requestId))?.artifacts?.validation_report : {}), actor);
      if (!promoted) {
        return res.status(404).json({ error: 'version_not_found' });
      }
      await writeAudit('model_promoted', { version }, actor, req.params.id, requestId || null);
      return res.json({ status: 'promoted', version: promoted.version });
    } catch (e) {
      logger.error({ err: e }, 'promote_failed');
      return res.status(500).json({ error: 'promote_failed' });
    }
  },
);

module.exports = router;
