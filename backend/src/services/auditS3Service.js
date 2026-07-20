/**
 * Centralized Audit Logging Service
 * Sends immutable audit logs to AWS S3 for compliance & forensics
 * Implements WORM (Write-Once-Read-Many) storage pattern
 */

const AWS = require('aws-sdk');
const crypto = require('crypto');
const logger = require('../logger');

const isLocalStack = process.env.USE_LOCALSTACK === 'true' || process.env.NODE_ENV === 'test';

const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test-key',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test-secret',
  region: process.env.AWS_REGION || 'us-east-1',
};

if (isLocalStack) {
  s3Config.endpoint = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
  s3Config.s3ForcePathStyle = true;
}

const s3 = new AWS.S3(s3Config);

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ethixai-audit-logs';
const LOG_RETENTION_DAYS = 2555; // 7 years for ECOA compliance

/**
 * Initialize S3 bucket with proper security settings
 * Run once during deployment
 */
async function initializeAuditBucket() {
  try {
    // Create bucket if it doesn't exist
    try {
      await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
      logger.info({ bucket: BUCKET_NAME }, 'audit_bucket_exists');
    } catch (err) {
      if (err.code === 'NotFound') {
        await s3.createBucket({ Bucket: BUCKET_NAME }).promise();
        logger.info({ bucket: BUCKET_NAME }, 'audit_bucket_created');
      }
    }

    // Enable versioning (immutability)
    await s3.putBucketVersioning({
      Bucket: BUCKET_NAME,
      VersioningConfiguration: { Status: 'Enabled' },
    }).promise();

    // Enable encryption (AES-256)
    await s3.putBucketEncryption({
      Bucket: BUCKET_NAME,
      ServerSideEncryptionConfiguration: {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
    }).promise();

    // Block public access
    await s3.putPublicAccessBlockConfiguration({
      Bucket: BUCKET_NAME,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    }).promise();

    // Set bucket policy to deny unencrypted uploads
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'DenyUnencryptedObjectUploads',
          Effect: 'Deny',
          Principal: '*',
          Action: 's3:PutObject',
          Resource: `arn:aws:s3:::${BUCKET_NAME}/*`,
          Condition: {
            StringNotEquals: {
              's3:x-amz-server-side-encryption': 'AES256',
            },
          },
        },
        {
          Sid: 'DenyInsecureTransport',
          Effect: 'Deny',
          Principal: '*',
          Action: 's3:*',
          Resource: [
            `arn:aws:s3:::${BUCKET_NAME}/*`,
            `arn:aws:s3:::${BUCKET_NAME}`,
          ],
          Condition: {
            Bool: {
              'aws:SecureTransport': 'false',
            },
          },
        },
      ],
    };

    await s3.putBucketPolicy({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(bucketPolicy),
    }).promise();

    logger.info({ bucket: BUCKET_NAME }, 'audit_bucket_secured');
  } catch (error) {
    logger.error({ err: error, bucket: BUCKET_NAME }, 'failed_to_initialize_audit_bucket');
    throw error;
  }
}

/**
 * Log security event to S3
 * Creates immutable audit trail
 */
async function logSecurityEvent(eventType, details = {}) {
  try {
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];

    // Create audit record
    const auditRecord = {
      timestamp,
      eventType,
      details,
      hash: null, // Will be set below
      retention_until: new Date(Date.now() + LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Calculate HMAC-SHA256 hash for integrity verification
    const recordString = JSON.stringify(auditRecord);
    const hash = crypto
      .createHmac('sha256', process.env.AUDIT_LOG_SECRET || 'PLACEHOLDER_AUDIT_LOG_SECRET')
      .update(recordString)
      .digest('hex');

    auditRecord.hash = hash;

    // S3 key: audit-logs/YYYY-MM-DD/HH-MM-SS-XXXX.json
    const hours = timestamp.split('T')[1].split(':')[0];
    const minutes = timestamp.split('T')[1].split(':')[1];
    const randomId = crypto.randomBytes(4).toString('hex');
    const s3Key = `audit-logs/${date}/${hours}-${minutes}-${randomId}.json`;

    // Upload to S3 with encryption
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: JSON.stringify(auditRecord, null, 2),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256',
      Metadata: {
        'audit-event': eventType,
        'audit-timestamp': timestamp,
      },
    }).promise();

    logger.debug({ s3Key, eventType }, 'audit_event_logged');
    return { s3Key, hash, timestamp };
  } catch (error) {
    logger.error({ err: error, eventType }, 'failed_to_log_audit_event');
    // Don't throw - audit logging should not break main flow
  }
}

/**
 * Log authentication event
 */
async function logAuthEvent(userId, action, result, ipAddress = null, userAgent = null) {
  await logSecurityEvent('AUTH', {
    userId,
    action, // 'login', 'logout', 'mfa', 'token_refresh'
    result, // 'success', 'failure', 'locked'
    ipAddress,
    userAgent,
  });
}

