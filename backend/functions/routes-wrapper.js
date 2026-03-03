/**
 * Wrap existing Express route modules for Firebase Cloud Functions
 * This allows us to reuse routes/models.js, routes/evidence.js, routes/accessRequests.js, etc.
 * without duplicating logic
 */

const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { authGuard } = require('../src/middleware/authGuard');

// Import route modules
const accessRequestsRouter = require('../src/routes/accessRequests');
const modelsRouter = require('../src/routes/models');
const evidenceRouter = require('../src/routes/evidence');
const evaluateRouter = require('../src/routes/evaluate');
const validationRouter = require('../src/routes/validation');

/**
 * Helper: Create Express app wrapper for a router
 */
function createAppWrapper(router) {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(cors({ origin: true }));
  app.use(router);
  return app;
}

/**
 * Access Requests routes
 * GET /v1/access-requests
 * POST /v1/access-requests/:id/approve
 * POST /v1/access-requests/:id/reject
 */
exports.accessRequests = functions.https.onRequest(
  createAppWrapper(accessRequestsRouter)
);

/**
 * Models routes
 */
exports.models = functions.https.onRequest(
  createAppWrapper(modelsRouter)
);

/**
 * Evidence routes
 */
exports.evidence = functions.https.onRequest(
  createAppWrapper(evidenceRouter)
);

/**
 * Evaluate routes
 */
exports.evaluate = functions.https.onRequest(
  createAppWrapper(evaluateRouter)
);

/**
 * Validation routes
 */
exports.validation = functions.https.onRequest(
  createAppWrapper(validationRouter)
);
