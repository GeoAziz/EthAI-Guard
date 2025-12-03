/**
 * Database indexes for MongoDB
 * Creates optimized indexes for common query patterns
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Create all required indexes
 */
async function createIndexes() {
  try {
    logger.info('[DB] Creating indexes...');

    // Get database connection
    const { db } = mongoose.connection;

    // Reports collection indexes
    const reportsCollection = db.collection('reports');

    // Compound index: user_id + created_at (for user's recent reports)
    await reportsCollection.createIndex(
      { user_id: 1, created_at: -1 },
      {
        name: 'user_reports_idx',
        background: true,
      },
    );
    logger.info('[DB] ✓ Created index: user_reports_idx');

    // Unique index: analysis_id (for lookups)
    await reportsCollection.createIndex(
      { analysis_id: 1 },
      {
        name: 'analysis_id_idx',
        unique: true,
        background: true,
      },
    );
    logger.info('[DB] ✓ Created index: analysis_id_idx');

    // Index: status (for filtering)
    await reportsCollection.createIndex(
      { status: 1 },
      {
        name: 'status_idx',
        background: true,
      },
    );
    logger.info('[DB] ✓ Created index: status_idx');

    // Compound index: status + created_at (for monitoring)
    await reportsCollection.createIndex(
      { status: 1, created_at: -1 },
      {
        name: 'status_date_idx',
        background: true,
      },
    );
    logger.info('[DB] ✓ Created index: status_date_idx');

    // TTL index: created_at (auto-delete old reports after 90 days)
    await reportsCollection.createIndex(
      { created_at: 1 },
      {
        name: 'ttl_idx',
        expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
        background: true,
      },
    );
    logger.info('[DB] ✓ Created TTL index: ttl_idx (90 days)');

    // Audit logs collection indexes
    const auditLogsCollection = db.collection('audit_logs');

    // Compound index: user_id + timestamp
    await auditLogsCollection.createIndex(
      { user_id: 1, timestamp: -1 },
      {
        name: 'user_audit_idx',
        background: true,
      },
    );
    logger.info('[DB] ✓ Created index: user_audit_idx');

    // Index: action (for filtering by action type)
    await auditLogsCollection.createIndex(
      { action: 1, timestamp: -1 },
      {
        name: 'action_idx',
        background: true,
      },
    );
    logger.info('[DB] ✓ Created index: action_idx');

    // TTL index: auto-delete audit logs after 365 days
    await auditLogsCollection.createIndex(
      { timestamp: 1 },
      {
        name: 'audit_ttl_idx',
        expireAfterSeconds: 365 * 24 * 60 * 60, // 1 year
        background: true,
      },
    );
    logger.info('[DB] ✓ Created TTL index: audit_ttl_idx (365 days)');

    logger.info('[DB] All indexes created successfully');

    // List all indexes
    await listIndexes();

  } catch (error) {
    logger.error('[DB] Error creating indexes:', error);
    throw error;
  }
}

/**
 * List all indexes in the database
 */
async function listIndexes() {
  try {
    const { db } = mongoose.connection;

    logger.info('\n[DB] Current indexes:');

    // Reports collection
    const reportsCollection = db.collection('reports');
    const reportsIndexes = await reportsCollection.indexes();
    logger.info('\nReports collection:');
    reportsIndexes.forEach(idx => {
      logger.info(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Audit logs collection
    const auditLogsCollection = db.collection('audit_logs');
    const auditIndexes = await auditLogsCollection.indexes();
    logger.info('\nAudit logs collection:');
    auditIndexes.forEach(idx => {
      logger.info(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    logger.info('');

  } catch (error) {
    logger.error('[DB] Error listing indexes:', error);
  }
}

/**
 * Drop all custom indexes (for testing)
 */
async function dropIndexes() {
  try {
    logger.info('[DB] Dropping custom indexes...');

    const { db } = mongoose.connection;

    // Drop reports indexes
    const reportsCollection = db.collection('reports');
    await reportsCollection.dropIndex('user_reports_idx').catch(() => {});
    await reportsCollection.dropIndex('analysis_id_idx').catch(() => {});
    await reportsCollection.dropIndex('status_idx').catch(() => {});
    await reportsCollection.dropIndex('status_date_idx').catch(() => {});
    await reportsCollection.dropIndex('ttl_idx').catch(() => {});

    // Drop audit logs indexes
    const auditLogsCollection = db.collection('audit_logs');
    await auditLogsCollection.dropIndex('user_audit_idx').catch(() => {});
    await auditLogsCollection.dropIndex('action_idx').catch(() => {});
    await auditLogsCollection.dropIndex('audit_ttl_idx').catch(() => {});

    logger.info('[DB] Custom indexes dropped');

  } catch (error) {
    logger.error('[DB] Error dropping indexes:', error);
  }
}

/**
 * Get index statistics
 */
async function getIndexStats() {
  try {
    const { db } = mongoose.connection;

    const stats = {
      reports: await db.collection('reports').stats(),
      audit_logs: await db.collection('audit_logs').stats(),
    };

    return {
      reports: {
        count: stats.reports.count,
        size: stats.reports.size,
        avgObjSize: stats.reports.avgObjSize,
        storageSize: stats.reports.storageSize,
        nindexes: stats.reports.nindexes,
        totalIndexSize: stats.reports.totalIndexSize,
      },
      audit_logs: {
        count: stats.audit_logs.count,
        size: stats.audit_logs.size,
        avgObjSize: stats.audit_logs.avgObjSize,
        storageSize: stats.audit_logs.storageSize,
        nindexes: stats.audit_logs.nindexes,
        totalIndexSize: stats.audit_logs.totalIndexSize,
      },
    };

  } catch (error) {
    logger.error('[DB] Error getting index stats:', error);
    return null;
  }
}

module.exports = {
  createIndexes,
  listIndexes,
  dropIndexes,
  getIndexStats,
};