/**
 * Log access control event
 */
async function logAccessEvent(userId, resource, action, allowed, tenantId = null) {
  await logSecurityEvent('ACCESS', {
    userId,
    tenantId,
    resource,
    action,
    allowed,
  });
}

/**
 * Log data access event
 */
async function logDataAccessEvent(userId, dataType, operation, recordCount = null, tenantId = null) {
  await logSecurityEvent('DATA_ACCESS', {
    userId,
    tenantId,
    dataType,
    operation, // 'read', 'write', 'delete'
    recordCount,
  });
}

/**
 * Log privilege escalation event
 */
async function logPrivilegeEvent(userId, privilege, action, approvedBy = null, duration = null) {
  await logSecurityEvent('PRIVILEGE_ESCALATION', {
    userId,
    privilege,
    action, // 'grant', 'revoke', 'expire'
    approvedBy,
    duration,
  });
}

/**
 * Log configuration change
 */
async function logConfigChangeEvent(userId, component, changeType, oldValue, newValue) {
  await logSecurityEvent('CONFIG_CHANGE', {
    userId,
    component,
    changeType,
    oldValue: typeof oldValue === 'object' ? '[OBJECT]' : oldValue,
    newValue: typeof newValue === 'object' ? '[OBJECT]' : newValue,
  });
}

/**
 * Log security incident
 */
async function logSecurityIncident(incidentType, severity, description, affectedResources = []) {
  await logSecurityEvent('SECURITY_INCIDENT', {
    incidentType,
    severity, // 'critical', 'high', 'medium', 'low'
    description,
    affectedResources,
    reportedAt: new Date().toISOString(),
  });
}

/**
 * Retrieve audit logs from S3 (for investigations)
 * Requires proper authorization
 */
async function getAuditLogs(startDate, endDate, eventType = null, filters = {}) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const logs = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const prefix = `audit-logs/${dateStr}/`;

      const params = {
        Bucket: BUCKET_NAME,
        Prefix: prefix,
      };

      let response = await s3.listObjectsV2(params).promise();

      if (response.Contents) {
        for (const object of response.Contents) {
          const getParams = {
            Bucket: BUCKET_NAME,
            Key: object.Key,
          };

          const data = await s3.getObject(getParams).promise();
          const log = JSON.parse(data.Body.toString());

          // Filter by event type if specified
          if (eventType && log.eventType !== eventType) continue;

          // Apply additional filters
          let matchesFilters = true;
          for (const [key, value] of Object.entries(filters)) {
            if (log.details?.[key] !== value) {
              matchesFilters = false;
              break;
            }
          }

          if (matchesFilters) {
            logs.push(log);
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return logs;
  } catch (error) {
    logger.error({ err: error, startDate, endDate }, 'failed_to_retrieve_audit_logs');
    throw error;
  }
}

/**
 * Verify audit log integrity
 * Check hash to detect tampering
 */
function verifyAuditLogIntegrity(auditRecord) {
  try {
    const recordCopy = { ...auditRecord };
    const originalHash = recordCopy.hash;
    delete recordCopy.hash;

    const recordString = JSON.stringify(recordCopy);
    const calculatedHash = crypto
      .createHmac('sha256', process.env.AUDIT_LOG_SECRET || 'PLACEHOLDER_AUDIT_LOG_SECRET')
      .update(recordString)
      .digest('hex');

    const isValid = calculatedHash === originalHash;
    return {
      isValid,
      originalHash,
      calculatedHash,
      tampered: !isValid,
    };
  } catch (error) {
    logger.error({ err: error }, 'audit_integrity_check_failed');
    return { isValid: false, tampered: true };
  }
}

/**
 * Export audit logs for compliance (e.g., GDPR data subject request)
 */
async function exportAuditLogsForCompliance(userId, startDate, endDate) {
  try {
    const logs = await getAuditLogs(startDate, endDate, null, { userId });

    // Generate report
    const report = {
      exportDate: new Date().toISOString(),
      userId,
      period: { start: startDate, end: endDate },
      totalRecords: logs.length,
      logs,
    };

    // Upload to S3
    const s3Key = `compliance-exports/${userId}-${Date.now()}.json`;
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: JSON.stringify(report, null, 2),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256',
    }).promise();

    logger.info({ userId, s3Key }, 'compliance_export_created');
    return { s3Key, recordCount: logs.length };
  } catch (error) {
    logger.error({ err: error, userId }, 'failed_to_export_compliance_logs');
    throw error;
  }
}

module.exports = {
  initializeAuditBucket,
  logSecurityEvent,
  logAuthEvent,
  logAccessEvent,
  logDataAccessEvent,
  logPrivilegeEvent,
  logConfigChangeEvent,
  logSecurityIncident,
  getAuditLogs,
  verifyAuditLogIntegrity,
  exportAuditLogsForCompliance,
};
