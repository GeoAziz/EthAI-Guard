// Storage layer for ethical evaluations using Firestore (Firebase free tier compatible)
const admin = require('firebase-admin');
const logger = require('../logger');
const { v4: uuidv4 } = require('uuid');

// Initialize Firestore reference (lazy, assumes firebase-admin initialized)
function getFirestore() {
  try {
    return admin.firestore();
  } catch (e) {
    logger.warn({ err: e }, 'firestore_not_available');
    return null;
  }
}

const COLLECTION = 'ethical_evaluations';

/**
 * Save evaluation result to Firestore
 * @param {object} evaluation - Full evaluation object from /v1/evaluate
 * @returns {Promise<string>} evaluation_id
 */
async function saveEvaluation(evaluation) {
  const db = getFirestore();
  if (!db) {
    logger.warn('firestore_unavailable_skipping_save');
    return null;
  }

  try {
    const evaluation_id = uuidv4();
    const doc = {
      evaluation_id,
      user_id: evaluation.user_id,
      model_id: evaluation.model_id,
      input_summary: summarizeInput(evaluation.input_features),
      risk_score: evaluation.risk.score,
      risk_level: evaluation.risk.level,
      triggered_rules: extractTriggeredRules(evaluation.rules),
      explanation: evaluation.explanation,
      timestamp: evaluation.timestamp || new Date().toISOString(),
      request_id: evaluation.request_id,
      // Store full objects for audit trail
      full_simulation: evaluation.simulation,
      full_rules: evaluation.rules,
      full_risk: evaluation.risk,
      input_features: evaluation.input_features,
      context: evaluation.context || {},
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTION).doc(evaluation_id).set(doc);
    logger.info({ evaluation_id, user_id: evaluation.user_id, risk_level: evaluation.risk.level }, 'evaluation_saved');
    return evaluation_id;
  } catch (e) {
    logger.error({ err: e }, 'save_evaluation_failed');
    return null;
  }
}

/**
 * Get evaluations with pagination and filters
 * @param {object} filters - { risk_level?, model_id?, user_id?, limit?, offset? }
 * @returns {Promise<Array>} evaluations
 */
async function getEvaluations(filters = {}) {
  const db = getFirestore();
  if (!db) {
    logger.warn('firestore_unavailable');
    return [];
  }

  try {
    let query = db.collection(COLLECTION);

    // Apply filters
    if (filters.risk_level) {
      query = query.where('risk_level', '==', filters.risk_level);
    }
    if (filters.model_id) {
      query = query.where('model_id', '==', filters.model_id);
    }
    if (filters.user_id) {
      query = query.where('user_id', '==', filters.user_id);
    }

    // Order by timestamp descending (most recent first)
    query = query.orderBy('timestamp', 'desc');

    // Pagination
    const limit = filters.limit || 20;
    query = query.limit(limit);
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const snapshot = await query.get();
    const evaluations = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      evaluations.push({
        evaluation_id: data.evaluation_id,
        user_id: data.user_id,
        model_id: data.model_id,
        input_summary: data.input_summary,
        risk_score: data.risk_score,
        risk_level: data.risk_level,
        triggered_rules: data.triggered_rules,
        explanation_summary: data.explanation?.summary,
        timestamp: data.timestamp,
      });
    });

    return evaluations;
  } catch (e) {
    logger.error({ err: e, filters }, 'get_evaluations_failed');
    return [];
  }
}

/**
 * Get single evaluation by ID with full details
 * @param {string} evaluation_id
 * @returns {Promise<object|null>}
 */
async function getEvaluationById(evaluation_id) {
  const db = getFirestore();
  if (!db) {
    logger.warn('firestore_unavailable');
    return null;
  }

  try {
    const doc = await db.collection(COLLECTION).doc(evaluation_id).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data();
  } catch (e) {
    logger.error({ err: e, evaluation_id }, 'get_evaluation_by_id_failed');
    return null;
  }
}

// Helper: summarize input features for compact storage/display
function summarizeInput(input_features) {
  const keys = Object.keys(input_features);
  const summary = {};
  for (const k of keys.slice(0, 5)) { // first 5 keys
    const v = input_features[k];
    if (Array.isArray(v)) {
      summary[k] = `[${v.length} values]`;
    } else {
      summary[k] = v;
    }
  }
  if (keys.length > 5) {
    summary['...'] = `+${keys.length - 5} more`;
  }
  return summary;
}

// Helper: extract triggered rule names/flags
function extractTriggeredRules(rules) {
  const triggered = [];
  if (rules.fairness?.fairness_flag) {
    triggered.push('fairness_imbalance');
  }
  if (rules.bias?.bias_flag) {
    triggered.push('extreme_output_bias');
  }
  if (rules.compliance?.compliance_flag) {
    triggered.push('compliance_missing_fields');
  }
  return triggered;
}

module.exports = { saveEvaluation, getEvaluations, getEvaluationById };
