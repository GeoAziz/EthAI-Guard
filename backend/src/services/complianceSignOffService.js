const ComplianceSignOff = require('../models/ComplianceSignOff');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ComplianceSignOffService {
  static async createSignOff(signOffData) {
    try {
      const signOff = new ComplianceSignOff({
        signOffId: signOffData.signOffId || `cso-${Date.now()}-${uuidv4().slice(0, 8)}`,
        tenantId: signOffData.tenantId,
        entityType: signOffData.entityType,
        entityId: signOffData.entityId,
        entityVersion: signOffData.entityVersion,
        complianceAreas: signOffData.complianceAreas || this._getDefaultComplianceAreas(),
        regulatoryRequirements: signOffData.regulatoryRequirements || [],
        requiredSignOffs: signOffData.requiredSignOffs || [
          { role: 'compliance-officer', count: 1, completed: 0 },
        ],
        createdBy: signOffData.createdBy,
        reviewDeadline: signOffData.reviewDeadline,
      });

      signOff.auditTrail.push({
        action: 'created',
        actor: signOffData.createdBy,
        timestamp: new Date(),
        details: { entityType: signOffData.entityType, entityId: signOffData.entityId },
      });

      await signOff.save();

      logger.info({
        msg: 'compliance_signoff_created',
        signOffId: signOff.signOffId,
        entityType: signOffData.entityType,
      });

      return signOff;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_create_compliance_signoff' });
      throw err;
    }
  }

  static async addSignOff(signOffId, signOffData) {
    try {
      const signOff = await ComplianceSignOff.findOne({ signOffId });
      if (!signOff) {
        throw new Error('Sign-off not found');
      }

      const signOffRecord = {
        signOffRequestId: `${signOffId}-${uuidv4().slice(0, 8)}`,
        areaId: signOffData.areaId,
        areaName: signOffData.areaName,
        signedOffBy: {
          email: signOffData.signedOffBy.email,
          name: signOffData.signedOffBy.name,
          role: signOffData.signedOffBy.role,
        },
        signOffDate: new Date(),
        expiryDate: signOffData.expiryDate,
        status: 'signed',
        comments: signOffData.comments,
        attestation: signOffData.attestation,
      };

      signOff.signOffs.push(signOffRecord);

      // Update required sign-offs counter
      const required = signOff.requiredSignOffs.find(r => r.role === signOffData.signedOffBy.role);
      if (required) {
        required.completed = (required.completed || 0) + 1;
      }

      signOff.auditTrail.push({
        action: 'signed_off',
        actor: signOffData.signedOffBy.email,
        actorEmail: signOffData.signedOffBy.email,
        timestamp: new Date(),
        details: {
          areaId: signOffData.areaId,
          areaName: signOffData.areaName,
        },
      });

      // Check if all sign-offs complete
      const coverage = signOff.getSignOffCoverage();
      if (coverage.complete) {
        signOff.overallStatus = 'approved';
        signOff.approvedAt = new Date();
        signOff.approvedBy = signOffData.signedOffBy.email;
      }

      await signOff.save();

      logger.info({
        msg: 'compliance_signoff_added',
        signOffId,
        areaName: signOffData.areaName,
      });

      return signOff;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_add_compliance_signoff' });
      throw err;
    }
  }

  static async updateComplianceChecklist(signOffId, areaId, checklistUpdates) {
    try {
      const signOff = await ComplianceSignOff.findOne({ signOffId });
      if (!signOff) {
        throw new Error('Sign-off not found');
      }

      const area = signOff.complianceAreas.find(a => a.areaId === areaId);
      if (!area) {
        throw new Error('Compliance area not found');
      }

      // Update checklist items
      checklistUpdates.forEach(update => {
        const check = area.checklist.find(c => c.checkId === update.checkId);
        if (check) {
          check.status = update.status;
          check.evidence = update.evidence;
          check.verifiedBy = update.verifiedBy;
          check.verifiedAt = new Date();
        }
      });

      // Update area status based on checklist
      const allPassed = area.checklist.every(c => c.status === 'passed' || c.status === 'na');
      const anyFailed = area.checklist.some(c => c.status === 'failed');

      if (anyFailed) {
        area.status = 'non_compliant';
      } else if (allPassed) {
        area.status = 'compliant';
      } else {
        area.status = 'pending';
      }

      signOff.auditTrail.push({
        action: 'checklist_updated',
        actor: 'system',
        timestamp: new Date(),
        details: { areaId, itemsUpdated: checklistUpdates.length },
      });

      await signOff.save();

      logger.info({
        msg: 'compliance_checklist_updated',
        signOffId,
        areaId,
      });

      return signOff;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_update_compliance_checklist' });
      throw err;
    }
  }

  static async revokeSignOff(signOffId, signOffRequestId, revocationReason, revokedBy) {
    try {
      const signOff = await ComplianceSignOff.findOne({ signOffId });
      if (!signOff) {
        throw new Error('Sign-off not found');
      }

      const soRecord = signOff.signOffs.find(s => s.signOffRequestId === signOffRequestId);
      if (!soRecord) {
        throw new Error('Sign-off record not found');
      }

      soRecord.status = 'revoked';
      soRecord.revokedAt = new Date();
      soRecord.revokedBy = revokedBy;
      soRecord.revokedReason = revocationReason;

      // Update overall status
      if (signOff.overallStatus === 'approved') {
        signOff.overallStatus = 'pending_review';
      }

      signOff.auditTrail.push({
        action: 'signoff_revoked',
        actor: revokedBy,
        actorEmail: revokedBy,
        timestamp: new Date(),
        details: {
          signOffRequestId,
          reason: revocationReason,
        },
      });

      await signOff.save();

      logger.info({
        msg: 'compliance_signoff_revoked',
        signOffId,
        reason: revocationReason,
      });

      return signOff;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_revoke_compliance_signoff' });
      throw err;
    }
  }

  static async assessRisks(signOffId, riskAssessment) {
    try {
      const signOff = await ComplianceSignOff.findOne({ signOffId });
      if (!signOff) {
        throw new Error('Sign-off not found');
      }

      signOff.riskAssessment = {
        overallRisk: riskAssessment.overallRisk,
        identifiedRisks: riskAssessment.identifiedRisks || [],
        mitigationStatus: riskAssessment.mitigationStatus,
      };

      signOff.auditTrail.push({
        action: 'risk_assessed',
        actor: 'system',
        timestamp: new Date(),
        details: { overallRisk: riskAssessment.overallRisk },
      });

      await signOff.save();

      logger.info({
        msg: 'compliance_risk_assessed',
        signOffId,
        overallRisk: riskAssessment.overallRisk,
      });

      return signOff;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_assess_compliance_risks' });
      throw err;
    }
  }

  static async getComplianceReport(signOffId) {
    try {
      const signOff = await ComplianceSignOff.findOne({ signOffId });
      if (!signOff) {
        throw new Error('Sign-off not found');
      }

      return {
        signOffId: signOff.signOffId,
        entityType: signOff.entityType,
        entityId: signOff.entityId,
        overallStatus: signOff.overallStatus,
        readinessScore: signOff.readinessScore,
        complianceSummary: signOff.getComplianceSummary(),
        signOffCoverage: signOff.getSignOffCoverage(),
        riskAssessment: signOff.riskAssessment,
        regulatoryStatus: signOff.regulatoryRequirements,
        auditTrail: signOff.auditTrail,
        createdAt: signOff.createdAt,
        updatedAt: signOff.updatedAt,
      };
    } catch (err) {
      logger.error({ err, msg: 'failed_to_get_compliance_report' });
      throw err;
    }
  }

  static async getNearingExpiry(tenantId, daysThreshold = 30) {
    try {
      return await ComplianceSignOff.getNearingExpiry(daysThreshold);
    } catch (err) {
      logger.error({ err, msg: 'failed_to_get_expiring_signoffs' });
      throw err;
    }
  }

  static _getDefaultComplianceAreas() {
    return [
      {
        areaId: 'fairness',
        name: 'fairness',
        status: 'pending',
        checklist: [
          {
            checkId: 'fair-1',
            description: 'Demographic parity check completed',
            required: true,
            status: 'pending',
          },
          {
            checkId: 'fair-2',
            description: 'Equal opportunity analysis done',
            required: true,
            status: 'pending',
          },
          {
            checkId: 'fair-3',
            description: 'Disparate impact assessment completed',
            required: true,
            status: 'pending',
          },
        ],
      },
      {
        areaId: 'explainability',
        name: 'explainability',
        status: 'pending',
        checklist: [
          {
            checkId: 'exp-1',
            description: 'Model explainability analysis completed',
            required: true,
            status: 'pending',
          },
          {
            checkId: 'exp-2',
            description: 'Feature importance documented',
            required: true,
            status: 'pending',
          },
        ],
      },
      {
        areaId: 'data-protection',
        name: 'data_protection',
        status: 'pending',
        checklist: [
          {
            checkId: 'dp-1',
            description: 'Data privacy assessment completed',
            required: true,
            status: 'pending',
          },
          {
            checkId: 'dp-2',
            description: 'GDPR compliance verified',
            required: true,
            status: 'pending',
          },
        ],
      },
      {
        areaId: 'security',
        name: 'security',
        status: 'pending',
        checklist: [
          {
            checkId: 'sec-1',
            description: 'Security audit completed',
            required: true,
            status: 'pending',
          },
        ],
      },
    ];
  }
}

module.exports = ComplianceSignOffService;
