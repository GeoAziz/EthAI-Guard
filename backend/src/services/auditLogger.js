/**
 * Audit Logger Service
 * 
 * Logs all governance events (model card generation, compliance checks, policy violations)
 * with full traceability for regulatory compliance.
 */

const AuditLog = require('../models/AuditLog');

class AuditLogger {
  /**
   * Log a governance event
   * @param {Object} event - Event details
   * @param {string} event.type - Event type
   * @param {string} event.model_id - Model ID
   * @param {string} event.model_version - Model version
   * @param {string} event.actor - Who performed the action
   * @param {string} event.action - Human-readable action description
   * @param {string} event.status - PASS, WARNING, FAIL, INFO
   * @param {Object} event.details - Additional event details
   * @param {string} event.compliance_status - COMPLIANT, NON_COMPLIANT, UNDER_REVIEW
   * @param {Array} event.policy_violations - List of policy violations
   * @param {Object} event.metadata - Additional metadata
   * @returns {Promise<AuditLog>}
   */
  async log(event) {
    try {
      const auditEntry = new AuditLog({
        timestamp: new Date(),
        event_type: event.type,
        model_id: event.model_id,
        model_version: event.model_version,
        actor: event.actor || 'system',
        actor_type: this._determineActorType(event.actor),
        action: event.action,
        status: event.status,
        details: event.details || {},
        compliance_status: event.compliance_status,
        policy_violations: event.policy_violations || [],
        metadata: {
          ...event.metadata,
          ip_address: event.ip_address ? this._hashIP(event.ip_address) : undefined,
          git_commit: process.env.GITHUB_SHA,
          ci_run_id: process.env.GITHUB_RUN_ID,
          environment: process.env.NODE_ENV || 'development'
        },
        related_entities: event.related_entities || []
      });
      
      await auditEntry.save();
      
      // If critical violation, send alert
      if (event.status === 'FAIL' && this._isCritical(event.policy_violations)) {
        await this.sendCriticalAlert(auditEntry);
      }
      
      console.log(`✅ Audit log created: ${auditEntry._id} (${event.type})`);
      return auditEntry;
      
    } catch (error) {
      console.error('❌ Failed to create audit log:', error);
      throw error;
    }
  }
  
  /**
   * Determine actor type from actor string
   */
  _determineActorType(actor) {
    if (!actor || actor === 'system') return 'system';
    if (actor === 'github-actions') return 'ci_cd';
    return 'human';
  }
  
