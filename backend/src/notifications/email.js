/**
 * Email Notification Handler
 * 
 * Sends drift alerts via email using SMTP.
 */
const nodemailer = require('nodemailer');

/**
 * Create SMTP transporter
 */
function createTransporter() {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  if (!config.auth.user || !config.auth.pass) {
    console.warn('SMTP credentials not configured');
    return null;
  }

  return nodemailer.createTransport(config);
}

/**
 * Send alert email
 * @param {Object} alert - Drift alert object
 * @param {string} to - Recipient email address
 */
async function sendAlertEmail(alert, to) {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: false, error: 'SMTP not configured' };
  }

  const severityEmoji = {
    critical: '🚨',
    warning: '⚠️',
    stable: '✅'
  };

  const emoji = severityEmoji[alert.severity] || '📊';
  const subject = `${emoji} [${alert.severity.toUpperCase()}] Drift Alert: ${alert.type.replace(/_/g, ' ')}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${alert.severity === 'critical' ? '#dc3545' : '#ffc107'}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-radius: 0 0 5px 5px; }
    .metric { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid ${alert.severity === 'critical' ? '#dc3545' : '#ffc107'}; }
    .metric-label { font-weight: bold; color: #6c757d; font-size: 12px; text-transform: uppercase; }
    .metric-value { font-size: 18px; margin-top: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px; }
    .button { display: inline-block; padding: 10px 20px; margin: 10px 5px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
    .button-danger { background: #dc3545; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${emoji} ${alert.severity.toUpperCase()} Drift Alert</h1>
      <p>${alert.type.replace(/_/g, ' ')}</p>
    </div>
    <div class="content">
      <div class="metric">
        <div class="metric-label">Model ID</div>
        <div class="metric-value">${alert.model_id}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Metric</div>
        <div class="metric-value">${alert.metric_name}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Current Value</div>
        <div class="metric-value">${alert.metric_value.toFixed(4)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Threshold</div>
        <div class="metric-value">${alert.threshold.toFixed(4)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Time Window</div>
        <div class="metric-value">${new Date(alert.window_start).toLocaleString()} - ${new Date(alert.window_end).toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Occurrences</div>
        <div class="metric-value">${alert.occurrence_count || 1} time(s)</div>
      </div>
      
      ${alert.severity === 'critical' ? `
      <div style="text-align: center; margin-top: 20px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/monitor/drift?alert_id=${alert._id}" class="button">View Details</a>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/models/${alert.model_id}/retrain" class="button button-danger">Trigger Retrain</a>
      </div>
      ` : ''}
      
      ${alert.details ? `
      <div class="metric">
        <div class="metric-label">Additional Details</div>
        <pre style="background: white; padding: 10px; overflow-x: auto;">${JSON.stringify(alert.details, null, 2)}</pre>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>EthixAI-Guard Drift Detection System</p>
      <p>Sent at ${new Date(alert.created_at).toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
${emoji} ${alert.severity.toUpperCase()} Drift Alert: ${alert.type.replace(/_/g, ' ')}

Model ID: ${alert.model_id}
Metric: ${alert.metric_name}
Current Value: ${alert.metric_value.toFixed(4)}
Threshold: ${alert.threshold.toFixed(4)}
Window: ${new Date(alert.window_start).toLocaleString()} - ${new Date(alert.window_end).toLocaleString()}
Occurrences: ${alert.occurrence_count || 1} time(s)

${alert.severity === 'critical' ? `
Action Required: This critical alert may require model retraining.
View Details: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/monitor/drift?alert_id=${alert._id}
` : ''}

---
EthixAI-Guard Drift Detection System
Sent at ${new Date(alert.created_at).toLocaleString()}
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: to || process.env.ALERT_EMAIL,
    subject: subject,
    text: textContent,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent for alert ${alert._id}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send daily summary email
 * @param {Object} summary - Daily summary object
 * @param {string} to - Recipient email address
 */
async function sendDailySummaryEmail(summary, to) {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: false, error: 'SMTP not configured' };
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-radius: 0 0 5px 5px; }
    .stat { display: inline-block; width: 45%; margin: 10px 2%; background: white; padding: 15px; border-radius: 5px; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #007bff; }
    .stat-label { color: #6c757d; font-size: 12px; text-transform: uppercase; }
    .footer { text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Daily Drift Detection Summary</h1>
      <p>${new Date(summary.date).toLocaleDateString()}</p>
    </div>
    <div class="content">
      <div class="stat">
        <div class="stat-value" style="color: ${summary.critical_count > 0 ? '#dc3545' : '#28a745'}">${summary.critical_count}</div>
        <div class="stat-label">Critical Alerts</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: ${summary.warning_count > 0 ? '#ffc107' : '#28a745'}">${summary.warning_count}</div>
        <div class="stat-label">Warnings</div>
      </div>
      <div class="stat">
        <div class="stat-value">${summary.models_monitored}</div>
        <div class="stat-label">Models Monitored</div>
      </div>
      <div class="stat">
        <div class="stat-value">${summary.total_snapshots}</div>
        <div class="stat-label">Snapshots</div>
      </div>
      
      ${summary.models_needing_retrain.length > 0 ? `
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <strong>⚠️ Models Needing Retrain:</strong><br>
        ${summary.models_needing_retrain.join(', ')}
      </div>
      ` : ''}
      
      <div style="text-align: center; margin-top: 20px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/monitor/drift" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Dashboard</a>
      </div>
    </div>
    <div class="footer">
      <p>EthixAI-Guard Drift Detection System</p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: to || process.env.ALERT_EMAIL,
    subject: `📊 Daily Drift Summary - ${new Date(summary.date).toLocaleDateString()}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Daily summary email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send summary email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendAlertEmail,
  sendDailySummaryEmail
};
