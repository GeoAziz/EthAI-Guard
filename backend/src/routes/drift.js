/**
 * Drift Detection API Routes
 *
 * Provides REST endpoints for drift monitoring and alerting.
 * Mounted at /v1/drift in server.js.
 *
 * Retraining trigger/history/performance endpoints live in routes/models.js
 * (they share the RetrainRequest storage abstraction and admin auth guard);
 * this file only owns drift snapshots/alerts/status.
 */
const express = require('express');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const router = express.Router();
const logger = require('../logger');
const { authGuard, requireRole } = require('../middleware/authGuard');

const USE_IN_MEMORY = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === '1';

// In-memory fallback stores so this router is testable without a live Mongo instance.
const _snapshots = [];
const _alerts = [];
const _baselines = [];

function getDb() {
  if (USE_IN_MEMORY) {
    return null;
  }
  return mongoose.connection.db;
}

router.get('/snapshots/:model_id', authGuard, async (req, res) => {
  try {
    const { model_id } = req.params;
    const { limit = 100, days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let snapshots;
    if (USE_IN_MEMORY) {
      snapshots = _snapshots
        .filter(s => s.model_id === model_id && s.window_end >= since)
        .sort((a, b) => (a.window_end < b.window_end ? 1 : -1))
        .slice(0, parseInt(limit, 10));
    } else {
      snapshots = await getDb().collection('drift_snapshots')
        .find({ model_id, window_end: { $gte: since } })
        .sort({ window_end: -1 })
        .limit(parseInt(limit, 10))
        .toArray();
    }

    res.json({ model_id, count: snapshots.length, snapshots });
  } catch (error) {
    logger.error({ err: error }, 'drift_snapshots_fetch_failed');
    res.status(500).json({ error: 'Failed to fetch drift snapshots' });
  }
});

router.get('/alerts/:model_id', authGuard, async (req, res) => {
  try {
    const { model_id } = req.params;
    const { severity, resolved = 'false', limit = 100 } = req.query;
    const resolvedBool = resolved === 'true';

    let alerts;
    if (USE_IN_MEMORY) {
      alerts = _alerts
        .filter(a => a.model_id === model_id && a.resolved === resolvedBool && (!severity || a.severity === severity))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, parseInt(limit, 10));
    } else {
      const query = { model_id, resolved: resolvedBool };
      if (severity) {
        query.severity = severity;
      }
      alerts = await getDb().collection('drift_alerts')
        .find(query)
        .sort({ created_at: -1 })
        .limit(parseInt(limit, 10))
        .toArray();
    }

    res.json({ model_id, count: alerts.length, alerts });
  } catch (error) {
    logger.error({ err: error }, 'drift_alerts_fetch_failed');
    res.status(500).json({ error: 'Failed to fetch drift alerts' });
  }
});

router.post('/alerts/:alert_id/resolve', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const { alert_id } = req.params;
    const { resolution_note } = req.body;
    const update = {
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolution_note,
      updated_at: new Date().toISOString(),
    };

    if (USE_IN_MEMORY) {
      const alert = _alerts.find(a => String(a._id) === String(alert_id));
      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      Object.assign(alert, update);
    } else {
      const result = await getDb().collection('drift_alerts').updateOne(
        { _id: new ObjectId(alert_id) },
        { $set: update },
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Alert not found' });
      }
    }

    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    logger.error({ err: error }, 'drift_alert_resolve_failed');
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

router.get('/status/:model_id', authGuard, async (req, res) => {
  try {
    const { model_id } = req.params;

    let latestSnapshot, activeAlerts, baseline;
    if (USE_IN_MEMORY) {
      latestSnapshot = _snapshots
        .filter(s => s.model_id === model_id)
        .sort((a, b) => (a.window_end < b.window_end ? 1 : -1))[0] || null;
      activeAlerts = _alerts
        .filter(a => a.model_id === model_id && !a.resolved)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 10);
      baseline = _baselines.find(b => b.model_id === model_id) || null;
    } else {
      const db = getDb();
      latestSnapshot = await db.collection('drift_snapshots')
        .findOne({ model_id }, { sort: { window_end: -1 } });
      activeAlerts = await db.collection('drift_alerts')
        .find({ model_id, resolved: false })
        .sort({ severity: -1, created_at: -1 })
        .limit(10)
        .toArray();
      baseline = await db.collection('drift_baselines').findOne({ model_id });
    }

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
    logger.error({ err: error }, 'drift_status_fetch_failed');
    res.status(500).json({ error: 'Failed to fetch drift status' });
  }
});

module.exports = router;
