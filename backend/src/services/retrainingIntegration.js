const ModelManager = require('./modelManager');
const axios = require('axios');
const logger = require('../utils/logger');

class RetrainingIntegration {
  constructor(aiCoreUrl = 'http://localhost:8100') {
    this.aiCoreUrl = aiCoreUrl;
  }

  async handleRetrainingCompletion(job) {
    try {
      logger.info({
        msg: 'handling_retraining_completion',
        jobId: job.jobId,
        status: job.status,
      });

      if (job.status !== 'completed') {
        logger.warn({
          msg: 'job_not_completed',
          jobId: job.jobId,
          status: job.status,
        });
        return;
      }

      const modelVersion = job.model?.modelVersion;
      if (!modelVersion) {
        logger.error({
          msg: 'no_model_version_in_job',
          jobId: job.jobId,
        });
        return;
      }

      const model = await ModelManager.getModelVersion(modelVersion);
      if (!model) {
        logger.error({
          msg: 'model_version_not_found',
          jobId: job.jobId,
          modelVersion,
        });
        return;
      }

      if (job.metrics?.recommendedForProduction) {
        await this.promoteModelToProduction(modelVersion, job);
      } else {
        await this.archiveFailedModel(modelVersion, job);
      }
    } catch (err) {
      logger.error({
        err,
        msg: 'failed_to_handle_retraining_completion',
        jobId: job.jobId,
      });
    }
  }

  async promoteModelToProduction(modelVersion, job) {
    try {
      logger.info({
        msg: 'promoting_model_to_production',
        modelVersion,
        performanceScore: job.metrics?.performanceScore,
        fairnessScore: job.metrics?.fairnessScore,
      });

      await ModelManager.deployModel(modelVersion, 'scheduler', 10);

      await this.sendNotification({
        type: 'MODEL_PROMOTED',
        modelVersion,
        message: `Model ${modelVersion} promoted to production (canary 10%)`,
        metrics: job.metrics,
      });

      logger.info({
        msg: 'model_promoted_successfully',
        modelVersion,
      });
    } catch (err) {
      logger.error({
        err,
        msg: 'failed_to_promote_model',
        modelVersion,
      });
      throw err;
    }
  }

  async archiveFailedModel(modelVersion, job) {
    try {
      logger.info({
        msg: 'archiving_failed_model',
        modelVersion,
        reason: 'did_not_meet_production_criteria',
      });

      await ModelManager.updateModelStatus(modelVersion, 'archived', {
        'evaluation.status': 'failed',
        'evaluation.completedAt': new Date(),
      });

      await this.sendNotification({
        type: 'MODEL_EVALUATION_FAILED',
        modelVersion,
        message: `Model ${modelVersion} failed evaluation`,
        metrics: job.metrics,
      });
    } catch (err) {
      logger.error({
        err,
        msg: 'failed_to_archive_model',
        modelVersion,
      });
    }
  }

  async compareModels(newModelVersion) {
    try {
      const deployed = await ModelManager.getLatestDeployedModel();
      const newModel = await ModelManager.getModelVersion(newModelVersion);

      if (!deployed || !newModel) {
        return null;
      }

      const comparison = {
        baseline: deployed.version,
        candidate: newModelVersion,
        accuracyImprovement: (newModel.evaluation?.accuracy || 0) - (deployed.evaluation?.accuracy || 0),
        f1Improvement: (newModel.evaluation?.f1_score || 0) - (deployed.evaluation?.f1_score || 0),
        fairnessImprovement: (deployed.evaluation?.fairnessMetrics?.demographic_parity_difference || 0) -
                            (newModel.evaluation?.fairnessMetrics?.demographic_parity_difference || 0),
      };

      return comparison;
    } catch (err) {
      logger.error({
        err,
        msg: 'failed_to_compare_models',
        newModelVersion,
      });
      return null;
    }
  }

