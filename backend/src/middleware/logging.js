/**
 * Logging Middleware for Express
 * Tracks all HTTP requests and responses with timing
 */

const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Request logging middleware
 * Attaches correlation ID and logs request/response
 */
const loggingMiddleware = (req, res, next) => {
  // Generate correlation ID for request tracking
  req.correlationId = req.get('X-Correlation-ID') || uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);
  
  // Capture request start time
  const startTime = Date.now();
  
  // Log incoming request
  logger.logRequest(req, {
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    bodySize: req.get('content-length')
  });
  
  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;
    
    // Calculate request duration
    const duration = Date.now() - startTime;
    
    // Log response
    logger.logResponse(req, res, duration);
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow Request Detected', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        correlationId: req.correlationId
      });
    }
    
    return res.send(data);
  };
  
  next();
};

/**
 * Error logging middleware
 * Logs all errors with full context
 */
const errorLoggingMiddleware = (err, req, res, next) => {
  logger.error('Request Error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    statusCode: err.statusCode || 500,
    userId: req.user?.id,
    correlationId: req.correlationId,
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  next(err);
};

module.exports = {
  loggingMiddleware,
  errorLoggingMiddleware
};
