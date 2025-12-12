/**
 * Day 30 Polish: Unified Error Handler for Backend
 * Provides consistent error responses across all endpoints
 */

const logger = require('./logger');

class AppError extends Error {
  constructor(message, statusCode, code = null, meta = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.meta = meta;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error types
 */
const ErrorTypes = {
  // Authentication errors (401)
  INVALID_TOKEN: new AppError('Invalid or expired token', 401, 'invalid_token'),
  TOKEN_EXPIRED: new AppError('Your session has expired. Please log in again.', 401, 'token_expired'),
  UNAUTHORIZED: new AppError('Authentication required', 401, 'unauthorized'),

  // Authorization errors (403)
  FORBIDDEN: new AppError('You do not have permission to perform this action', 403, 'forbidden'),
  INSUFFICIENT_PRIVILEGES: new AppError('Insufficient privileges', 403, 'insufficient_privileges'),

  // Validation errors (400, 422)
  VALIDATION_ERROR: new AppError('Validation failed', 422, 'validation_error'),
  INVALID_INPUT: new AppError('Invalid input data', 400, 'invalid_input'),
  MISSING_FIELD: new AppError('Required field missing', 400, 'missing_field'),

  // Resource errors (404, 409)
  NOT_FOUND: new AppError('Resource not found', 404, 'not_found'),
  ALREADY_EXISTS: new AppError('Resource already exists', 409, 'already_exists'),

  // Rate limiting (429)
  RATE_LIMIT: new AppError('Too many requests. Please try again later.', 429, 'rate_limit_exceeded'),

  // Server errors (500, 503)
  INTERNAL_ERROR: new AppError('Internal server error', 500, 'internal_error'),
  SERVICE_UNAVAILABLE: new AppError('Service temporarily unavailable', 503, 'service_unavailable'),
  DATABASE_ERROR: new AppError('Database operation failed', 500, 'database_error'),
};

/**
 * Enhanced error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} _next - Express next function (unused in terminal middleware)
 */
function errorHandler(err, req, res, _next) {
  // Default to 500 if no status code is set
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log error with context
  const logMeta = {
    path: req.path,
    method: req.method,
    statusCode,
    errorCode: err.code,
    userId: req.userId,
    requestId: req.id,
    isOperational,
  };

  if (statusCode >= 500) {
    logger.error({ err, ...logMeta }, 'Server error');
  } else if (statusCode >= 400) {
    logger.warn({ err, ...logMeta }, 'Client error');
  }

  // Prepare response payload
  const payload = {
    error: {
      message: isOperational ? err.message : 'An unexpected error occurred',
      code: err.code || 'error',
      statusCode,
    },
  };

  // Add validation errors if present
  if (err.errors && Array.isArray(err.errors)) {
    payload.error.details = err.errors;
  }

  // Add metadata in non-production
  if (process.env.NODE_ENV !== 'production') {
    payload.error.stack = err.stack;
    if (err.meta) {
      payload.error.meta = err.meta;
    }
  }

  // Add request ID for traceability
  if (req.id) {
    payload.requestId = req.id;
  }

  // Send response
  res.status(statusCode).json(payload);
}

/**
 * Async error wrapper - catches async errors and passes to error handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error formatter
 */
function formatValidationErrors(errors) {
  return errors.map(err => ({
    field: err.param || err.path,
    message: err.msg || err.message,
    value: err.value,
  }));
}

/**
 * Create validation error
 */
function validationError(errors) {
  const err = new AppError('Validation failed', 422, 'validation_error');
  err.errors = formatValidationErrors(errors);
  return err;
}

/**
 * Create not found error
 */
function notFoundError(resource = 'Resource') {
  return new AppError(`${resource} not found`, 404, 'not_found', { resource });
}

/**
 * Create authentication error
 */
function authError(message = 'Authentication failed', code = 'auth_failed') {
  return new AppError(message, 401, code);
}

/**
 * Create authorization error
 */
function forbiddenError(message = 'Access forbidden') {
  return new AppError(message, 403, 'forbidden');
}

/**
 * Create rate limit error
 */
function rateLimitError() {
  return new AppError(
    'Too many requests from this IP. Please try again later.',
    429,
    'rate_limit_exceeded',
  );
}

module.exports = {
  AppError,
  ErrorTypes,
  errorHandler,
  asyncHandler,
  validationError,
  notFoundError,
  authError,
  forbiddenError,
  rateLimitError,
  formatValidationErrors,
};
