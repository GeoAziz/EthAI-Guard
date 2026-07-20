const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Email Service
 * Supports SendGrid, SMTP, and fallback to console logging
 */

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'sendgrid';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@ethixai.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'EthixAI';
    this.sendgridApiKey = process.env.SENDGRID_API_KEY;
    this.smtpEnabled = process.env.SMTP_HOST && process.env.SMTP_PORT;

    // Validate configuration
    if (this.provider === 'sendgrid' && !this.sendgridApiKey) {
      logger.warn({ provider: 'sendgrid' }, 'SendGrid API key not configured, will log emails to console');
    }
  }

  /**
   * Send email via SendGrid
   */
  async sendViaSendGrid(to, subject, htmlContent, textContent) {
    if (!this.sendgridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    const payload = {
      personalizations: [
        {
          to: Array.isArray(to) ? to.map(e => ({ email: e })) : [{ email: to }],
          subject,
        },
      ],
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      content: [
        {
          type: 'text/plain',
          value: textContent || 'Please view this email in HTML format.',
        },
        {
          type: 'text/html',
          value: htmlContent,
        },
      ],
      trackingSettings: {
        clickTracking: {
          enabled: true,
        },
        openTracking: {
          enabled: true,
        },
      },
    };

    try {
      const response = await axios.post('https://api.sendgrid.com/v3/mail/send', payload, {
        headers: {
          Authorization: `Bearer ${this.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info({ to, subject, provider: 'sendgrid' }, 'Email sent successfully');
      return { success: true, messageId: response.headers['x-message-id'] };
    } catch (error) {
      logger.error(
        { to, subject, error: error.message, provider: 'sendgrid' },
        'Failed to send email via SendGrid',
      );
      throw error;
    }
  }

  /**
   * Fallback: log email to console (for development)
   */
  logEmailToConsole(to, subject, htmlContent, textContent) {
    logger.info(
      {
        to,
        subject,
        from: this.fromEmail,
        htmlContent: htmlContent ? htmlContent.substring(0, 200) : '',
      },
      'Email logged to console (not sent)',
    );
    return { success: true, method: 'console' };
  }

  /**
   * Send email
   */
  async send(to, subject, htmlContent, textContent) {
    try {
      if (process.env.NODE_ENV === 'test' || process.env.DISABLE_EMAIL_SEND === '1') {
        return this.logEmailToConsole(to, subject, htmlContent, textContent);
      }

      if (this.provider === 'sendgrid' && this.sendgridApiKey) {
        return await this.sendViaSendGrid(to, subject, htmlContent, textContent);
      }

      // Fallback to console
      return this.logEmailToConsole(to, subject, htmlContent, textContent);
    } catch (error) {
      logger.error({ to, subject, error: error.message }, 'Email send failed');
      throw error;
    }
  }
}

module.exports = new EmailService();
