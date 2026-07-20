/**
 * Email Templates
 * HTML templates for various email communications
 */

const baseStyles = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      border-bottom: 2px solid #007bff;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #007bff;
      margin: 0;
      font-size: 28px;
    }
    .content {
      color: #333;
      line-height: 1.6;
      margin: 20px 0;
    }
    .content p {
      margin: 10px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: bold;
    }
    .button:hover {
      background-color: #0056b3;
    }
    .footer {
      border-top: 1px solid #ddd;
      padding-top: 20px;
      margin-top: 30px;
      color: #666;
      font-size: 12px;
      text-align: center;
    }
    .footer a {
      color: #007bff;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
`;

module.exports = {
  /**
   * Job Application Confirmation Email
   */
  jobApplicationConfirmation: (applicantName, jobTitle) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        ${baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Received</h1>
          </div>
          <div class="content">
            <p>Hello ${applicantName},</p>
            <p>Thank you for your interest in joining EthixAI! We've received your application for the <strong>${jobTitle || 'position'}</strong>.</p>
            <p>We carefully review every application, and if your qualifications match what we're looking for, we'll reach out to you within 2-3 business days.</p>
            <p>In the meantime, feel free to learn more about our company and mission at <a href="https://ethixai.com">ethixai.com</a>.</p>
            <p>Best regards,<br/>
            The EthixAI Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 EthixAI. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Thank you for your interest in joining EthixAI!

      We've received your application for the ${jobTitle || 'position'}.

      We carefully review every application, and if your qualifications match what we're looking for, we'll reach out to you within 2-3 business days.

      Learn more at: https://ethixai.com

      Best regards,
      The EthixAI Team
    `;

    return { htmlContent, textContent };
  },

  /**
   * General Application Confirmation Email
   */
  generalApplicationConfirmation: (applicantName) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        ${baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Interest</h1>
          </div>
          <div class="content">
            <p>Hello ${applicantName},</p>
            <p>We've received your inquiry and greatly appreciate your interest in EthixAI.</p>
            <p>Our team will review your message and get back to you as soon as possible. If you have any urgent matters, please feel free to contact us at <a href="mailto:careers@ethixai.com">careers@ethixai.com</a>.</p>
            <p>Thank you for thinking of us!</p>
            <p>Best regards,<br/>
            The EthixAI Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 EthixAI. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Thank you for your interest in EthixAI!

      We've received your inquiry and our team will review it shortly.

      If you have any urgent matters, please contact us at: careers@ethixai.com

      Best regards,
      The EthixAI Team
    `;

    return { htmlContent, textContent };
  },

  /**
   * Newsletter Subscription Confirmation
   */
  newsletterConfirmation: (email) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        ${baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to EthixAI Newsletter</h1>
          </div>
          <div class="content">
            <p>Great news! You've been successfully subscribed to the EthixAI newsletter.</p>
            <p>You'll now receive:</p>
            <ul>
              <li>Latest insights on AI fairness and ethics</li>
              <li>Product updates and new features</li>
              <li>Industry news and trends</li>
              <li>Exclusive webinar invitations</li>
            </ul>
            <p>We're excited to keep you in the loop!</p>
            <p>Best regards,<br/>
            The EthixAI Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 EthixAI. All rights reserved.</p>
            <p><a href="https://ethixai.com">Visit our website</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Welcome to the EthixAI Newsletter!

      You've been successfully subscribed and will receive:
      - Latest insights on AI fairness and ethics
      - Product updates and new features
      - Industry news and trends
      - Exclusive webinar invitations

      We're excited to keep you in the loop!

      Best regards,
      The EthixAI Team
    `;

    return { htmlContent, textContent };
  },

  /**
   * Job Opening Notification Email
   */
  jobOpeningNotification: (subscriberEmail, jobTitle, jobDescription, applicationLink) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        ${baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Job Opportunity at EthixAI</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We're hiring! A new position has opened at EthixAI that might interest you:</p>
            <h2>${jobTitle}</h2>
            <p>${jobDescription}</p>
            <p>
              <a href="${applicationLink}" class="button">View & Apply Now</a>
            </p>
            <p>If you know anyone who might be a great fit, feel free to share this opportunity with them!</p>
            <p>Best regards,<br/>
            The EthixAI Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 EthixAI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      New Job Opportunity at EthixAI!

      Position: ${jobTitle}

      ${jobDescription}

      Apply now: ${applicationLink}

      Best regards,
      The EthixAI Team
    `;

    return { htmlContent, textContent };
  },

  /**
   * Unsubscribe Confirmation Email
   */
  unsubscribeConfirmation: (type = 'newsletter') => {
    const typeLabel = type === 'jobs' ? 'job notifications' : 'newsletter';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        ${baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Unsubscribe Confirmed</h1>
          </div>
          <div class="content">
            <p>You have been unsubscribed from ${typeLabel} at EthixAI.</p>
            <p>If this was done by mistake, you can resubscribe at any time from our website.</p>
            <p>Thank you,<br/>
            The EthixAI Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 EthixAI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      You have been unsubscribed from ${typeLabel}.

      If this was done by mistake, you can resubscribe at any time.

      Thank you,
      The EthixAI Team
    `;

    return { htmlContent, textContent };
  },
};
