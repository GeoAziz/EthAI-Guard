/**
 * Centralized Logging Configuration for EthixAI Backend
 * Using Winston for structured, production-ready logging
 *
 * Features:
 * - Structured JSON logging
 * - Multiple transports (Console, File, MongoDB)
 * - Environment-aware log levels
 * - Correlation IDs for request tracking
 * - Performance tracking
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');

// Determine log level based on environment
const getLogLevel = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'info';
  }
  if (process.env.NODE_ENV === 'test') {
    return 'error';
  }
  return 'debug';
};

// Custom format for development (colorized, readable)
const devFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}] ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      const metaStr = JSON.stringify(meta, null, 2);
      if (metaStr !== '{}') {
        log += `\n${metaStr}`;
      }
    }

    return log;
  }),
);

// Production format (structured JSON)
const prodFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json(),
);

// Create logger instance
const logger = createLogger({
  level: getLogLevel(),
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: {
    service: 'ethixai-backend',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.VERSION || '1.0.0',
  },
  transports: [
    // Console output (always enabled)
    new transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),

    // File output for errors
    new transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    }),

    // File output for all logs
    new transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    }),
  ],
  exitOnError: false,
});

// MongoDB transport (if configured)
if (process.env.MONGODB_URI && process.env.ENABLE_MONGODB_LOGGING === 'true') {
  const MongoDBTransport = require('winston-mongodb').MongoDB;

  logger.add(new MongoDBTransport({
    db: process.env.MONGODB_URI,
    collection: 'logs',
    level: 'info',
    options: {
      useUnifiedTopology: true,
    },
    metaKey: 'metadata',
    storeHost: true,
    capped: true,
    cappedSize: 104857600, // 100MB
    cappedMax: 100000,
  }));

  logger.info('MongoDB logging transport enabled');
}

/**
 * Create a child logger with additional context
 * @param {Object} context - Additional context to include in all logs
 * @returns {Logger} Child logger instance
 */
logger.child = (context) => {
  return logger.child({ ...context });
};

/**
 * Log API request
 * @param {Object} req - Express request object
 * @param {Object} meta - Additional metadata
 */
logger.logRequest = (req, meta = {}) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    correlationId: req.correlationId,
    ...meta,
  });
};

/**
 * Log API response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in ms
 */
logger.logResponse = (req, res, duration) => {
  const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

  logger.log(logLevel, 'HTTP Response', {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userId: req.user?.id,
    correlationId: req.correlationId,
  });
};

/**
 * Log model inference request
 * @param {Object} params - Inference parameters
 */
logger.logInference = (params) => {
  logger.info('Model Inference Request', {
    modelType: params.modelType,
    datasetSize: params.datasetSize,
    protectedAttributes: params.protectedAttributes,
    userId: params.userId,
    correlationId: params.correlationId,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log bias detection event
 * @param {Object} result - Bias detection result
 */
logger.logBiasDetection = (result) => {
  const logLevel = result.biasDetected ? 'warn' : 'info';

  logger.log(logLevel, 'Bias Detection Result', {
    biasDetected: result.biasDetected,
    fairnessScore: result.fairnessScore,
    protectedAttribute: result.protectedAttribute,
    metric: result.metric,
    threshold: result.threshold,
    actualValue: result.actualValue,
    userId: result.userId,
    correlationId: result.correlationId,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log security event
 * @param {string} event - Event type
 * @param {Object} details - Event details
 */
logger.logSecurityEvent = (event, details) => {
  logger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log compliance event (for audit trail)
 * @param {string} action - Action performed
 * @param {Object} details - Action details
 */
logger.logAudit = (action, details) => {
  logger.info('Audit Event', {
    action,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log performance metric
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in ms
 * @param {Object} meta - Additional metadata
 */
logger.logPerformance = (operation, duration, meta = {}) => {
  const logLevel = duration > 1000 ? 'warn' : 'debug';

  logger.log(logLevel, 'Performance Metric', {
    operation,
    duration: `${duration}ms`,
    ...meta,
  });
};

/**
 * Log database operation
 * @param {string} operation - DB operation (query, insert, update, etc.)
 * @param {string} collection - Collection/table name
 * @param {number} duration - Duration in ms
 */
logger.logDatabase = (operation, collection, duration) => {
  logger.debug('Database Operation', {
    operation,
    collection,
    duration: `${duration}ms`,
  });
};

/**
 * Log external API call
 * @param {string} service - External service name
 * @param {string} endpoint - API endpoint
 * @param {number} statusCode - Response status code
 * @param {number} duration - Duration in ms
 */
logger.logExternalAPI = (service, endpoint, statusCode, duration) => {
  const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'debug';

  logger.log(logLevel, 'External API Call', {
    service,
    endpoint,
    statusCode,
    duration: `${duration}ms`,
  });
};

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log startup
logger.info('Logger initialized', {
  level: getLogLevel(),
  environment: process.env.NODE_ENV || 'development',
  mongodbLogging: process.env.ENABLE_MONGODB_LOGGING === 'true',
});

module.exports = logger;
