const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const { authGuard, requireRole } = require('../middleware/authGuard');
const logger = require('../logger');
const { asyncHandler, notFoundError } = require('../errorHandler');

let Report, ModelCard;

function getModels() {
  if (!Report) {
    Report = require('../models/Report');
    ModelCard = require('../models/ModelCard');
  }
  return { Report, ModelCard };
}

// COMPARE TWO MODELS
router.get(
  '/v1/models/compare',
  authGuard,
  query('model1').isString(),
  query('model2').isString(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { Report, ModelCard } = getModels();
    const { model1, model2 } = req.query;

    // Fetch latest reports for both models
    const report1 = await Report.findOne({ modelId: model1 }).sort({ createdAt: -1 });
    const report2 = await Report.findOne({ modelId: model2 }).sort({ createdAt: -1 });

    if (!report1 || !report2) {
      return res.status(404).json({ error: 'One or both models not found' });
    }

    // Fetch model cards for detailed info
    const card1 = await ModelCard.findOne({ modelId: model1 }).sort({ version: -1 });
    const card2 = await ModelCard.findOne({ modelId: model2 }).sort({ version: -1 });

    // Build comparison object
    const comparison = {
      model1: {
        modelId: model1,
        name: card1?.name || model1,
        version: card1?.version || 'unknown',
        fairnessScore: report1?.summary?.fairness_score || 0,
        metrics: report1?.summary?.fairness_metrics || {},
        performanceMetrics: {
          accuracy: report1?.summary?.accuracy || 0,
          precision: report1?.summary?.precision || 0,
          recall: report1?.summary?.recall || 0,
          f1Score: report1?.summary?.f1_score || 0,
        },
        trainingDate: card1?.trainingDate || report1?.createdAt,
        protectedAttributes: report1?.summary?.protected_attributes || [],
        dataQuality: report1?.summary?.data_quality || {},
      },
      model2: {
        modelId: model2,
        name: card2?.name || model2,
        version: card2?.version || 'unknown',
        fairnessScore: report2?.summary?.fairness_score || 0,
        metrics: report2?.summary?.fairness_metrics || {},
        performanceMetrics: {
          accuracy: report2?.summary?.accuracy || 0,
          precision: report2?.summary?.precision || 0,
          recall: report2?.summary?.recall || 0,
          f1Score: report2?.summary?.f1_score || 0,
        },
        trainingDate: card2?.trainingDate || report2?.createdAt,
        protectedAttributes: report2?.summary?.protected_attributes || [],
        dataQuality: report2?.summary?.data_quality || {},
      },
      comparison: {
        fairnessDifference: report1?.summary?.fairness_score - report2?.summary?.fairness_score,
        performanceDifference: {
          accuracy: report1?.summary?.accuracy - report2?.summary?.accuracy,
          precision: report1?.summary?.precision - report2?.summary?.precision,
          recall: report1?.summary?.recall - report2?.summary?.recall,
          f1Score: report1?.summary?.f1_score - report2?.summary?.f1_score,
        },
        metricDifferences: {},
        recommendation: {
          winner: null,
          reason: '',
          considerations: [],
        },
      },
    };

    // Calculate metric differences
    Object.keys(comparison.model1.metrics).forEach((metric) => {
      const val1 = comparison.model1.metrics[metric];
      const val2 = comparison.model2.metrics[metric];
      if (typeof val1 === 'number' && typeof val2 === 'number') {
        comparison.comparison.metricDifferences[metric] = val1 - val2;
      }
    });

    // Generate recommendation
    const fairnessScore1 = comparison.model1.fairnessScore;
    const fairnessScore2 = comparison.model2.fairnessScore;
    const accDiff = comparison.comparison.performanceDifference.accuracy;

    if (fairnessScore1 > fairnessScore2 && accDiff >= -0.02) {
      comparison.comparison.recommendation.winner = 'model1';
      comparison.comparison.recommendation.reason = 'Model 1 has better fairness with comparable or better accuracy';
    } else if (fairnessScore2 > fairnessScore1 && accDiff <= 0.02) {
      comparison.comparison.recommendation.winner = 'model2';
      comparison.comparison.recommendation.reason = 'Model 2 has better fairness with comparable or better accuracy';
    } else if (fairnessScore1 > fairnessScore2) {
      comparison.comparison.recommendation.winner = 'model1';
      comparison.comparison.recommendation.reason = 'Model 1 has significantly better fairness';
      comparison.comparison.recommendation.considerations.push('Note: Model 2 has slightly better accuracy');
    } else if (fairnessScore2 > fairnessScore1) {
      comparison.comparison.recommendation.winner = 'model2';
      comparison.comparison.recommendation.reason = 'Model 2 has significantly better fairness';
      comparison.comparison.recommendation.considerations.push('Note: Model 1 has slightly better accuracy');
    } else {
      comparison.comparison.recommendation.winner = 'tie';
      comparison.comparison.recommendation.reason = 'Both models have similar fairness scores';
      comparison.comparison.recommendation.considerations.push('Consider performance metrics and other factors');
    }

    logger.info({ model1, model2 }, 'models_compared');
    res.json(comparison);
  })
);

