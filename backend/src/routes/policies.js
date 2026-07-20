const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authGuard, requireRole } = require('../middleware/authGuard');
const logger = require('../logger');
const { asyncHandler, validationError, notFoundError } = require('../errorHandler');

let Policy, PolicyEvaluation;

function getModels() {
  if (!Policy) {
    Policy = require('../models/Policy');
    PolicyEvaluation = require('../models/PolicyEvaluation');
  }
  return { Policy, PolicyEvaluation };
}

// CREATE POLICY
router.post(
  '/v1/policies',
  authGuard,
  requireRole('admin'),
  body('name').isString().isLength({ min: 3 }),
  body('rules').isObject(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422);
      throw validationError(errors.array());
    }

    const { Policy } = getModels();
    const { name, description, rules, tags, templates } = req.body;
    const userId = req.headers['x-user'] || req.user?.sub || 'system';

    const policy = new Policy({
      name,
      description,
      rules,
      tags: tags || [],
      templates: templates || [],
      createdBy: userId,
      status: 'draft',
    });

    await policy.save();

    logger.info({ policyId: policy._id, name }, 'policy_created');
    res.status(201).json(policy);
  })
);

// GET ALL POLICIES
router.get(
  '/v1/policies',
  authGuard,
  asyncHandler(async (req, res) => {
    const { Policy } = getModels();
    const { status, tags } = req.query;

    const query = {};
    if (status) query.status = status;
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    const policies = await Policy.find(query).sort({ createdAt: -1 });
    res.json(policies);
  })
);

// GET POLICY BY ID
router.get(
  '/v1/policies/:id',
  authGuard,
  asyncHandler(async (req, res) => {
    const { Policy } = getModels();
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      res.status(404);
      throw notFoundError('Policy');
    }

    res.json(policy);
  })
);

// UPDATE POLICY (creates new version)
router.put(
  '/v1/policies/:id',
  authGuard,
  requireRole('admin'),
  body('rules').optional().isObject(),
  asyncHandler(async (req, res) => {
    const { Policy } = getModels();
    const { rules, description, status, tags, templates, changeLog } = req.body;
    const userId = req.headers['x-user'] || req.user?.sub || 'system';

    const policy = await Policy.findById(req.params.id);
    if (!policy) {
      res.status(404);
      throw notFoundError('Policy');
    }

    // Save version history in metadata
    if (rules && (!policy.metadata)) {
      policy.metadata = { versions: [] };
    }
    if (rules && policy.metadata) {
      policy.metadata.versions = policy.metadata.versions || [];
      policy.metadata.versions.push({
        version: policy.version,
        rules: policy.rules,
        timestamp: new Date(),
        createdBy: userId,
        changeLog,
      });

      policy.version = policy.version + 1;
      policy.rules = rules;
    }

    if (description) policy.description = description;
    if (status) {
      policy.status = status;
      if (status === 'active') policy.activatedAt = new Date();
      if (status === 'archived') policy.archivedAt = new Date();
    }
    if (tags) policy.tags = tags;
    if (templates) policy.templates = templates;
    policy.updatedBy = userId;

    await policy.save();

    logger.info({ policyId: policy._id, newVersion: policy.version }, 'policy_updated');
    res.json(policy);
  })
);

// DELETE POLICY
router.delete(
  '/v1/policies/:id',
  authGuard,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { Policy } = getModels();
    const policy = await Policy.findByIdAndDelete(req.params.id);

    if (!policy) {
      res.status(404);
      throw notFoundError('Policy');
    }

    logger.info({ policyId: policy._id }, 'policy_deleted');
    res.json({ success: true });
  })
);