  async triggerDriftDetection() {
    try {
      logger.info({ msg: 'triggering_drift_detection' });

      const response = await axios.get(`${this.aiCoreUrl}/ai_core/drift/check`, {
        timeout: 30000,
      });

      if (response.data.drift_detected) {
        logger.warn({
          msg: 'data_drift_detected',
          driftScore: response.data.drift_score,
        });

        if (response.data.drift_score > 0.5) {
          await ModelManager.createRetrainingJob({
            triggerType: 'drift-detected',
            scheduledFor: new Date(),
          });

          await this.sendNotification({
            type: 'DRIFT_DETECTED',
            message: 'Data drift detected, triggering automatic retraining',
            driftScore: response.data.drift_score,
          });
        }
      }

      return response.data;
    } catch (err) {
      logger.error({
        err,
        msg: 'drift_detection_failed',
      });
      return null;
    }
  }

  async triggerPerformanceMonitoring() {
    try {
      logger.info({ msg: 'triggering_performance_monitoring' });

      const response = await axios.get(`${this.aiCoreUrl}/metrics`, {
        timeout: 30000,
      });

      const productionModel = await ModelManager.getLatestDeployedModel();
      if (!productionModel) {
        return null;
      }

      const baselineAccuracy = productionModel.evaluation?.accuracy || 1.0;
      const currentAccuracy = response.data.model_accuracy || 1.0;
      const degradation = baselineAccuracy - currentAccuracy;

      if (degradation > 0.05) {
        logger.warn({
          msg: 'performance_degradation_detected',
          baseline: baselineAccuracy,
          current: currentAccuracy,
          degradation,
        });

        await ModelManager.createRetrainingJob({
          triggerType: 'performance-degradation',
          scheduledFor: new Date(),
        });

        await this.sendNotification({
          type: 'PERFORMANCE_DEGRADATION',
          message: `Model accuracy degraded from ${baselineAccuracy.toFixed(3)} to ${currentAccuracy.toFixed(3)}`,
          degradation,
        });
      }

      return response.data;
    } catch (err) {
      logger.error({
        err,
        msg: 'performance_monitoring_failed',
      });
      return null;
    }
  }

  async sendNotification(notification) {
    try {
      logger.info({
        msg: 'sending_notification',
        type: notification.type,
      });

      if (process.env.RETRAIN_WEBHOOK_URL) {
        await axios.post(process.env.RETRAIN_WEBHOOK_URL, notification, {
          timeout: 5000,
        });
      }

      if (process.env.RETRAIN_SLACK_CHANNEL) {
        await this.sendSlackNotification(notification);
      }
    } catch (err) {
      logger.error({
        err,
        msg: 'failed_to_send_notification',
      });
    }
  }

  async sendSlackNotification(notification) {
    try {
      if (!process.env.SLACK_WEBHOOK_URL) {
        return;
      }

      const message = {
        channel: process.env.RETRAIN_SLACK_CHANNEL,
        text: notification.message || `Model Retraining: ${notification.type}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${notification.type}*\n${notification.message}`,
            },
          },
        ],
      };

      await axios.post(process.env.SLACK_WEBHOOK_URL, message, {
        timeout: 5000,
      });
    } catch (err) {
      logger.error({
        err,
        msg: 'failed_to_send_slack_notification',
      });
    }
  }

  async rollbackOnFailure(failedModelVersion, reason) {
    try {
      logger.error({
        msg: 'rolling_back_model_on_failure',
        modelVersion: failedModelVersion,
        reason,
      });

      const previousModel = await ModelManager.rollbackModel(
        failedModelVersion,
        reason,
        'automatic'
      );

      await this.sendNotification({
        type: 'MODEL_ROLLBACK',
        message: `Model ${failedModelVersion} rolled back to ${previousModel.version}`,
        reason,
      });

      return previousModel;
    } catch (err) {
      logger.error({
        err,
        msg: 'failed_to_rollback_on_failure',
        modelVersion: failedModelVersion,
      });
      throw err;
    }
  }
}

module.exports = new RetrainingIntegration(process.env.AI_CORE_URL || 'http://localhost:8100');
