const pino = require('pino');

// Use a simple environment-driven level and pretty print in non-production
const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Avoid creating the pino-pretty worker in test mode (Jest open handle).
// Only enable the pretty transport in non-production, non-test environments.
const baseLogger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  transport:
    isProd || isTest
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' }
        }
});

// helper to create child loggers with request context
function loggerWithRequest(req) {
  if (!req) return baseLogger;
  const meta = {};
  if (req.headers && req.headers['x-request-id']) meta.request_id = req.headers['x-request-id'];
  if (req.user && req.user.sub) meta.user_id = req.user.sub;
  return baseLogger.child(meta);
}

module.exports = baseLogger;
module.exports.withRequest = loggerWithRequest;
