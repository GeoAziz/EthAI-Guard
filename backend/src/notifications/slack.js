/**
 * Slack Notification Handler
 * 
 * Sends drift alerts to Slack via webhook.
 */

/**
 * Send alert to Slack
 * @param {Object} alert - Drift alert object
 * @param {string} webhookUrl - Slack webhook URL
 */
async function sendSlackAlert(alert, webhookUrl) {
  if (!webhookUrl) {
    console.warn('Slack webhook URL not configured');
    return { success: false, error: 'No webhook URL' };
  }

  const severityEmoji = {
    critical: '🚨',
    warning: '⚠️',
    stable: '✅'
  };

  const severityColor = {
    critical: '#FF0000',
    warning: '#FFA500',
    stable: '#00FF00'
  };

  const emoji = severityEmoji[alert.severity] || '📊';
  const color = severityColor[alert.severity] || '#808080';

  const message = {
    username: 'EthixAI Drift Monitor',
    icon_emoji: ':robot_face:',
    attachments: [
      {
        color: color,
        title: `${emoji} ${alert.severity.toUpperCase()}: ${alert.type.replace(/_/g, ' ')}`,
        fields: [
          {
            title: 'Model ID',
            value: alert.model_id,
            short: true
          },
          {
            title: 'Metric',
            value: alert.metric_name,
            short: true
          },
          {
            title: 'Current Value',
            value: alert.metric_value.toFixed(4),
            short: true
          },
          {
            title: 'Threshold',
            value: alert.threshold.toFixed(4),
            short: true
          },
          {
            title: 'Window',
            value: `${new Date(alert.window_start).toISOString().slice(0, 16)} - ${new Date(alert.window_end).toISOString().slice(0, 16)}`,
            short: false
          },
          {
            title: 'Occurrences',
            value: `${alert.occurrence_count || 1} time(s)`,
            short: true
          }
        ],
        footer: 'EthixAI-Guard Drift Detection',
        ts: Math.floor(new Date(alert.created_at).getTime() / 1000)
      }
    ]
  };

  // Add action buttons if critical
  if (alert.severity === 'critical') {
    message.attachments[0].actions = [
      {
        type: 'button',
        text: '🔍 View Details',
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/monitor/drift?alert_id=${alert._id}`
      },
      {
        type: 'button',
        text: '🔄 Trigger Retrain',
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/models/${alert.model_id}/retrain`,
        style: 'danger'
      }
    ];
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Slack webhook error:', errorText);
      return { success: false, error: errorText };
    }

    console.log(`Slack notification sent for alert ${alert._id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send daily drift summary to Slack
 * @param {Object} summary - Daily summary object
 * @param {string} webhookUrl - Slack webhook URL
 */
async function sendDailySummary(summary, webhookUrl) {
  if (!webhookUrl) {
    console.warn('Slack webhook URL not configured');
    return { success: false, error: 'No webhook URL' };
  }

  const message = {
    username: 'EthixAI Drift Monitor',
    icon_emoji: ':bar_chart:',
    text: '📊 *Daily Drift Detection Summary*',
    attachments: [
      {
        color: summary.critical_count > 0 ? '#FF0000' : (summary.warning_count > 0 ? '#FFA500' : '#00FF00'),
        fields: [
          {
            title: 'Date',
            value: new Date(summary.date).toLocaleDateString(),
            short: false
          },
          {
            title: 'Critical Alerts',
            value: summary.critical_count.toString(),
            short: true
          },
          {
            title: 'Warnings',
            value: summary.warning_count.toString(),
            short: true
          },
          {
            title: 'Models Monitored',
            value: summary.models_monitored.toString(),
            short: true
          },
          {
            title: 'Total Snapshots',
            value: summary.total_snapshots.toString(),
            short: true
          },
          {
            title: 'Models Needing Retrain',
            value: summary.models_needing_retrain.join(', ') || 'None',
            short: false
          }
        ],
        footer: 'EthixAI-Guard Drift Detection',
        ts: Math.floor(Date.now() / 1000)
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Slack webhook error:', errorText);
      return { success: false, error: errorText };
    }

    console.log('Daily summary sent to Slack');
    return { success: true };
  } catch (error) {
    console.error('Failed to send Slack summary:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendSlackAlert,
  sendDailySummary
};
