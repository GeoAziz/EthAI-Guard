/**
 * Response Wrapper Middleware
 * Standardizes all API responses to a consistent format:
 * Success: { status: 'success', data: {...}, metadata: {...} }
 * Error: { status: 'error', error: { code, message, details }, metadata: {...} }
 */

const logger = require('../logger');

/**
 * Standard response wrapper
 * Intercepts res.json() to ensure consistent format
 * Should be registered AFTER request ID middleware
 */
function responseWrapper(req, res, next) {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Wrap res.json to standardize format
  res.json = function(payload) {
    // If already wrapped or is an error, return as-is
    if (payload && (payload.status === 'success' || payload.status === 'error')) {
      return originalJson(payload);
    }

    // Check if this is an error status code
    const isError = res.statusCode >= 400;

    if (isError) {
      // Error response - standardize error format
      const error = {
        code: payload?.code || payload?.error || 'unknown_error',
        message: payload?.message || payload?.error || 'An error occurred',
      };

      // Include validation details if present
      if (payload?.details || payload?.errors) {
        error.details = payload.details || payload.errors;
      }

      // If meta info present (only in dev), include it
      if (process.env.NODE_ENV !== 'production' && payload?.meta) {
        error.meta = payload.meta;
      }

      const response = {
        status: 'error',
        error,
        metadata: {
          timestamp: new Date().toISOString(),
          path: req.path,
          requestId: req.request_id || req.id || 'unknown',
        },
      };

      return originalJson(response);
    } else {
      // Success response
      const response = {
        status: 'success',
        data: payload,
        metadata: {
          timestamp: new Date().toISOString(),
          path: req.path,
          requestId: req.request_id || req.id || 'unknown',
        },
      };

      return originalJson(response);
    }
  };

  next();
}

module.exports = responseWrapper;
