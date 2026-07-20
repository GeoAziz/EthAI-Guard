const express = require('express');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const logger = require('../logger');
const { authGuard, requireRole } = require('../middleware/authGuard');

const router = express.Router();
const AI_CORE_URL = process.env.AI_CORE_URL || 'http://localhost:8100';
// ai_core's /federated/* routes require this shared token (see
// ai_core/routers/federated.py#verify_service_token) since they can
// register nodes and submit data into cross-tenant aggregation.
const AI_CORE_AUTH_HEADERS = process.env.AI_CORE_SERVICE_TOKEN
  ? { 'X-Service-Token': process.env.AI_CORE_SERVICE_TOKEN }
  : {};

// Load models
let FederatedNode, FederatedAggregation;
async function loadModels() {
  if (!FederatedNode) {
    FederatedNode = require('../models/FederatedNode');
  }
  if (!FederatedAggregation) {
    FederatedAggregation = require('../models/FederatedAggregation');
  }
}

/**
 * Register a new federated node
 * POST /federated/register-node
 */
router.post('/register-node', authGuard, async (req, res) => {
  try {
    await loadModels();

    const { nodeId, nodeName, nodeType, endpoint, location } = req.body;
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId || userId;

    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId is required' });
    }

    // Register with AI Core
    try {
      await axios.post(`${AI_CORE_URL}/federated/register-node`, { node_id: nodeId }, { headers: AI_CORE_AUTH_HEADERS });
    } catch (err) {
      logger.warn({ nodeId, error: err.message }, 'ai_core_registration_failed');
      // Continue - node may already be registered
    }

    // Store in database
    const node = await FederatedNode.updateOne(
      { tenantId, nodeId },
      {
        nodeId,
        tenantId,
        nodeName: nodeName || nodeId,
        nodeType: nodeType || 'edge',
        endpoint: endpoint || `http://${nodeId}:8100`,
        location: location || {},
        lastHeartbeat: new Date(),
        verificationStatus: 'pending',
      },
      { upsert: true, new: true }
    );

    return res.json({
      nodeId,
      status: 'registered',
      message: `Node ${nodeId} registered successfully`,
    });
  } catch (err) {
    logger.error({ error: err.message }, 'register_node_failed');
    return res.status(500).json({ error: 'Failed to register node' });
  }
});

/**
 * List all federated nodes for a tenant
 * GET /federated/nodes
 */
router.get('/nodes', authGuard, async (req, res) => {
  try {
    await loadModels();

    const tenantId = req.user?.tenantId || req.user?.uid;
    const nodes = await FederatedNode.find({ tenantId }).lean();

    return res.json({
      nodes,
      count: nodes.length,
    });
  } catch (err) {
    logger.error({ error: err.message }, 'list_nodes_failed');
    return res.status(500).json({ error: 'Failed to list nodes' });
  }
});

/**
 * Get node status and health
 * GET /federated/nodes/:nodeId
 */
router.get('/nodes/:nodeId', authGuard, async (req, res) => {
  try {
    await loadModels();

    const { nodeId } = req.params;
    const tenantId = req.user?.tenantId || req.user?.uid;

    const node = await FederatedNode.findOne({ tenantId, nodeId }).lean();
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Get status from AI Core
    let aiCoreStatus = null;
    try {
      const response = await axios.get(`${AI_CORE_URL}/federated/node-status/${nodeId}`, {
        timeout: 5000,
        headers: AI_CORE_AUTH_HEADERS,
      });
      aiCoreStatus = response.data;
    } catch (err) {
      logger.warn({ nodeId, error: err.message }, 'ai_core_status_check_failed');
    }

    return res.json({
      node,
      aiCoreStatus,
    });
  } catch (err) {
    logger.error({ error: err.message }, 'get_node_status_failed');
    return res.status(500).json({ error: 'Failed to get node status' });
  }
});

/**
 * Update node configuration
 * PUT /federated/nodes/:nodeId
 */
