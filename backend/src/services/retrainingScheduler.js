const cron = require('node-cron');
const axios = require('axios');
const ModelManager = require('./modelManager');
const logger = require('../utils/logger');

class RetrainingScheduler {
  constructor() {
    this.jobs = new Map();
    this.isEnabled = process.env.ENABLE_MODEL_RETRAINING !== '0';
    this.aiCoreUrl = process.env.AI_CORE_URL || 'http://localhost:8100';
    this.schedules = [];
  }

  async initialize() {
    if (!this.isEnabled) {
      logger.info({ msg: 'retraining_scheduler_disabled' });
      return;
    }

    try {
      await this.loadSchedulesFromConfig();
      await this.scheduleDefaultJobs();
      logger.info({ msg: 'retraining_scheduler_initialized' });
    } catch (err) {
      logger.error({ err, msg: 'failed_to_initialize_retraining_scheduler' });
    }
  }

  async loadSchedulesFromConfig() {
    try {
      const defaultSchedules = [
        {
          id: 'daily-retraining',
          schedule: '0 2 * * *',
          triggerType: 'scheduled',
          enabled: true,
          description: 'Daily model retraining at 2 AM',
        },
        {
          id: 'weekly-full-evaluation',
          schedule: '0 3 * * 0',
          triggerType: 'scheduled',
          enabled: true,
          description: 'Weekly full model evaluation on Sunday at 3 AM',
        },
      ];

      this.schedules = defaultSchedules;
      logger.info({ msg: 'schedules_loaded', count: defaultSchedules.length });
    } catch (err) {
      logger.error({ err, msg: 'failed_to_load_schedules' });
    }
  }

  async scheduleDefaultJobs() {
    for (const schedule of this.schedules) {
      if (schedule.enabled) {
        this.scheduleJob(schedule);
      }
    }
  }

  scheduleJob(schedule) {
    try {
      const task = cron.schedule(schedule.schedule, async () => {
        logger.info({ msg: 'scheduled_retraining_triggered', scheduleId: schedule.id });
        await this.triggerRetraining({
          scheduleId: schedule.id,
          triggerType: schedule.triggerType,
        });
      });

      this.jobs.set(schedule.id, task);
      logger.info({ msg: 'retraining_job_scheduled', scheduleId: schedule.id, cron: schedule.schedule });
    } catch (err) {
      logger.error({ err, msg: 'failed_to_schedule_job', scheduleId: schedule.id });
    }
  }

  async triggerRetraining(options = {}) {
    try {
      const jobData = {
        triggerType: options.triggerType || 'manual',
        scheduleId: options.scheduleId,
        scheduledFor: new Date(),
      };

      const job = await ModelManager.createRetrainingJob(jobData);

      await this.executeRetraining(job);

      return job;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_trigger_retraining', options });
      throw err;
    }
  }

  async executeRetraining(job) {
    try {
      await ModelManager.updateRetrainingJob(job.jobId, {
        status: 'running',
        'training.startedAt': new Date(),
      });

      const request = {
        action: 'retrain_model',
        jobId: job.jobId,
        config: {
          samplingPercentage: 100,
          validationSplit: 0.2,
        },
      };

      try {
        const response = await axios.post(
          `${this.aiCoreUrl}/ai_core/retrain`,
          request,
          { timeout: 600000 }
        );

        const trainingData = {
          'training.completedAt': new Date(),
          'training.duration_ms': response.data.duration_ms,
          'model.modelVersion': response.data.model_version,
          'model.modelHash': response.data.model_hash,
          'evaluation.status': 'running',
        };

        await ModelManager.updateRetrainingJob(job.jobId, trainingData);

        await this.evaluateModel(job.jobId, response.data.model_version);
      } catch (aiErr) {
        logger.error({ err: aiErr, msg: 'ai_core_retraining_failed', jobId: job.jobId });

        await ModelManager.updateRetrainingJob(job.jobId, {
          status: 'failed',
          'training.errors': [aiErr.message],
          'training.completedAt': new Date(),
        });

        throw aiErr;
      }
    } catch (err) {
      logger.error({ err, msg: 'failed_to_execute_retraining', jobId: job.jobId });
      throw err;
    }
  }

  async evaluateModel(jobId, modelVersion) {
    try {
      const request = {
        action: 'evaluate_model',
        model_version: modelVersion,
        jobId,
      };

      const response = await axios.post(
        `${this.aiCoreUrl}/ai_core/evaluate`,
        request,
        { timeout: 300000 }
      );

      const evaluationData = {
        'evaluation.completedAt': new Date(),
        'evaluation.metrics': response.data.metrics,
        'evaluation.status': response.data.status || 'passed',
        'metrics.performanceScore': response.data.performance_score,
        'metrics.fairnessScore': response.data.fairness_score,
        'metrics.recommendedForProduction': response.data.recommended_for_production,
      };

      if (response.data.fairness_violations?.length > 0) {
        evaluationData['evaluation.status'] = 'failed';
      }

      await ModelManager.updateRetrainingJob(jobId, evaluationData);

      if (response.data.recommended_for_production) {
        await this.approveAndDeployModel(jobId, modelVersion);
      } else {
        await ModelManager.updateRetrainingJob(jobId, {
          status: 'completed',
          'approval.status': 'rejected',
          'approval.rejectionReason': 'Failed evaluation criteria',
        });
      }

      logger.info({ msg: 'model_evaluation_completed', jobId, modelVersion });
    } catch (err) {
      logger.error({ err, msg: 'failed_to_evaluate_model', jobId });

      await ModelManager.updateRetrainingJob(jobId, {
        'evaluation.status': 'failed',
        'evaluation.errors': [err.message],
        status: 'completed',
      });

      throw err;
    }
  }

  async approveAndDeployModel(jobId, modelVersion) {
    try {
      await ModelManager.updateRetrainingJob(jobId, {
        'approval.status': 'approved',
        'approval.approvalTime': new Date(),
        'deployment.status': 'in-progress',
        'deployment.startedAt': new Date(),
      });

      const deployed = await ModelManager.deployModel(modelVersion, 'scheduler', 10);

      await ModelManager.updateRetrainingJob(jobId, {
        'deployment.status': 'complete',
        'deployment.completedAt': new Date(),
        status: 'completed',
      });

      logger.info({ msg: 'model_approved_and_deployed', jobId, modelVersion });
    } catch (err) {
      logger.error({ err, msg: 'failed_to_approve_and_deploy_model', jobId });

      await ModelManager.updateRetrainingJob(jobId, {
        'deployment.status': 'failed',
        'deployment.errors': [err.message],
        status: 'completed',
      });

      throw err;
    }
  }

  stopSchedule(scheduleId) {
    const task = this.jobs.get(scheduleId);
    if (task) {
      task.stop();
      this.jobs.delete(scheduleId);
      logger.info({ msg: 'schedule_stopped', scheduleId });
      return true;
    }
    return false;
  }

  stopAll() {
    for (const [id, task] of this.jobs) {
      task.stop();
    }
    this.jobs.clear();
    logger.info({ msg: 'all_schedules_stopped' });
  }

  getSchedules() {
    return this.schedules;
  }

  getJobStatus(scheduleId) {
    return {
      scheduleId,
      active: this.jobs.has(scheduleId),
      schedule: this.schedules.find(s => s.id === scheduleId),
    };
  }
}

module.exports = new RetrainingScheduler();