// RANK MODELS BY FAIRNESS
router.get(
  '/v1/models/ranking',
  authGuard,
  query('metric').optional(),
  query('limit').optional(),
  asyncHandler(async (req, res) => {
    const { Report } = getModels();
    const { metric = 'fairness_score', limit = 20 } = req.query;

    // Get latest report for each unique model
    const reports = await Report.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$modelId',
          reportId: { $first: '$_id' },
          fairnessScore: { $first: '$summary.fairness_score' },
          metrics: { $first: '$summary.fairness_metrics' },
          accuracy: { $first: '$summary.accuracy' },
          createdAt: { $first: '$createdAt' },
        },
      },
      { $sort: { fairnessScore: -1 } },
      { $limit: parseInt(limit) },
    ]);

    const ranking = reports.map((r, idx) => ({
      rank: idx + 1,
      modelId: r._id,
      fairnessScore: r.fairnessScore || 0,
      accuracy: r.accuracy || 0,
      metrics: r.metrics || {},
      lastEvaluated: r.createdAt,
      scoreImprovement: null, // Would be populated from historical data
    }));

    logger.info({ metric, count: ranking.length }, 'models_ranked');
    res.json({ ranking });
  })
);

// CHAMPION/CHALLENGER EVALUATION
router.post(
  '/v1/models/champion-challenger',
  authGuard,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { Report, ModelCard } = getModels();
    const { championId, challengerId, evaluationCriteria } = req.body;

    const criteria = evaluationCriteria || {
      fairness: 0.4,
      performance: 0.35,
      stability: 0.15,
      dataQuality: 0.1,
    };

    const champion = await Report.findOne({ modelId: championId }).sort({ createdAt: -1 });
    const challenger = await Report.findOne({ modelId: challengerId }).sort({ createdAt: -1 });

    if (!champion || !challenger) {
      return res.status(404).json({ error: 'One or both models not found' });
    }

    // Calculate weighted scores
    const champScore =
      (champion?.summary?.fairness_score || 0) * criteria.fairness +
      (champion?.summary?.accuracy || 0) * criteria.performance +
      (champion?.summary?.data_quality?.completeness || 0) * criteria.dataQuality;

    const challScore =
      (challenger?.summary?.fairness_score || 0) * criteria.fairness +
      (challenger?.summary?.accuracy || 0) * criteria.performance +
      (challenger?.summary?.data_quality?.completeness || 0) * criteria.dataQuality;

    const outcome = {
      champion: {
        modelId: championId,
        score: champScore,
      },
      challenger: {
        modelId: challengerId,
        score: challScore,
      },
      result: challScore > champScore ? 'challenger_wins' : 'champion_retained',
      scoreDifference: Math.abs(challScore - champScore),
      recommendation: challScore > champScore ? 'Deploy challenger and retire champion' : 'Retain champion',
      details: {
        criteriaWeights: criteria,
        championBreakdown: {
          fairness: (champion?.summary?.fairness_score || 0) * criteria.fairness,
          performance: (champion?.summary?.accuracy || 0) * criteria.performance,
          dataQuality: (champion?.summary?.data_quality?.completeness || 0) * criteria.dataQuality,
        },
        challengerBreakdown: {
          fairness: (challenger?.summary?.fairness_score || 0) * criteria.fairness,
          performance: (challenger?.summary?.accuracy || 0) * criteria.performance,
          dataQuality: (challenger?.summary?.data_quality?.completeness || 0) * criteria.dataQuality,
        },
      },
    };

    logger.info({ championId, challengerId, result: outcome.result }, 'champion_challenger_evaluated');
    res.json(outcome);
  })
);

// GET MODEL PERFORMANCE TREND
router.get(
  '/v1/models/:id/trend',
  authGuard,
  query('days').optional(),
  asyncHandler(async (req, res) => {
    const { Report } = getModels();
    const { id } = req.params;
    const { days = 30 } = req.query;

    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const reports = await Report.find({
      modelId: id,
      createdAt: { $gte: sinceDate },
    })
      .sort({ createdAt: 1 })
      .select('summary.fairness_score summary.accuracy summary.precision createdAt');

    const trend = reports.map((r) => ({
      date: r.createdAt,
      fairnessScore: r.summary?.fairness_score || 0,
      accuracy: r.summary?.accuracy || 0,
      precision: r.summary?.precision || 0,
    }));

    // Calculate trend direction
    if (trend.length >= 2) {
      const first = trend[0].fairnessScore;
      const last = trend[trend.length - 1].fairnessScore;
      const direction = last > first ? 'improving' : last < first ? 'degrading' : 'stable';

      res.json({
        modelId: id,
        trend,
        summary: {
          direction,
          change: last - first,
          percentChange: ((last - first) / first) * 100,
        },
      });
    } else {
      res.json({ modelId: id, trend, summary: { direction: 'insufficient_data' } });
    }
  })
);

module.exports = router;