  /**
   * Hash IP address for privacy (SHA-256)
   */
  _hashIP(ip) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'salt').digest('hex');
  }
  
  /**
   * Check if violations are critical
   */
  _isCritical(violations) {
    if (!violations || !Array.isArray(violations)) return false;
    return violations.some(v => v.severity === 'CRITICAL');
  }
  
  /**
   * Query audit logs with filters
   * @param {Object} filters - Query filters
   * @param {string} filters.model_id - Filter by model ID
   * @param {string} filters.event_type - Filter by event type
   * @param {string} filters.status - Filter by status
   * @param {string} filters.compliance_status - Filter by compliance status
   * @param {string} filters.actor - Filter by actor
   * @param {string} filters.start_date - Filter by start date (ISO string)
   * @param {string} filters.end_date - Filter by end date (ISO string)
   * @param {Object} options - Pagination options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 50, max: 200)
   * @returns {Promise<Object>} Logs and pagination info
   */
  async query(filters = {}, options = {}) {
    const query = {};
    
    // Build query
    if (filters.model_id) query.model_id = filters.model_id;
    if (filters.event_type) query.event_type = filters.event_type;
    if (filters.status) query.status = filters.status;
    if (filters.compliance_status) query.compliance_status = filters.compliance_status;
    if (filters.actor) query.actor = filters.actor;
    
    // Date range filter
    if (filters.start_date || filters.end_date) {
      query.timestamp = {};
      if (filters.start_date) query.timestamp.$gte = new Date(filters.start_date);
      if (filters.end_date) query.timestamp.$lte = new Date(filters.end_date);
    }
    
    // Pagination
    const page = Math.max(1, parseInt(options.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(options.limit) || 50));
    const skip = (page - 1) * limit;
    
    try {
      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(query)
      ]);
      
      return {
        success: true,
        logs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Audit log query failed:', error);
      throw error;
    }
  }
  
  /**
   * Get complete audit trail for a specific model
   * @param {string} model_id - Model ID
   * @returns {Promise<Array>} Audit trail
   */
  async getModelAuditTrail(model_id) {
    try {
      const trail = await AuditLog.find({ model_id })
        .sort({ timestamp: -1 })
        .lean();
      
      // Build summary
      const summary = {
        total_events: trail.length,
        latest_version: trail[0]?.model_version,
        compliance_status: this._deriveComplianceStatus(trail),
        last_audit: this._getLastAudit(trail)
      };
      
      return {
        success: true,
        model_id,
        trail,
        summary
      };
    } catch (error) {
      console.error(`❌ Failed to get audit trail for ${model_id}:`, error);
      throw error;
    }
  }
  
  /**
   * Derive overall compliance status from audit trail
   */
  _deriveComplianceStatus(trail) {
    const complianceChecks = trail.filter(e => e.event_type === 'compliance_check');
    if (complianceChecks.length === 0) return 'UNKNOWN';
    
    const latest = complianceChecks[0];
    return latest.compliance_status || 'UNKNOWN';
  }
  
  /**
   * Get timestamp of last compliance audit
   */
  _getLastAudit(trail) {
    const audit = trail.find(e => e.event_type === 'compliance_audit');
    return audit?.timestamp?.toISOString();
  }
  
  /**
   * Get governance summary statistics
   * @param {Object} options - Query options
   * @param {string} options.period - Time period (last_30_days, last_90_days, etc.)
   * @returns {Promise<Object>} Summary statistics
   */
  async getSummary(options = {}) {
    const period = options.period || 'last_30_days';
    const startDate = this._calculateStartDate(period);
    
    try {
      const logs = await AuditLog.find({
        timestamp: { $gte: startDate }
      }).lean();
      
      // Calculate statistics
      const summary = {
        period,
        total_logs: logs.length,
        compliance_checks: logs.filter(l => l.event_type === 'compliance_check').length,
        policy_violations: logs.filter(l => l.event_type === 'policy_violation').length,
        models_deployed: logs.filter(l => l.event_type === 'model_deployed').length,
        non_compliant_models: logs.filter(l => l.compliance_status === 'NON_COMPLIANT').length
      };
      
      // Calculate compliance rate
      const complianceChecks = logs.filter(l => l.event_type === 'compliance_check');
      const passed = complianceChecks.filter(l => l.status === 'PASS').length;
      summary.compliance_rate = complianceChecks.length > 0 
        ? passed / complianceChecks.length 
        : 1.0;
      
      // Group by event type
      summary.by_event_type = this._groupByField(logs, 'event_type');
      
      // Group by status
      summary.by_status = this._groupByField(logs, 'status');
      
      return {
        success: true,
        summary
      };
    } catch (error) {
      console.error('❌ Failed to generate summary:', error);
      throw error;
    }
  }
  
  /**
   * Calculate start date based on period
   */
  _calculateStartDate(period) {
    const now = new Date();
    switch (period) {
      case 'last_7_days':
        return new Date(now.setDate(now.getDate() - 7));
      case 'last_30_days':
        return new Date(now.setDate(now.getDate() - 30));
      case 'last_90_days':
        return new Date(now.setDate(now.getDate() - 90));
      case 'last_year':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setDate(now.getDate() - 30));
    }
  }
  
  /**
   * Group logs by a specific field
   */
  _groupByField(logs, field) {
    return logs.reduce((acc, log) => {
      const key = log[field] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
  
  /**
   * Send critical alert via Slack webhook
   * @param {AuditLog} auditEntry - Audit log entry
   */
  async sendCriticalAlert(auditEntry) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('⚠️ SLACK_WEBHOOK_URL not configured, skipping alert');
      return;
    }
    
    const message = this._formatSlackMessage(auditEntry);
    
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      
      if (!response.ok) {
        console.error(`❌ Slack alert failed: ${response.statusText}`);
      } else {
        console.log('✅ Critical alert sent to Slack');
      }
    } catch (error) {
      console.error('❌ Failed to send Slack alert:', error);
    }
  }
  
  /**
   * Format audit entry as Slack message
   */
  _formatSlackMessage(auditEntry) {
    const violations = auditEntry.policy_violations || [];
    const violationSummary = violations
      .map(v => `• ${v.policy_name} (${v.severity})`)
      .join('\n');
    
    return {
      text: '🚨 CRITICAL: Compliance Violation Detected',
      attachments: [{
        color: 'danger',
        fields: [
          {
            title: 'Model',
            value: `${auditEntry.model_id} v${auditEntry.model_version}`,
            short: true
          },
          {
            title: 'Action',
            value: auditEntry.action,
            short: true
          },
          {
            title: 'Violations',
            value: violationSummary || 'See audit log for details',
            short: false
          },
          {
            title: 'Timestamp',
            value: auditEntry.timestamp.toISOString(),
            short: true
          },
          {
            title: 'Audit Log ID',
            value: auditEntry._id.toString(),
            short: true
          }
        ]
      }]
    };
  }
}

// Export singleton instance
module.exports = new AuditLogger();
