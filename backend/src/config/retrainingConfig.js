const logger = require('../utils/logger');

const RetrainingConfig = {
  enabled: process.env.ENABLE_MODEL_RETRAINING !== '0',
  aiCoreUrl: process.env.AI_CORE_URL || 'http://localhost:8100',

  schedules: [
    {
      id: 'daily-retraining',
      cron: process.env.RETRAIN_DAILY_SCHEDULE || '0 2 * * *',
      description: 'Daily model retraining at 2 AM UTC',
      enabled: process.env.RETRAIN_DAILY_ENABLED !== '0',
    },
    {
      id: 'weekly-evaluation',
      cron: process.env.RETRAIN_WEEKLY_SCHEDULE || '0 3 * * 0',
      description: 'Weekly comprehensive evaluation on Sunday at 3 AM UTC',
      enabled: process.env.RETRAIN_WEEKLY_ENABLED !== '0',
    },
  ],

  evaluation: {
    minAccuracy: parseFloat(process.env.MIN_MODEL_ACCURACY || '0.70'),
    minF1Score: parseFloat(process.env.MIN_MODEL_F1 || '0.65'),
    maxFairnessViolations: parseInt(process.env.MAX_FAIRNESS_VIOLATIONS || '0'),
  },

  deployment: {
    autoApprove: process.env.AUTO_APPROVE_MODELS === '1',
    canaryPercentage: parseInt(process.env.CANARY_DEPLOYMENT_PERCENT || '10'),
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_RETRAIN_JOBS || '1'),
  },

  notifications: {
    enabled: process.env.ENABLE_RETRAIN_NOTIFICATIONS === '1',
    webhookUrl: process.env.RETRAIN_WEBHOOK_URL,
    slackChannel: process.env.RETRAIN_SLACK_CHANNEL,
  },

  logging: {
    level: process.env.RETRAIN_LOG_LEVEL || 'info',
    detailed: process.env.RETRAIN_DETAILED_LOGS === '1',
  },
};

logger.info({ config: RetrainingConfig }, 'retraining_config_loaded');

module.exports = RetrainingConfig;