router.put('/nodes/:nodeId', authGuard, requireRole('admin'), async (req, res) => {
  try {
    await loadModels();

    const { nodeId } = req.params;
    const tenantId = req.user?.tenantId || req.user?.uid;
    const updates = req.body;

    // Filter allowed fields
    const allowedFields = [
      'nodeName',
      'endpoint',
      'location',
      'epsilonBudget',
      'protectedAttributes',
    ];
    const filteredUpdates = {};
    allowedFields.forEach((field) => {
      if (field in updates) {
        filteredUpdates[field] = updates[field];
      }
    });

    const updated = await FederatedNode.findOneAndUpdate(
      { tenantId, nodeId },
      { ...filteredUpdates, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: 'Node not found' });
    }

    return res.json(updated);
  } catch (err) {
    logger.error({ error: err.message }, 'update_node_failed');
    return res.status(500).json({ error: 'Failed to update node' });
  }
});

/**
 * Trigger fairness aggregation from multiple nodes
 * POST /federated/aggregate
 */
router.post('/aggregate', authGuard, async (req, res) => {
  try {
    await loadModels();

    const { nodeMetrics, aggregationMethod = 'weighted_average', weights, byzantineNodes = 0 } = req.body;
    const tenantId = req.user?.tenantId || req.user?.uid;

    if (!nodeMetrics || Object.keys(nodeMetrics).length === 0) {
      return res.status(400).json({ error: 'nodeMetrics is required' });
    }

    // Call AI Core aggregation
    let aggregated, confidenceScores;
    try {
      const response = await axios.post(`${AI_CORE_URL}/federated/aggregate-metrics`, {
        node_metrics: nodeMetrics,
        aggregation_method: aggregationMethod,
        weights: weights || {},
        byzantine_nodes: byzantineNodes,
      }, { headers: AI_CORE_AUTH_HEADERS });
      aggregated = response.data.aggregated_metrics;
      confidenceScores = response.data.confidence_scores;
    } catch (err) {
      logger.error({ error: err.message }, 'ai_core_aggregation_failed');
      return res.status(500).json({ error: 'AI Core aggregation failed' });
    }

    // Detect violations
    const violations = [];
    const thresholds = {
      demographic_parity_difference: 0.1,
      equal_opportunity_difference: 0.1,
      equalized_odds_difference: 0.1,
      average_absolute_odds_difference: 0.1,
    };

    const ratioFloors = {
      disparate_impact_ratio: 0.8,
    };

    // Check difference metrics
    for (const [metric, threshold] of Object.entries(thresholds)) {
      const value = aggregated[metric];
      if (value !== undefined && Math.abs(value) > threshold) {
        violations.push({
          metricName: metric,
          value: parseFloat(value.toFixed(4)),
          threshold,
          severityLevel: Math.abs(value) > threshold * 2 ? 'high' : 'medium',
        });
      }
    }

    // Check ratio metrics
    for (const [metric, floor] of Object.entries(ratioFloors)) {
      const value = aggregated[metric];
      if (value !== undefined && value < floor) {
        violations.push({
          metricName: metric,
          value: parseFloat(value.toFixed(4)),
          threshold: floor,
          severityLevel: value < floor * 0.8 ? 'high' : 'medium',
        });
      }
    }

    const complianceStatus = violations.length === 0 ? 'compliant' : 'non_compliant';

    // Store aggregation result
    const aggregationId = uuidv4();
    const aggregation = new FederatedAggregation({
      aggregationId,
      tenantId,
      coordinatorId: 'central',
      participatingNodes: Object.keys(nodeMetrics),
      aggregationMethod,
      nodeWeights: weights || {},
      byzantineNodesCount: byzantineNodes,
      aggregatedMetrics: aggregated,
      confidenceScores,
      nodeContributions: nodeMetrics,
      violations,
      complianceStatus,
      integrityVerified: true,
    });

    await aggregation.save();

    return res.json({
      aggregationId,
      aggregatedMetrics: aggregated,
      confidenceScores,
      violations,
      complianceStatus,
      numNodes: Object.keys(nodeMetrics).length,
      aggregationMethod,
    });
  } catch (err) {
    logger.error({ error: err.message }, 'aggregation_failed');
    return res.status(500).json({ error: 'Aggregation failed' });
  }
});

/**
 * Get aggregation results
 * GET /federated/aggregations
 */
