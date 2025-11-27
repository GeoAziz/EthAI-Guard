/**
 * Email Notification Handler
 * 
 * Sends drift alerts via email using SMTP.
 */
/**
 * Notification Email Templates and Sender
 *
 * This file provides a small template renderer for common notification
 * types (approve/reject) and re-uses the existing sendAlertEmail entrypoint.
 * The renderer is exported for unit-testing.
 */

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

function createTransporter() {
  if (!nodemailer) {
    console.warn('nodemailer not available; email notifications disabled');
    return null;
  }
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

// Lightweight template renderer for approve/reject email types
function renderEmailTemplate(alert) {
  // For approve/reject flows we expect alert.type to contain 'approved' or 'rejected' variants
  const now = new Date(alert.created_at || Date.now()).toLocaleString();
  const requester = (alert.details && (alert.details.requesterName || alert.details.requester_email)) || alert.email || 'user';
  if (alert.type && alert.type.includes('approved')) {
    const subject = `✅ Your access request was approved`;
    const html = `
      <p>Hello ${requester},</p>
      <p>Your access request has been <strong>approved</strong>.</p>
      <p>Request ID: ${alert._id}</p>
      <p>Handled at: ${now}</p>
      ${alert.details && alert.details.notes ? `<p>Notes: ${String(alert.details.notes)}</p>` : ''}
      <p>Thanks,<br/>EthixAI-Guard</p>
    `;
    const text = `Hello ${requester},\n\nYour access request has been APPROVED.\nRequest ID: ${alert._id}\nHandled at: ${now}\n` + (alert.details && alert.details.notes ? `Notes: ${String(alert.details.notes)}\n` : '') + '\nThanks,\nEthixAI-Guard';
    return { subject, html, text };
  }

  if (alert.type && alert.type.includes('rejected')) {
    const subject = `⚠️ Your access request was rejected`;
    const html = `
      <p>Hello ${requester},</p>
      <p>We're sorry — your access request has been <strong>rejected</strong>.</p>
      <p>Request ID: ${alert._id}</p>
      <p>Handled at: ${now}</p>
      ${alert.details && alert.details.notes ? `<p>Notes: ${String(alert.details.notes)}</p>` : ''}
      <p>If you have questions please contact your administrator.</p>
      <p>Thanks,<br/>EthixAI-Guard</p>
    `;
    const text = `Hello ${requester},\n\nYour access request has been REJECTED.\nRequest ID: ${alert._id}\nHandled at: ${now}\n` + (alert.details && alert.details.notes ? `Notes: ${String(alert.details.notes)}\n` : '') + '\nIf you have questions please contact your administrator.\n\nThanks,\nEthixAI-Guard';
    return { subject, html, text };
  }

  // Default: generic alert rendering
  const subject = `${alert.severity ? '[' + alert.severity.toUpperCase() + '] ' : ''}${(alert.type || 'Notification').replace(/_/g, ' ')}`;
  const html = `<p>${alert.details ? JSON.stringify(alert.details) : 'Notification'}</p>`;
  const text = alert.details ? JSON.stringify(alert.details) : 'Notification';
  return { subject, html, text };
}

/**
 * Send alert email
 * @param {Object} alert
 * @param {string} to
 */
async function sendAlertEmail(alert, to) {
  const transporter = createTransporter();
  if (!transporter) return { success: false, error: 'SMTP not configured' };

  const rendered = renderEmailTemplate(alert);
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: to || process.env.ALERT_EMAIL || alert.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info && info.messageId };
  } catch (err) {
    return { success: false, error: err && err.message ? err.message : String(err) };
  }
}

async function sendDailySummaryEmail(summary, to) {
  const transporter = createTransporter();
  if (!transporter) return { success: false, error: 'SMTP not configured' };
  const subject = `📊 Daily Drift Summary - ${new Date(summary.date).toLocaleDateString()}`;
  const html = `<p>Daily summary for ${new Date(summary.date).toLocaleDateString()}</p>`;
  const mailOptions = { from: process.env.SMTP_FROM || process.env.SMTP_USER, to: to || process.env.ALERT_EMAIL, subject, html };
  try { const info = await transporter.sendMail(mailOptions); return { success: true, messageId: info && info.messageId }; } catch (err) { return { success: false, error: err && err.message ? err.message : String(err) }; }
}

module.exports = {
  renderEmailTemplate,
  sendAlertEmail,
  sendDailySummaryEmail
};

