const pino = require('pino');

// Use a simple environment-driven level and pretty print in non-production
const isProd = process.env.NODE_ENV === 'production';
const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' }
      }
});

module.exports = logger;
