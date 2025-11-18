const express = require('express');
const ModelCard = require('../models/ModelCard');
const auditLogger = require('../services/auditLogger');

const router = express.Router();

/**
 * @route   GET /api/model-cards
 * @desc    Get all Model Cards with filtering and pagination
 * @access  Public (in production, add authentication)
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      model_id,
      compliance_status,
      page = 1,
      limit = 20,
      sort = '-model_metadata.created_date'
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (model_id) {
      filter['model_metadata.model_id'] = model_id;
    }
    
    if (compliance_status) {
      filter['compliance_report.overall_status'] = compliance_status;
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [modelCards, total] = await Promise.all([
      ModelCard.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      ModelCard.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: modelCards,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_records: total,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching Model Cards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Model Cards',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/model-cards/stats
 * @desc    Get compliance statistics across all Model Cards
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await ModelCard.getComplianceStats();
    
    const statusBreakdown = await ModelCard.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        compliance: stats,
        status: statusBreakdown.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/model-cards/:id
 * @desc    Get a single Model Card by MongoDB _id
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const modelCard = await ModelCard.findById(req.params.id).select('-__v');
    
    if (!modelCard) {
      return res.status(404).json({
        success: false,
        error: 'Model Card not found'
      });
    }

    res.json({
      success: true,
      data: modelCard
    });

  } catch (error) {
    console.error('Error fetching Model Card:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Model Card ID'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch Model Card',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/model-cards/:model_id/versions
 * @desc    Get all versions of a specific model
 * @access  Public
 */
router.get('/:model_id/versions', async (req, res) => {
  try {
    const { model_id } = req.params;
    
    const versions = await ModelCard.find({
      'model_metadata.model_id': model_id
    })
      .sort({ 'model_metadata.version': -1 })
      .select('model_metadata.version model_metadata.created_date status compliance_report.overall_status')
      .lean();

    if (versions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No versions found for this model'
      });
    }

    res.json({
      success: true,
      data: {
        model_id,
        total_versions: versions.length,
        versions: versions.map(v => ({
          version: v.model_metadata.version,
          created_date: v.model_metadata.created_date,
          status: v.status,
          compliance_status: v.compliance_report?.overall_status || 'UNKNOWN'
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching model versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch model versions',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/model-cards
 * @desc    Create or update a Model Card
 * @access  Protected (should require authentication in production)
 */
router.post('/', async (req, res) => {
  try {
    const modelCardData = req.body;
    
    // Validate required fields
    if (!modelCardData.model_metadata?.model_id || !modelCardData.model_metadata?.version) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: model_metadata.model_id and model_metadata.version'
      });
    }

    // Check if Model Card already exists
    const existing = await ModelCard.findOne({
      'model_metadata.model_id': modelCardData.model_metadata.model_id,
      'model_metadata.version': modelCardData.model_metadata.version
    });

    let modelCard;
    let action;

    if (existing) {
      // Update existing Model Card
      Object.assign(existing, modelCardData);
      modelCard = await existing.save();
      action = 'updated';
    } else {
      // Create new Model Card
      modelCard = new ModelCard(modelCardData);
      await modelCard.save();
      action = 'created';
    }

    // Log audit event
    await auditLogger.log({
      event_type: 'MODEL_CARD_UPLOAD',
      model_id: modelCard.model_metadata.model_id,
      model_version: modelCard.model_metadata.version,
      actor: req.user?.username || 'system',
      action: `model_card_${action}`,
      result: 'success',
      details: {
        document_id: modelCard._id,
        status: modelCard.status,
        compliance_status: modelCard.compliance_report?.overall_status
      }
    });

    res.status(existing ? 200 : 201).json({
      success: true,
      message: `Model Card ${action} successfully`,
      data: modelCard
    });

  } catch (error) {
    console.error('Error creating/updating Model Card:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create/update Model Card',
      message: error.message
    });
  }
});

/**
 * @route   PATCH /api/model-cards/:id/status
 * @desc    Update Model Card status (DRAFT → REVIEW → APPROVED → PRODUCTION)
 * @access  Protected
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['DRAFT', 'REVIEW', 'APPROVED', 'PRODUCTION', 'DEPRECATED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const modelCard = await ModelCard.findById(req.params.id);
    
    if (!modelCard) {
      return res.status(404).json({
        success: false,
        error: 'Model Card not found'
      });
    }

    const oldStatus = modelCard.status;
    modelCard.status = status;
    await modelCard.save();

    // Log audit event
    await auditLogger.log({
      event_type: 'MODEL_STATUS_CHANGE',
      model_id: modelCard.model_metadata.model_id,
      model_version: modelCard.model_metadata.version,
      actor: req.user?.username || 'system',
      action: 'status_update',
      result: 'success',
      details: {
        document_id: modelCard._id,
        old_status: oldStatus,
        new_status: status
      }
    });

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: {
        model_id: modelCard.model_metadata.model_id,
        version: modelCard.model_metadata.version,
        old_status: oldStatus,
        new_status: status
      }
    });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/model-cards/:id
 * @desc    Soft delete a Model Card (set status to DEPRECATED)
 * @access  Protected
 */
router.delete('/:id', async (req, res) => {
  try {
    const modelCard = await ModelCard.findById(req.params.id);
    
    if (!modelCard) {
      return res.status(404).json({
        success: false,
        error: 'Model Card not found'
      });
    }

    modelCard.status = 'DEPRECATED';
    await modelCard.save();

    // Log audit event
    await auditLogger.log({
      event_type: 'MODEL_DEPRECATION',
      model_id: modelCard.model_metadata.model_id,
      model_version: modelCard.model_metadata.version,
      actor: req.user?.username || 'system',
      action: 'model_deprecated',
      result: 'success',
      details: {
        document_id: modelCard._id,
        deprecated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Model Card deprecated successfully',
      data: {
        model_id: modelCard.model_metadata.model_id,
        version: modelCard.model_metadata.version,
        status: 'DEPRECATED'
      }
    });

  } catch (error) {
    console.error('Error deprecating Model Card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deprecate Model Card',
      message: error.message
    });
  }
});

module.exports = router;