// EVALUATE POLICY (what-if analysis)
router.post(
  '/v1/policies/:id/evaluate',
  authGuard,
  body('modelId').optional().isString(),
  body('reportId').optional().isString(),
  body('metrics').optional().isObject(),
  body('whatIfScenario').optional().isObject(),
  asyncHandler(async (req, res) => {
    const { Policy, PolicyEvaluation } = getModels();
    const { modelId, reportId, metrics, whatIfScenario } = req.body;
    const userId = req.headers['x-user'] || req.user?.sub || 'system';

    const policy = await Policy.findById(req.params.id);
    if (!policy) {
      res.status(404);
      throw notFoundError('Policy');
    }

    const isWhatIf = !!whatIfScenario;
    const metricsToCheck = whatIfScenario?.metrics || metrics || {};

    // Evaluate rules against metrics
    const violations = [];
    const results = { passed: true, violations: [], score: 100 };

    // Check fairness metrics
    const fairnessRules = policy.rules.fairness_metrics || {};
    Object.entries(fairnessRules).forEach(([metric, bounds]) => {
      if (!bounds || !metricsToCheck[metric]) return;

      const value = parseFloat(metricsToCheck[metric]);
      if (bounds.min !== undefined && value < bounds.min) {
        violations.push({
          metric,
          expected: `>= ${bounds.min}`,
          actual: value.toFixed(4),
          severity: 'high',
        });
        results.score -= 15;
      }
      if (bounds.max !== undefined && value > bounds.max) {
        violations.push({
          metric,
          expected: `<= ${bounds.max}`,
          actual: value.toFixed(4),
          severity: 'high',
        });
        results.score -= 15;
      }
    });

    results.passed = violations.length === 0;
    results.violations = violations;
    results.score = Math.max(0, results.score);

    // Generate recommendations
    if (!results.passed) {
      results.recommendations = [
        'Review model training data for bias',
        'Consider additional data collection for underrepresented groups',
        'Implement fairness constraints in model training',
        'Schedule model retraining with bias mitigation',
      ];
    }

    // Determine enforcement action
    let enforcementAction = 'none';
    if (!results.passed) {
      const thresholds = policy.rules.thresholds || {};
      if (results.score < thresholds.fairness_score_min) {
        enforcementAction = policy.rules.enforcement?.block_deployment ? 'deployment_blocked' : 'alert';
        if (policy.rules.enforcement?.require_review) {
          enforcementAction = 'review_required';
        }
      }
    }

    const evaluation = new PolicyEvaluation({
      policyId: policy._id,
      modelId,
      reportId,
      userId,
      results,
      simulationType: isWhatIf ? 'what-if' : 'actual',
      whatIfScenario: isWhatIf ? whatIfScenario : undefined,
      enforcementAction,
    });

    await evaluation.save();

    logger.info(
      { policyId: policy._id, passed: results.passed, enforcementAction },
      'policy_evaluated'
    );

    res.json({
      policyId: policy._id,
      evaluationId: evaluation._id,
      results,
      enforcementAction,
      simulationType: evaluation.simulationType,
    });
  })
);

// GET POLICY EVALUATION HISTORY
router.get(
  '/v1/policies/:id/evaluations',
  authGuard,
  asyncHandler(async (req, res) => {
    const { PolicyEvaluation } = getModels();
    const { limit = 50, offset = 0, modelId } = req.query;

    const query = { policyId: req.params.id };
    if (modelId) query.modelId = modelId;

    const evaluations = await PolicyEvaluation.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await PolicyEvaluation.countDocuments(query);

    res.json({ total, evaluations });
  })
);

// GET POLICY VERSIONS
router.get(
  '/v1/policies/:id/versions',
  authGuard,
  asyncHandler(async (req, res) => {
    const { Policy } = getModels();
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      res.status(404);
      throw notFoundError('Policy');
    }

    const versions = (policy.metadata?.versions || []).sort((a, b) => b.version - a.version);
    res.json(versions);
  })
);

// ROLLBACK TO VERSION
router.post(
  '/v1/policies/:id/rollback/:version',
  authGuard,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { Policy } = getModels();
    const userId = req.headers['x-user'] || req.user?.sub || 'system';
    const targetVersionNum = parseInt(req.params.version);

    const policy = await Policy.findById(req.params.id);
    if (!policy) {
      res.status(404);
      throw notFoundError('Policy');
    }

    const targetVersion = policy.metadata?.versions?.find((v) => v.version === targetVersionNum);
    if (!targetVersion) {
      res.status(404);
      throw notFoundError('Policy version');
    }

    // Save current as version history
    if (!policy.metadata) {
      policy.metadata = { versions: [] };
    }
    policy.metadata.versions.push({
      version: policy.version,
      rules: policy.rules,
      timestamp: new Date(),
      createdBy: userId,
      changeLog: `Rolled back from v${policy.version} to v${targetVersionNum}`,
    });

    // Apply rollback
    policy.rules = targetVersion.rules;
    policy.version = policy.version + 1;
    policy.updatedBy = userId;
    await policy.save();

    logger.info(
      { policyId: policy._id, rolledBackTo: targetVersionNum, newVersion: policy.version },
      'policy_rolled_back'
    );

    res.json(policy);
  })
);

// ACTIVATE POLICY
router.post(
  '/v1/policies/:id/activate',
  authGuard,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { Policy } = getModels();
    const userId = req.headers['x-user'] || req.user?.sub || 'system';

    // Deactivate all other policies (only one active at a time)
    await Policy.updateMany({ status: 'active' }, { status: 'draft' });

    const policy = await Policy.findByIdAndUpdate(
      req.params.id,
      { status: 'active', activatedAt: new Date(), updatedBy: userId },
      { new: true }
    );

    if (!policy) {
      res.status(404);
      throw notFoundError('Policy');
    }

    logger.info({ policyId: policy._id }, 'policy_activated');
    res.json(policy);
  })
);

// ARCHIVE POLICY
router.post(
  '/v1/policies/:id/archive',
  authGuard,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { Policy } = getModels();
    const userId = req.headers['x-user'] || req.user?.sub || 'system';

    const policy = await Policy.findByIdAndUpdate(
      req.params.id,
      { status: 'archived', archivedAt: new Date(), updatedBy: userId },
      { new: true }
    );

    if (!policy) {
      res.status(404);
      throw notFoundError('Policy');
    }

    logger.info({ policyId: policy._id }, 'policy_archived');
    res.json(policy);
  })
);

module.exports = router;