router.get('/aggregations', authGuard, async (req, res) => {
  try {
    await loadModels();

    const { limit = 20, offset = 0 } = req.query;
    const tenantId = req.user?.tenantId || req.user?.uid;

    const aggregations = await FederatedAggregation.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await FederatedAggregation.countDocuments({ tenantId });

    return res.json({
      aggregations,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    logger.error({ error: err.message }, 'get_aggregations_failed');
    return res.status(500).json({ error: 'Failed to get aggregations' });
  }
});

/**
 * Get specific aggregation details
 * GET /federated/aggregations/:aggregationId
 */
router.get('/aggregations/:aggregationId', authGuard, async (req, res) => {
  try {
    await loadModels();

    const { aggregationId } = req.params;
    const tenantId = req.user?.tenantId || req.user?.uid;

    const aggregation = await FederatedAggregation.findOne({
      tenantId,
      aggregationId,
    }).lean();

    if (!aggregation) {
      return res.status(404).json({ error: 'Aggregation not found' });
    }

    return res.json(aggregation);
  } catch (err) {
    logger.error({ error: err.message }, 'get_aggregation_details_failed');
    return res.status(500).json({ error: 'Failed to get aggregation details' });
  }
});

/**
 * Validate edge model predictions
 * POST /federated/validate-model
 */
router.post('/validate-model', authGuard, async (req, res) => {
  try {
    const { modelPredictions, trueLabels, protectedAttribute, minConfidence = 0.8 } = req.body;

    if (!modelPredictions || !trueLabels || !protectedAttribute) {
      return res.status(400).json({ error: 'modelPredictions, trueLabels, and protectedAttribute are required' });
    }

    // Call AI Core validation
    try {
      const response = await axios.post(`${AI_CORE_URL}/federated/validate-edge-model`, {
        model_predictions: modelPredictions,
        true_labels: trueLabels,
        protected_attribute: protectedAttribute,
        min_confidence: minConfidence,
      }, { headers: AI_CORE_AUTH_HEADERS });

      return res.json(response.data);
    } catch (err) {
      logger.error({ error: err.message }, 'ai_core_validation_failed');
      return res.status(500).json({ error: 'Model validation failed' });
    }
  } catch (err) {
    logger.error({ error: err.message }, 'validate_model_failed');
    return res.status(500).json({ error: 'Failed to validate model' });
  }
});

/**
 * Get federated network health
 * GET /federated/health
 */
router.get('/health', authGuard, async (req, res) => {
  try {
    await loadModels();

    const tenantId = req.user?.tenantId || req.user?.uid;

    // Get node health from AI Core
    let aiCoreHealth = null;
    try {
      const response = await axios.get(`${AI_CORE_URL}/federated/health/nodes`, {
        timeout: 5000,
        headers: AI_CORE_AUTH_HEADERS,
      });
      aiCoreHealth = response.data;
    } catch (err) {
      logger.warn({ error: err.message }, 'ai_core_health_check_failed');
    }

    // Get local node info
    const nodes = await FederatedNode.find({ tenantId }).lean();
    const healthyNodes = nodes.filter((n) => n.status === 'healthy');

    return res.json({
      networkStatus: healthyNodes.length === nodes.length ? 'healthy' : 'degraded',
      totalNodes: nodes.length,
      healthyNodes: healthyNodes.length,
      nodes: nodes.map((n) => ({
        nodeId: n.nodeId,
        status: n.status,
        lastHeartbeat: n.lastHeartbeat,
      })),
      aiCoreHealth,
    });
  } catch (err) {
    logger.error({ error: err.message }, 'health_check_failed');
    return res.status(500).json({ error: 'Health check failed' });
  }
});

/**
 * Get federated learning analytics
 * GET /federated/analytics
 */
router.get('/analytics', authGuard, async (req, res) => {
  try {
    await loadModels();

    const tenantId = req.user?.tenantId || req.user?.uid;
    const days = parseInt(req.query.days) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Aggregate statistics
    const aggregations = await FederatedAggregation.aggregate([
      {
        $match: {
          tenantId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$complianceStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const nodes = await FederatedNode.find({ tenantId }).lean();

    return res.json({
      period: {
        startDate,
        endDate: new Date(),
        days,
      },
      totalNodes: nodes.length,
      healthyNodes: nodes.filter((n) => n.status === 'healthy').length,
      aggregations,
      avgEpsilonBudget: nodes.length > 0 ? nodes.reduce((sum, n) => sum + (n.epsilonBudget || 0), 0) / nodes.length : 0,
      avgEpsilonUsed: nodes.length > 0 ? nodes.reduce((sum, n) => sum + (n.epsilonUsed || 0), 0) / nodes.length : 0,
    });
  } catch (err) {
    logger.error({ error: err.message }, 'analytics_failed');
    return res.status(500).json({ error: 'Failed to get analytics' });
  }
});

module.exports = router;
