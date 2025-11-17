/**
 * Notification Orchestrator
 * 
 * Coordinates sending notifications across multiple channels.
 */
const { sendSlackAlert, sendDailySummary: sendSlackSummary } = require('./slack');
const { sendAlertEmail, sendDailySummaryEmail } = require('./email');
const { createGitHubIssue } = require('./github');

/**
 * Send alert to all configured channels
 * @param {Object} alert - Drift alert object
 */
async function sendAlert(alert) {
  const results = {
    slack: null,
    email: null,
    github: null
  };

  // Slack notification
  if (process.env.SLACK_WEBHOOK_URL) {
    results.slack = await sendSlackAlert(alert, process.env.SLACK_WEBHOOK_URL);
  }

  // Email notification
  if (process.env.SMTP_USER && process.env.ALERT_EMAIL) {
    results.email = await sendAlertEmail(alert, process.env.ALERT_EMAIL);
  }

  // GitHub issue (only for critical alerts)
  if (alert.severity === 'critical' && process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
    results.github = await createGitHubIssue(
      alert,
      process.env.GITHUB_TOKEN,
      process.env.GITHUB_REPO
    );
  }

  // Log results
  const successCount = Object.values(results).filter(r => r?.success).length;
  const totalAttempted = Object.values(results).filter(r => r !== null).length;
  
  console.log(`Alert ${alert._id} sent: ${successCount}/${totalAttempted} channels succeeded`);

  return results;
}

/**
 * Send daily summary to all configured channels
 * @param {Object} summary - Daily summary object
 */
async function sendDailySummary(summary) {
  const results = {
    slack: null,
    email: null
  };

  // Slack summary
  if (process.env.SLACK_WEBHOOK_URL) {
    results.slack = await sendSlackSummary(summary, process.env.SLACK_WEBHOOK_URL);
  }

  // Email summary
  if (process.env.SMTP_USER && process.env.ALERT_EMAIL) {
    results.email = await sendDailySummaryEmail(summary, process.env.ALERT_EMAIL);
  }

  const successCount = Object.values(results).filter(r => r?.success).length;
  const totalAttempted = Object.values(results).filter(r => r !== null).length;
  
  console.log(`Daily summary sent: ${successCount}/${totalAttempted} channels succeeded`);

  return results;
}

/**
 * Test notification configuration
 */
async function testNotifications() {
  const testAlert = {
    _id: 'test_alert_123',
    model_id: 'test_model',
    type: 'population_drift',
    severity: 'warning',
    metric_name: 'psi_test_feature',
    metric_value: 0.15,
    threshold: 0.1,
    window_start: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    window_end: new Date().toISOString(),
    occurrence_count: 1,
    created_at: new Date().toISOString(),
    details: { feature: 'test_feature', message: 'This is a test alert' }
  };

  console.log('Testing notification channels...');
  const results = await sendAlert(testAlert);
  
  console.log('\nTest Results:');
  if (results.slack) {
    console.log(`  Slack: ${results.slack.success ? '✅' : '❌'} ${results.slack.error || ''}`);
  } else {
    console.log('  Slack: ⚠️ Not configured');
  }
  
  if (results.email) {
    console.log(`  Email: ${results.email.success ? '✅' : '❌'} ${results.email.error || ''}`);
  } else {
    console.log('  Email: ⚠️ Not configured');
  }
  
  if (results.github !== null) {
    console.log(`  GitHub: ${results.github.success ? '✅' : '❌'} ${results.github.error || ''}`);
  } else {
    console.log('  GitHub: ⚠️ Not configured (only for critical alerts)');
  }

  return results;
}

module.exports = {
  sendAlert,
  sendDailySummary,
  testNotifications
};
