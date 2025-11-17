/**
 * Data Retention Cleanup Job
 * 
 * Aggregates high-frequency drift snapshots into daily summaries
 * and enforces retention policies.
 */

/**
 * Aggregate 7-day snapshots into daily summaries
 * @param {Object} db - MongoDB database connection
 * @param {Date} targetDate - Date to aggregate
 */
async function aggregateDailySnapshots(db, targetDate) {
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  console.log(`Aggregating snapshots for ${dayStart.toISOString().slice(0, 10)}`);

  // Get all snapshots for the day
  const snapshots = await db.collection('drift_snapshots').find({
    window_end: {
      $gte: dayStart.toISOString(),
      $lte: dayEnd.toISOString()
    }
  }).toArray();

  if (snapshots.length === 0) {
    console.log('No snapshots found for aggregation');
    return { success: true, aggregated: 0 };
  }

  // Group by model_id
  const byModel = {};
  for (const snapshot of snapshots) {
    if (!byModel[snapshot.model_id]) {
      byModel[snapshot.model_id] = [];
    }
    byModel[snapshot.model_id].push(snapshot);
  }

  // Create daily summaries
  const summaries = [];
  for (const [model_id, modelSnapshots] of Object.entries(byModel)) {
    // Aggregate metrics
    const criticalCounts = modelSnapshots.map(s => s.critical_count || 0);
    const warningCounts = modelSnapshots.map(s => s.warning_count || 0);
    
    const summary = {
      model_id,
      date: dayStart.toISOString().slice(0, 10),
      snapshot_count: modelSnapshots.length,
      avg_critical_count: criticalCounts.reduce((a, b) => a + b, 0) / criticalCounts.length,
      max_critical_count: Math.max(...criticalCounts),
      avg_warning_count: warningCounts.reduce((a, b) => a + b, 0) / warningCounts.length,
      max_warning_count: Math.max(...warningCounts),
      overall_status: modelSnapshots[modelSnapshots.length - 1].overall_status,
      needs_retraining: modelSnapshots.some(s => s.needs_retraining),
      created_at: new Date().toISOString()
    };

    summaries.push(summary);
  }

  // Store summaries
  if (summaries.length > 0) {
    await db.collection('drift_daily_summaries').insertMany(summaries);
    console.log(`Created ${summaries.length} daily summaries`);
  }

  // Delete old high-frequency snapshots (keep only last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const deleteResult = await db.collection('drift_snapshots').deleteMany({
    window_end: { $lt: sevenDaysAgo.toISOString() }
  });

  console.log(`Deleted ${deleteResult.deletedCount} old snapshots`);

  return {
    success: true,
    aggregated: summaries.length,
    deleted: deleteResult.deletedCount
  };
}

/**
 * Delete expired alerts (older than 90 days)
 * @param {Object} db - MongoDB database connection
 */
async function cleanupExpiredAlerts(db) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  console.log(`Cleaning up alerts older than ${ninetyDaysAgo.toISOString()}`);

  const result = await db.collection('drift_alerts').deleteMany({
    created_at: { $lt: ninetyDaysAgo.toISOString() }
  });

  console.log(`Deleted ${result.deletedCount} expired alerts`);

  return {
    success: true,
    deleted: result.deletedCount
  };
}

/**
 * Archive old daily summaries (older than 30 days)
 * @param {Object} db - MongoDB database connection
 */
async function archiveOldSummaries(db) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const targetDate = thirtyDaysAgo.toISOString().slice(0, 10);

  console.log(`Archiving daily summaries older than ${targetDate}`);

  // Optional: Export to archive collection or external storage
  const summaries = await db.collection('drift_daily_summaries').find({
    date: { $lt: targetDate }
  }).toArray();

  if (summaries.length > 0) {
    // Could export to S3, archive DB, etc.
    console.log(`Found ${summaries.length} summaries to archive`);
    
    // For now, just delete (in production, would export first)
    const result = await db.collection('drift_daily_summaries').deleteMany({
      date: { $lt: targetDate }
    });

    console.log(`Deleted ${result.deletedCount} old summaries`);
    
    return {
      success: true,
      archived: result.deletedCount
    };
  }

  return { success: true, archived: 0 };
}

/**
 * Run complete cleanup job
 * @param {Object} db - MongoDB database connection
 */
async function runCleanupJob(db) {
  console.log('=== Starting Data Retention Cleanup Job ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const results = {
    aggregation: null,
    alertCleanup: null,
    summaryArchive: null
  };

  try {
    // Aggregate yesterday's snapshots
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    results.aggregation = await aggregateDailySnapshots(db, yesterday);
  } catch (error) {
    console.error('Error in aggregation:', error);
    results.aggregation = { success: false, error: error.message };
  }

  try {
    // Cleanup expired alerts
    results.alertCleanup = await cleanupExpiredAlerts(db);
  } catch (error) {
    console.error('Error in alert cleanup:', error);
    results.alertCleanup = { success: false, error: error.message };
  }

  try {
    // Archive old summaries
    results.summaryArchive = await archiveOldSummaries(db);
  } catch (error) {
    console.error('Error in summary archive:', error);
    results.summaryArchive = { success: false, error: error.message };
  }

  console.log('=== Cleanup Job Complete ===');
  console.log(`Snapshots aggregated: ${results.aggregation?.aggregated || 0}`);
  console.log(`Old snapshots deleted: ${results.aggregation?.deleted || 0}`);
  console.log(`Alerts cleaned up: ${results.alertCleanup?.deleted || 0}`);
  console.log(`Summaries archived: ${results.summaryArchive?.archived || 0}`);

  return results;
}

/**
 * Schedule cleanup job (call from server initialization)
 * @param {Object} db - MongoDB database connection
 * @param {number} intervalHours - Hours between runs (default 24)
 */
function scheduleCleanup(db, intervalHours = 24) {
  console.log(`Scheduling cleanup job every ${intervalHours} hours`);

  // Run immediately
  runCleanupJob(db);

  // Schedule recurring runs
  setInterval(() => {
    runCleanupJob(db);
  }, intervalHours * 60 * 60 * 1000);
}

module.exports = {
  aggregateDailySnapshots,
  cleanupExpiredAlerts,
  archiveOldSummaries,
  runCleanupJob,
  scheduleCleanup
};
