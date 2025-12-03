/**
 * Drift Detection API Routes
 *
 * Provides REST endpoints for drift monitoring and alerting.
 */
const express = require('express');
const router = express.Router();

/**
 * GET /v1/drift/snapshots/:model_id
 * Get recent drift snapshots for a model
 */
router.get('/snapshots/:model_id', async (req, res) => {
  try {
    const { model_id } = req.params;
    const { limit = 100, days = 7 } = req.query;

    const { db } = req.app.locals;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const snapshots = await db.collection('drift_snapshots')
      .find({
        model_id,
        window_end: { $gte: since },
      })
      .sort({ window_end: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json({
      model_id,
      count: snapshots.length,
      snapshots,
    });
  } catch (error) {
    logger.error('Error fetching drift snapshots:', error);
    res.status(500).json({ error: 'Failed to fetch drift snapshots' });
  }
});

/**
 * GET /v1/drift/alerts/:model_id
 * Get alerts for a model
 */
router.get('/alerts/:model_id', async (req, res) => {
  try {
    const { model_id } = req.params;
    const { severity, resolved = 'false', limit = 100 } = req.query;

    const { db } = req.app.locals;
    const query = { model_id, resolved: resolved === 'true' };

    if (severity) {
      query.severity = severity;
    }

    const alerts = await db.collection('drift_alerts')
      .find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json({
      model_id,
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    logger.error('Error fetching drift alerts:', error);
    res.status(500).json({ error: 'Failed to fetch drift alerts' });
  }
});

/**
 * POST /v1/drift/alerts/:alert_id/resolve
 * Resolve an alert
 */
router.post('/alerts/:alert_id/resolve', async (req, res) => {
  try {
    const { alert_id } = req.params;
    const { resolution_note } = req.body;

    const { db } = req.app.locals;
    const { ObjectId } = require('mongodb');

    const result = await db.collection('drift_alerts').updateOne(
      { _id: new ObjectId(alert_id) },
      {
        $set: {
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_note,
          updated_at: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    logger.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

/**
 * GET /v1/drift/status/:model_id
 * Get current drift status for a model
 */
router.get('/status/:model_id', async (req, res) => {
  try {
    const { model_id } = req.params;
    const { db } = req.app.locals;

    // Get latest snapshot
    const latestSnapshot = await db.collection('drift_snapshots')
      .findOne({ model_id }, { sort: { window_end: -1 } });

    // Get active alerts
    const activeAlerts = await db.collection('drift_alerts')
      .find({ model_id, resolved: false })
      .sort({ severity: -1, created_at: -1 })
      .limit(10)
      .toArray();

    // Get baseline info
    const baseline = await db.collection('drift_baselines')
      .findOne({ model_id });

    res.json({
      model_id,
      current_status: latestSnapshot?.overall_status || 'unknown',
      critical_alerts: activeAlerts.filter(a => a.severity === 'critical').length,
      warning_alerts: activeAlerts.filter(a => a.severity === 'warning').length,
      needs_retraining: latestSnapshot?.needs_retraining || false,
      latest_snapshot: latestSnapshot,
      active_alerts: activeAlerts,
      baseline_age_days: baseline
        ? Math.floor((Date.now() - new Date(baseline.created_at).getTime()) / (24 * 60 * 60 * 1000))
        : null,
    });
  } catch (error) {
    logger.error('Error fetching drift status:', error);
    res.status(500).json({ error: 'Failed to fetch drift status' });
  }
});

/**
 * POST /v1/models/:model_id/trigger-retrain
 * Trigger model retraining request
 */
router.post('/models/:model_id/trigger-retrain', async (req, res) => {
  try {
    const { model_id } = req.params;
    const { reason, requested_by } = req.body;

    const { db } = req.app.locals;

    // Create retrain request
    const retrainRequest = {
      model_id,
      reason,
      requested_by,
      requested_at: new Date().toISOString(),
      status: 'pending',
    };

    await db.collection('retrain_requests').insertOne(retrainRequest);

    // TODO: Trigger retraining pipeline (GitHub Actions workflow dispatch)

    res.json({
      success: true,
      message: 'Retraining request submitted',
      request: retrainRequest,
    });
  } catch (error) {
    logger.error('Error triggering retrain:', error);
    res.status(500).json({ error: 'Failed to trigger retrain' });
  }
});

module.exports = router;
