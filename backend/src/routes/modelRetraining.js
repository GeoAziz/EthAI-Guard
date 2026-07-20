const express = require('express');
const ModelManager = require('../services/modelManager');
const retrainingScheduler = require('../services/retrainingScheduler');
const logger = require('../utils/logger');
const { authGuard } = require('../middleware/authGuard');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.get('/models', authGuard, async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;
    const models = await ModelManager.getModelVersions(
      { status },
      parseInt(limit)
    );
    res.json({
      success: true,
      data: models,
      count: models.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/models/:version', authGuard, async (req, res, next) => {
  try {
    const model = await ModelManager.getModelVersion(req.params.version);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model version not found',
      });
    }
    res.json({
      success: true,
      data: model,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/models/current/deployed', authGuard, async (req, res, next) => {
  try {
    const model = await ModelManager.getLatestDeployedModel();
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'No deployed model found',
      });
    }
    res.json({
      success: true,
      data: model,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/models/:version/deploy', authGuard, requireRole('admin'), async (req, res, next) => {
  try {
    const { canaryPercentage = 0 } = req.body;
    const deployedBy = req.user?.id || 'system';

    const model = await ModelManager.deployModel(
      req.params.version,
      deployedBy,
      canaryPercentage
    );

    logger.info({
      msg: 'model_deployed_via_api',
      version: req.params.version,
      canaryPercentage,
      deployedBy,
    });

    res.json({
      success: true,
      message: 'Model deployed successfully',
      data: model,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/models/:version/rollback', authGuard, requireRole('admin'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const rolledBackBy = req.user?.id || 'system';

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rollback reason is required',
      });
    }

    const previousModel = await ModelManager.rollbackModel(
      req.params.version,
      reason,
      rolledBackBy
    );

    logger.info({
      msg: 'model_rolled_back_via_api',
      from: req.params.version,
      to: previousModel.version,
      reason,
      rolledBackBy,
    });

    res.json({
      success: true,
      message: 'Model rolled back successfully',
      data: previousModel,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/models/:version/approve', authGuard, requireRole('admin'), async (req, res, next) => {
  try {
    const { type = 'performance', comments = '' } = req.body;
    const approver = req.user?.id || 'system';

    const model = await ModelManager.approveModel(
      req.params.version,
      approver,
      type,
      comments
    );

    logger.info({
      msg: 'model_approved_via_api',
      version: req.params.version,
      type,
      approver,
    });

    res.json({
      success: true,
      message: `Model approved for ${type}`,
      data: model,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/models/:version/compare', authGuard, requireRole('admin'), async (req, res, next) => {
  try {
    const comparison = await ModelManager.compareWithBaseline(req.params.version);
    res.json({
      success: true,
      data: comparison,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/retraining/trigger', authGuard, requireRole('admin'), async (req, res, next) => {
  try {
    const { triggerType = 'manual', scheduleId } = req.body;

    const job = await retrainingScheduler.triggerRetraining({
      triggerType,
      scheduleId,
    });

    logger.info({
      msg: 'retraining_triggered_via_api',
      jobId: job.jobId,
      triggerType,
    });

    res.json({
      success: true,
      message: 'Retraining job started',
      data: job,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/retraining/jobs', authGuard, async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;
    const jobs = await ModelManager.getRetrainingJobs(
      { status },
      parseInt(limit)
    );
    res.json({
      success: true,
      data: jobs,
      count: jobs.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/retraining/jobs/:jobId', authGuard, async (req, res, next) => {
  try {
    const job = await ModelManager.getRetrainingJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Retraining job not found',
      });
    }
    res.json({
      success: true,
      data: job,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/retraining/jobs/:jobId/cancel', authGuard, requireRole('admin'), async (req, res, next) => {
  try {
    const job = await ModelManager.updateRetrainingJob(req.params.jobId, {
      status: 'cancelled',
      'training.completedAt': new Date(),
    });

    logger.info({
      msg: 'retraining_job_cancelled_via_api',
      jobId: req.params.jobId,
    });

    res.json({
      success: true,
      message: 'Retraining job cancelled',
      data: job,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/retraining/schedules', authGuard, (req, res) => {
  const schedules = retrainingScheduler.getSchedules();
  res.json({
    success: true,
    data: schedules,
    count: schedules.length,
  });
});

router.get('/retraining/schedules/:scheduleId/status', authGuard, (req, res) => {
  const status = retrainingScheduler.getJobStatus(req.params.scheduleId);
  res.json({
    success: true,
    data: status,
  });
});

router.post('/retraining/schedules/:scheduleId/stop', authGuard, requireRole('admin'), (req, res) => {
  const stopped = retrainingScheduler.stopSchedule(req.params.scheduleId);

  if (stopped) {
    logger.info({
      msg: 'schedule_stopped_via_api',
      scheduleId: req.params.scheduleId,
    });
    res.json({
      success: true,
      message: 'Schedule stopped',
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Schedule not found',
    });
  }
});

module.exports = router;
