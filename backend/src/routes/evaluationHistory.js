const express = require('express');
const router = express.Router();
const { getEvaluations, getEvaluationById } = require('../storage/evaluations');
const logger = require('../logger');
const { authGuard } = require('../middleware/authGuard');

// Conditional auth: use Firebase when configured, else fall back to local JWT
// Use centralized auth guard which supports Firebase or JWT fallback and test-mode bypass

// GET /v1/evaluations - List recent evaluations with filters
router.get('/v1/evaluations', authGuard, async (req, res) => {
  try {
    const { risk_level, model_id, limit, offset } = req.query;
    const user_id = req.user?.sub || req.userId; // Firebase UID or internal user ID

    const filters = {
      user_id, // Always filter by requesting user
      risk_level,
      model_id,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
    };

    const evaluations = await getEvaluations(filters);
    logger.info({ route: '/v1/evaluations', user_id, count: evaluations.length }, 'evaluations_listed');
    return res.json({ evaluations, count: evaluations.length });
  } catch (e) {
    logger.error({ err: e }, 'list_evaluations_failed');
    return res.status(500).json({ error: 'list_evaluations_failed' });
  }
});

// GET /v1/evaluations/:id - Get single evaluation details
router.get('/v1/evaluations/:id', authGuard, async (req, res) => {
  try {
    const evaluation_id = req.params.id;
    const user_id = req.user?.sub || req.userId;

    const evaluation = await getEvaluationById(evaluation_id);
    if (!evaluation) {
      return res.status(404).json({ error: 'evaluation_not_found' });
    }

    // Authorization check: user can only see their own evaluations
    if (evaluation.user_id !== user_id) {
      logger.warn({ evaluation_id, user_id, owner: evaluation.user_id }, 'unauthorized_access_attempt');
      return res.status(403).json({ error: 'forbidden' });
    }

    logger.info({ route: `/v1/evaluations/${evaluation_id}`, user_id }, 'evaluation_retrieved');
    return res.json(evaluation);
  } catch (e) {
    logger.error({ err: e, evaluation_id: req.params.id }, 'get_evaluation_failed');
    return res.status(500).json({ error: 'get_evaluation_failed' });
  }
});

module.exports = router;
