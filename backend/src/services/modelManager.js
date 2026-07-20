const ModelVersion = require('../models/ModelVersion');
const RetrainingJob = require('../models/RetrainingJob');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ModelManager {
  static async createModelVersion(versionData) {
    try {
      const version = new ModelVersion({
        version: versionData.version || `v${Date.now()}-${uuidv4().slice(0, 8)}`,
        modelHash: versionData.modelHash,
        status: 'training',
        metadata: versionData.metadata || {},
      });
      await version.save();
      logger.info({ msg: 'model_version_created', version: version.version });
      return version;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_create_model_version' });
      throw err;
    }
  }

  static async updateModelStatus(version, status, updateData = {}) {
    try {
      const update = { status, ...updateData };
      const doc = await ModelVersion.findOneAndUpdate(
        { version },
        update,
        { new: true }
      );
      logger.info({ msg: 'model_status_updated', version, status });
      return doc;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_update_model_status', version });
      throw err;
    }
  }

  static async getModelVersion(version) {
    try {
      return await ModelVersion.findOne({ version });
    } catch (err) {
      logger.error({ err, msg: 'failed_to_get_model_version', version });
      throw err;
    }
  }

  static async getLatestDeployedModel() {
    try {
      return await ModelVersion.findOne({ status: 'deployed' })
        .sort({ 'deployment.deployedAt': -1 })
        .lean();
    } catch (err) {
      logger.error({ err, msg: 'failed_to_get_latest_deployed_model' });
      throw err;
    }
  }

  static async getModelVersions(filters = {}, limit = 50) {
    try {
      const query = {};
      if (filters.status) query.status = filters.status;
      if (filters.after) query.createdAt = { $gte: new Date(filters.after) };

      return await ModelVersion.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (err) {
      logger.error({ err, msg: 'failed_to_list_model_versions', filters });
      throw err;
    }
  }

  static async updateEvaluation(version, evaluationData) {
    try {
      const doc = await ModelVersion.findOneAndUpdate(
        { version },
        {
          'evaluation': evaluationData,
          'status': evaluationData.fairnessViolations?.length > 0 || evaluationData.performanceViolations?.length > 0
            ? 'failed'
            : 'approved'
        },
        { new: true }
      );
      logger.info({ msg: 'model_evaluation_updated', version });
      return doc;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_update_evaluation', version });
      throw err;
    }
  }

  static async compareWithBaseline(version) {
    try {
      const current = await this.getModelVersion(version);
      const deployed = await this.getLatestDeployedModel();

      if (!deployed) {
        return { comparison: null, reason: 'no_baseline_model' };
      }

      const comparison = {
        previousVersion: deployed.version,
        performanceImprovement: (current.evaluation?.f1Score || 0) - (deployed.evaluation?.f1Score || 0),
        fairnessImprovement: (deployed.evaluation?.fairnessMetrics?.demographic_parity_difference || 0) -
                            (current.evaluation?.fairnessMetrics?.demographic_parity_difference || 0),
      };

      await ModelVersion.updateOne(
        { version },
        { comparison }
      );

      return comparison;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_compare_with_baseline', version });
      throw err;
    }
  }

  static async deployModel(version, deployBy = 'system', canaryPercentage = 0) {
    try {
      const doc = await ModelVersion.findOneAndUpdate(
        { version },
        {
          status: 'deployed',
          'deployment.deployedAt': new Date(),
          'deployment.deployedBy': deployBy,
          'deployment.canaryPercentage': canaryPercentage,
        },
        { new: true }
      );
      logger.info({ msg: 'model_deployed', version, canaryPercentage });
      return doc;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_deploy_model', version });
      throw err;
    }
  }

  static async rollbackModel(version, reason, rolledBackBy = 'system') {
    try {
      const current = await this.getModelVersion(version);
      const previous = await this.getLatestDeployedModel();

      if (!previous || previous.version === current.version) {
        throw new Error('No previous deployed model to rollback to');
      }

      await ModelVersion.updateOne(
        { version },
        {
          status: 'archived',
          'rollback.rolledBackAt': new Date(),
          'rollback.reason': reason,
          'rollback.previousVersion': previous.version,
          'rollback.rolledBackBy': rolledBackBy,
        }
      );

      await this.deployModel(previous.version, rolledBackBy);
      logger.info({ msg: 'model_rolled_back', from: version, to: previous.version, reason });
      return previous;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_rollback_model', version });
      throw err;
    }
  }

  static async approveModel(version, approver, type = 'performance', comments = '') {
    try {
      const field = `approvals.${type}Review`;
      const update = {
        [`${field}.approved`]: true,
        [`${field}.reviewedBy`]: approver,
        [`${field}.reviewedAt`]: new Date(),
        [`${field}.comments`]: comments,
      };

      const doc = await ModelVersion.findOneAndUpdate(
        { version },
        update,
        { new: true }
      );

      const allApproved = doc.approvals.performanceReview?.approved &&
                         doc.approvals.fairnessReview?.approved;

      if (allApproved && doc.status === 'approved') {
        await this.updateModelStatus(version, 'approved');
      }

      logger.info({ msg: 'model_approved', version, type, approver });
      return doc;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_approve_model', version });
      throw err;
    }
  }

  static async createRetrainingJob(jobData) {
    try {
      const job = new RetrainingJob({
        jobId: jobData.jobId || `job-${Date.now()}-${uuidv4().slice(0, 8)}`,
        scheduleId: jobData.scheduleId,
        status: 'scheduled',
        triggerType: jobData.triggerType || 'manual',
        scheduledFor: jobData.scheduledFor || new Date(),
      });
      await job.save();
      logger.info({ msg: 'retraining_job_created', jobId: job.jobId });
      return job;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_create_retraining_job' });
      throw err;
    }
  }

  static async getRetrainingJob(jobId) {
    try {
      return await RetrainingJob.findOne({ jobId });
    } catch (err) {
      logger.error({ err, msg: 'failed_to_get_retraining_job', jobId });
      throw err;
    }
  }

  static async updateRetrainingJob(jobId, updateData) {
    try {
      const job = await RetrainingJob.findOneAndUpdate(
        { jobId },
        updateData,
        { new: true }
      );
      logger.info({ msg: 'retraining_job_updated', jobId, status: updateData.status });
      return job;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_update_retraining_job', jobId });
      throw err;
    }
  }

  static async getRetrainingJobs(filters = {}, limit = 50) {
    try {
      const query = {};
      if (filters.status) query.status = filters.status;
      if (filters.after) query.createdAt = { $gte: new Date(filters.after) };

      return await RetrainingJob.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (err) {
      logger.error({ err, msg: 'failed_to_list_retraining_jobs', filters });
      throw err;
    }
  }
}

module.exports = ModelManager;
