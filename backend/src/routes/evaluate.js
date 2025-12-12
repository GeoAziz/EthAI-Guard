const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { simulate } = require('../simulation/engine');
const { runRules } = require('../rules/engine');
const { computeRisk } = require('../risk/scoring');
const { generateExplanation } = require('../explainability/generator');
const promClient = require('prom-client');
const logger = require('../logger');
const { saveEvaluation } = require('../storage/evaluations');

// Metrics counters (register only once)
let evalCounter = promClient.register.getSingleMetric('evaluations_total');
if (!evalCounter) {
  evalCounter = new promClient.Counter({ name: 'evaluations_total', help: 'Total evaluation requests' });
  promClient.register.registerMetric(evalCounter);
}
let highRiskCounter = promClient.register.getSingleMetric('evaluations_high_risk_total');
if (!highRiskCounter) {
  highRiskCounter = new promClient.Counter({ name: 'evaluations_high_risk_total', help: 'High risk evaluation count' });
  promClient.register.registerMetric(highRiskCounter);
}

const validationChain = [
  body('user_id').isString().isLength({ min: 1, max: 128 }),
  body('model_id').isString().isLength({ min: 1, max: 128 }),
  body('input_features').isObject(),
  body('context').optional().isObject(),
  body('decision_timestamp').optional().isISO8601(),
];

const { authGuard } = require('../middleware/authGuard');

router.post('/v1/evaluate', authGuard, validationChain, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'validation_failed', details: errors.array() });
  }

  try {
    const { user_id, model_id, input_features, context = {}, decision_timestamp } = req.body;
    const augmentedContext = { ...context, user_id, model_id, decision_timestamp: decision_timestamp || new Date().toISOString() };

    // 1. Simulation
    const simulation = simulate(model_id, input_features);

    // 2. Rules
    const rules = runRules(simulation, input_features, augmentedContext);

    // 3. Risk scoring
    const risk = computeRisk(simulation, rules);

    // 4. Explanation
    const explanation = generateExplanation(risk, rules, simulation);

    // Metrics & logging
    evalCounter.inc();
    if (risk.level === 'high') {
      highRiskCounter.inc();
    }
    logger.info({ route: '/v1/evaluate', user_id, model_id, risk_score: risk.score, risk_level: risk.level }, 'evaluation_completed');

    // 5. Package response
    const response = {
      request_id: req.request_id,
      timestamp: new Date().toISOString(),
      user_id,
      model_id,
      input_features,
      simulation,
      rules,
      risk,
      explanation,
      context: augmentedContext,
    };

    // 6. Persist to Firestore (non-blocking, graceful failure)
    const storage_id = await saveEvaluation(response);
    if (storage_id) {
      response.storage_id = storage_id;
    }

    return res.json(response);
  } catch (e) {
    logger.error({ err: e }, 'evaluation_failed');
    return res.status(500).json({ error: 'evaluation_failed', message: 'Internal evaluation error' });
  }
});

module.exports = router;
