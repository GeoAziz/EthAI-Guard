const pino = require('pino');

// Use a simple environment-driven level and pretty print in non-production
const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Safe transport policy:
// - In test mode we MUST NOT enable threaded transports (they create open handles).
// - Only enable the pretty transport in non-production if explicitly requested via
//   ENABLE_PINO_PRETTY=1. This avoids surprising worker creation in CI/test runs.
const enablePretty = !isProd && !isTest && String(process.env.ENABLE_PINO_PRETTY || '0') === '1';

const baseLogger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  transport: enablePretty
    ? {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard' },
    }
    : undefined,
});

// helper to create child loggers with request context
function loggerWithRequest(req) {
  if (!req) {
    return baseLogger;
  }
  const meta = {};
  if (req.headers && req.headers['x-request-id']) {
    meta.request_id = req.headers['x-request-id'];
  }
  if (req.user && req.user.sub) {
    meta.user_id = req.user.sub;
  }
  return baseLogger.child(meta);
}

module.exports = baseLogger;
module.exports.withRequest = loggerWithRequest;
