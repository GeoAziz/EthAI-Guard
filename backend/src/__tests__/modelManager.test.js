const ModelManager = require('../services/modelManager');
const ModelVersion = require('../models/ModelVersion');
const RetrainingJob = require('../models/RetrainingJob');

jest.mock('../models/ModelVersion');
jest.mock('../models/RetrainingJob');

describe('ModelManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createModelVersion', () => {
    it('should create a new model version with correct fields', async () => {
      const mockVersion = {
        version: 'v123',
        modelHash: 'abc123',
        status: 'training',
        save: jest.fn().mockResolvedValue(true),
      };

      ModelVersion.mockImplementation(() => mockVersion);

      const result = await ModelManager.createModelVersion({
        version: 'v123',
        modelHash: 'abc123',
        metadata: { framework: 'sklearn' },
      });

      expect(result).toBeDefined();
      expect(mockVersion.save).toHaveBeenCalled();
    });
  });

  describe('getModelVersion', () => {
    it('should retrieve a model version by version string', async () => {
      const mockModel = {
        version: 'v123',
        status: 'deployed',
      };

      ModelVersion.findOne = jest.fn().mockResolvedValue(mockModel);

      const result = await ModelManager.getModelVersion('v123');

      expect(result).toEqual(mockModel);
      expect(ModelVersion.findOne).toHaveBeenCalledWith({ version: 'v123' });
    });
  });

  describe('deployModel', () => {
    it('should update model status to deployed', async () => {
      const mockModel = {
        version: 'v123',
        status: 'deployed',
      };

      ModelVersion.findOneAndUpdate = jest.fn().mockResolvedValue(mockModel);

      const result = await ModelManager.deployModel('v123', 'testUser', 10);

      expect(result).toBeDefined();
      expect(ModelVersion.findOneAndUpdate).toHaveBeenCalled();
      expect(result.status).toBe('deployed');
    });
  });

  describe('rollbackModel', () => {
    it('should rollback to previous deployed model', async () => {
      const currentModel = {
        version: 'v123',
        status: 'deployed',
      };

      const previousModel = {
        version: 'v122',
        status: 'deployed',
      };

      ModelVersion.findOne = jest
        .fn()
        .mockResolvedValueOnce(currentModel)
        .mockResolvedValueOnce(previousModel);

      ModelVersion.findOneAndUpdate = jest.fn().mockResolvedValue(currentModel);

      const result = await ModelManager.rollbackModel('v123', 'Test rollback');

      expect(result).toBeDefined();
    });
  });

  describe('createRetrainingJob', () => {
    it('should create a new retraining job', async () => {
      const mockJob = {
        jobId: 'job-123',
        status: 'scheduled',
        save: jest.fn().mockResolvedValue(true),
      };

      RetrainingJob.mockImplementation(() => mockJob);

      const result = await ModelManager.createRetrainingJob({
        jobId: 'job-123',
        triggerType: 'scheduled',
      });

      expect(result).toBeDefined();
      expect(mockJob.save).toHaveBeenCalled();
    });
  });

  describe('updateRetrainingJob', () => {
    it('should update a retraining job', async () => {
      const mockJob = {
        jobId: 'job-123',
        status: 'running',
      };

      RetrainingJob.findOneAndUpdate = jest.fn().mockResolvedValue(mockJob);

      const result = await ModelManager.updateRetrainingJob('job-123', {
        status: 'running',
      });

      expect(result).toBeDefined();
      expect(RetrainingJob.findOneAndUpdate).toHaveBeenCalled();
    });
  });
});
