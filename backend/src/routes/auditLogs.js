const express = require('express');
const auditLogger = require('../services/auditLogger');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

/**
 * @route   GET /api/audit/logs
 * @desc    Query audit logs with filtering and pagination
 * @access  Protected (should require admin role in production)
 */
router.get('/logs', async (req, res) => {
  try {
    const {
      model_id,
      event_type,
      actor,
      result,
      compliance_status,
      start_date,
      end_date,
      page = 1,
      limit = 50,
      sort = '-timestamp'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (model_id) filter.model_id = model_id;
    if (event_type) filter.event_type = event_type;
    if (actor) filter.actor = actor;
    if (result) filter.result = result;
    if (compliance_status) filter.compliance_status = compliance_status;
    
    if (start_date || end_date) {
      filter.timestamp = {};
      if (start_date) filter.timestamp.$gte = new Date(start_date);
      if (end_date) filter.timestamp.$lte = new Date(end_date);
    }

    // Execute query with pagination
    const logs = await auditLogger.query(filter, {
      skip: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit),
      sort
    });

    const total = await AuditLog.countDocuments(filter);

    res.json({
      success: true,
      data: logs,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_records: total,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit/logs/:model_id/trail
 * @desc    Get complete audit trail for a specific model
 * @access  Protected
 */
router.get('/logs/:model_id/trail', async (req, res) => {
  try {
    const { model_id } = req.params;
    const { model_version } = req.query;

    const trail = await auditLogger.getModelAuditTrail(model_id, model_version);

    if (trail.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No audit trail found for this model'
      });
    }

    res.json({
      success: true,
      data: {
        model_id,
        model_version: model_version || 'all versions',
        total_events: trail.length,
        trail
      }
    });

  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit trail',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit/summary
 * @desc    Get governance summary statistics
 * @access  Protected
 */
router.get('/summary', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const summary = await auditLogger.getSummary(parseInt(days));

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching audit summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit summary',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/audit/log
 * @desc    Create a new audit log entry (manual logging)
 * @access  Protected
 */
router.post('/log', async (req, res) => {
  try {
    const {
      event_type,
      model_id,
      model_version,
      actor,
      action,
      result,
      details,
      compliance_status,
      metadata
    } = req.body;

    // Validate required fields
    if (!event_type || !model_id || !actor || !action || !result) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: event_type, model_id, actor, action, result'
      });
    }

    const logEntry = await auditLogger.log({
      event_type,
      model_id,
      model_version,
      actor,
      action,
      result,
      details,
      compliance_status,
      metadata
    });

    res.status(201).json({
      success: true,
      message: 'Audit log created successfully',
      data: logEntry
    });

  } catch (error) {
    console.error('Error creating audit log:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create audit log',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit/violations
 * @desc    Get recent policy violations
 * @access  Protected
 */
router.get('/violations', async (req, res) => {
  try {
    const { days = 7, limit = 20 } = req.query;

    const violations = await AuditLog.getRecentViolations(parseInt(days), parseInt(limit));

    res.json({
      success: true,
      data: {
        period_days: parseInt(days),
        total_violations: violations.length,
        violations
      }
    });

  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch violations',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit/compliance-rate
 * @desc    Get overall compliance rate
 * @access  Protected
 */
router.get('/compliance-rate', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const complianceRate = await AuditLog.getComplianceRate(parseInt(days));

    res.json({
      success: true,
      data: {
        period_days: parseInt(days),
        ...complianceRate
      }
    });

  } catch (error) {
    console.error('Error calculating compliance rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate compliance rate',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit/event-types
 * @desc    Get list of all audit event types
 * @access  Protected
 */
router.get('/event-types', async (req, res) => {
  try {
    const eventTypes = await AuditLog.distinct('event_type');

    res.json({
      success: true,
      data: eventTypes.sort()
    });

  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event types',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit/actors
 * @desc    Get list of all actors who have created audit logs
 * @access  Protected
 */
router.get('/actors', async (req, res) => {
  try {
    const actors = await AuditLog.distinct('actor');

    res.json({
      success: true,
      data: actors.sort()
    });

  } catch (error) {
    console.error('Error fetching actors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch actors',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit/timeline
 * @desc    Get audit event timeline (aggregated by day)
 * @access  Protected
 */
router.get('/timeline', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const timeline = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            event_type: '$event_type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        period_days: parseInt(days),
        timeline
      }
    });

  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit timeline',
      message: error.message
    });
  }
});

module.exports = router;
