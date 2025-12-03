const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const logger = require('../logger');
const admin = require('firebase-admin');
const firebaseAdmin = require('../services/firebaseAdmin');

// Initialize Firebase Admin SDK (no-op in tests without creds)
firebaseAdmin.initFirebase();

// Lazy getter to avoid crashing module load when Firebase isn't configured
function getDb() {
  // In firebase-admin v11+, apps() or apps.length can be used to check init
  const apps = admin.apps || [];
  if (apps.length === 0) {
    const err = new Error('Firestore not configured');
    err.code = 'firestore_not_available';
    throw err;
  }
  return admin.firestore();
}

// AI Core service URL
const AI_CORE_URL = process.env.AI_CORE_URL || 'http://localhost:8000';

/**
 * POST /v1/validate-model
 * Trigger model validation with synthetic data
 */
router.post(
  '/v1/validate-model',
  [
    body('model_name').isString().isLength({ min: 1, max: 128 }),
    body('model_version').optional().isString().isLength({ min: 1, max: 32 }),
    body('model_description').optional().isString().isLength({ max: 500 }),
    body('num_synthetic_cases').optional().isInt({ min: 50, max: 500 }),
    body('include_edge_cases').optional().isBoolean(),
    body('include_stability_test').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'validation_failed', details: errors.array() });
    }

    try {
      const user_id = req.user?.uid || 'anonymous';
      const {
        model_name,
        model_version = '1.0',
        model_description,
        num_synthetic_cases = 200,
        include_edge_cases = true,
        include_stability_test = true,
      } = req.body;

      logger.info({
        user_id,
        model_name,
        model_version,
        num_synthetic_cases,
      }, 'Starting model validation');

      // Call AI Core validation endpoint
      const aiCoreResponse = await axios.post(
        `${AI_CORE_URL}/validation/validate-model`,
        {
          model_name,
          model_version,
          model_description,
          num_synthetic_cases,
          include_edge_cases,
          include_stability_test,
          include_html_report: false,
        },
        {
          timeout: 120000, // 2 minute timeout for large validations
        },
      );

      const validationResult = aiCoreResponse.data;

      // Store validation report in Firestore
      const reportDoc = {
        user_id,
        model_name,
        model_version,
        report_id: validationResult.report_id,
        status: validationResult.status,
        overall_score: validationResult.overall_score,
        confidence_score: validationResult.confidence_score,
        total_cases: validationResult.total_cases,
        metrics_summary: validationResult.metrics_summary,
        recommendations: validationResult.recommendations,
        report_json: validationResult.report_json,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await getDb().collection('validation_reports').add(reportDoc);

      logger.info({
        user_id,
        report_id: validationResult.report_id,
        firestore_id: docRef.id,
        status: validationResult.status,
        overall_score: validationResult.overall_score,
      }, 'Validation report stored');

      // Return summary
      res.status(201).json({
        report_id: validationResult.report_id,
        firestore_id: docRef.id,
        status: validationResult.status,
        overall_score: validationResult.overall_score,
        confidence_score: validationResult.confidence_score,
        total_cases: validationResult.total_cases,
        metrics_summary: validationResult.metrics_summary,
        recommendations: validationResult.recommendations,
        created_at: reportDoc.created_at,
      });

    } catch (error) {
      logger.error({ err: error, msg: error.message }, 'Model validation failed');

      if (error.response) {
        // AI Core returned an error
        return res.status(error.response.status || 500).json({
          error: 'ai_core_error',
          detail: error.response.data?.detail || error.message,
        });
      }

      res.status(500).json({
        error: 'validation_failed',
        detail: error.message,
      });
    }
  },
);

/**
 * GET /v1/validation-reports
 * List all validation reports for current user
 */
router.get('/v1/validation-reports', async (req, res) => {
  try {
    const user_id = req.user?.uid || 'anonymous';
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Query Firestore for user's validation reports
    const reportsSnapshot = await getDb()
      .collection('validation_reports')
      .where('user_id', '==', user_id)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const reports = [];
    reportsSnapshot.forEach(doc => {
      const data = doc.data();
      reports.push({
        firestore_id: doc.id,
        report_id: data.report_id,
        model_name: data.model_name,
        model_version: data.model_version,
        status: data.status,
        overall_score: data.overall_score,
        confidence_score: data.confidence_score,
        total_cases: data.total_cases,
        metrics_summary: data.metrics_summary,
        created_at: data.created_at,
      });
    });

    logger.info({ user_id, count: reports.length }, 'Fetched validation reports');

    res.json({
      reports,
      count: reports.length,
      limit,
      offset,
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch validation reports');
    res.status(500).json({
      error: 'fetch_failed',
      detail: error.message,
    });
  }
});

/**
 * GET /v1/validation-reports/:id
 * Get full validation report by Firestore ID
 */
router.get('/v1/validation-reports/:id', async (req, res) => {
  try {
    const user_id = req.user?.uid || 'anonymous';
    const firestore_id = req.params.id;

    // Fetch report from Firestore
    const docRef = getDb().collection('validation_reports').doc(firestore_id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'report_not_found' });
    }

    const data = doc.data();

    // Verify ownership
    if (data.user_id !== user_id) {
      return res.status(403).json({ error: 'forbidden' });
    }

    logger.info({ user_id, firestore_id, report_id: data.report_id }, 'Fetched validation report detail');

    res.json({
      firestore_id: doc.id,
      ...data,
    });

  } catch (error) {
    logger.error({ err: error, id: req.params.id }, 'Failed to fetch validation report');
    res.status(500).json({
      error: 'fetch_failed',
      detail: error.message,
    });
  }
});

module.exports = router;
